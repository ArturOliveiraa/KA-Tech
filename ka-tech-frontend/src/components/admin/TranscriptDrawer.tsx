import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, Save, Sparkles } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Button } from "../ui";
import Drawer from "./Drawer";

interface TranscriptDrawerProps {
  lessonId: number | null;
  lessonTitle?: string;
  onClose: () => void;
  /** Avisa a lista que a aula voltou para a fila de indexação */
  onReindexRequested?: (lessonId: number) => void;
}

interface TranscriptData {
  transcript: string | null;
  transcript_source: string | null;
  transcript_edited: boolean | null;
  index_status: string | null;
  index_error: string | null;
  indexed_at: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  gemini: "Transcrita pela IA a partir do vídeo",
  "gemini+texto": "Transcrita pela IA + texto da aula",
  texto: "Montada só com o texto da aula (vídeo não transcrito)",
  editada: "Revisada pela equipe",
};

/**
 * Ver e corrigir a transcrição de uma aula.
 * A versão revisada vira a fonte oficial: a busca e o quiz usam esse texto e a IA
 * não transcreve o vídeo de novo por cima da correção.
 */
export default function TranscriptDrawer({ lessonId, lessonTitle, onClose, onReindexRequested }: TranscriptDrawerProps) {
  const [data, setData] = useState<TranscriptData | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"save" | "reindex" | "reset" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let alive = true;
    setLoading(true);
    setNotice(null);
    supabase
      .from("lessons")
      .select("transcript, transcript_source, transcript_edited, index_status, index_error, indexed_at")
      .eq("id", lessonId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (!alive) return;
        if (error) setNotice({ tone: "danger", text: "Não foi possível carregar a transcrição. A migração da fila já foi aplicada?" });
        setData((row as TranscriptData) || null);
        setText((row as TranscriptData)?.transcript || "");
        setLoading(false);
      });
    return () => { alive = false; };
  }, [lessonId]);

  const dirty = (data?.transcript || "") !== text;
  const stats = useMemo(() => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const withTime = text.split(/\r?\n/).filter((l) => /^\s*\[(\d+:)?\d{1,2}:\d{2}\]/.test(l)).length;
    return { lines, words, withTime };
  }, [text]);

  const save = async (andReindex: boolean) => {
    if (!lessonId) return;
    setSaving(andReindex ? "reindex" : "save");
    setNotice(null);
    const { error } = await supabase
      .from("lessons")
      .update({ transcript: text, transcript_edited: true, transcript_source: "editada" })
      .eq("id", lessonId);
    if (error) {
      setSaving(null);
      return setNotice({ tone: "danger", text: "Não foi possível salvar: " + error.message });
    }
    setData((d) => (d ? { ...d, transcript: text, transcript_edited: true, transcript_source: "editada" } : d));

    if (andReindex) {
      const { error: fnError } = await supabase.functions.invoke("index-lesson", { body: { lesson_id: lessonId } });
      if (fnError) setNotice({ tone: "danger", text: "Transcrição salva, mas não foi possível atualizar a busca agora." });
      else {
        onReindexRequested?.(lessonId);
        setNotice({ tone: "success", text: "Transcrição salva. A busca está sendo atualizada com o texto revisado." });
      }
    } else {
      setNotice({ tone: "success", text: "Transcrição salva. Ela será usada na próxima indexação e no quiz." });
    }
    setSaving(null);
  };

  // Volta a confiar na IA: descarta a revisão e transcreve o vídeo de novo
  const resetToAi = async () => {
    if (!lessonId) return;
    if (!window.confirm("Descartar a revisão e transcrever o vídeo de novo com a IA? As correções feitas aqui serão perdidas.")) return;
    setSaving("reset");
    setNotice(null);
    const { error } = await supabase.from("lessons").update({ transcript_edited: false }).eq("id", lessonId);
    if (error) {
      setSaving(null);
      return setNotice({ tone: "danger", text: "Não foi possível descartar a revisão: " + error.message });
    }
    const { error: fnError } = await supabase.functions.invoke("index-lesson", { body: { lesson_id: lessonId } });
    setSaving(null);
    if (fnError) return setNotice({ tone: "danger", text: "Não foi possível pedir a nova transcrição agora." });
    onReindexRequested?.(lessonId);
    setData((d) => (d ? { ...d, transcript_edited: false } : d));
    setNotice({ tone: "success", text: "A IA está transcrevendo o vídeo de novo. Reabra este painel em 1 a 2 minutos." });
  };

  const source = data?.transcript_source || "";
  const empty = !loading && !data?.transcript;

  return (
    <Drawer
      open={lessonId !== null}
      onClose={() => !saving && onClose()}
      title="Transcrição da aula"
      subtitle={lessonTitle}
      width={720}
      footer={
        <>
          {data?.transcript_edited && (
            <Button variant="ghost" onClick={resetToAi} loading={saving === "reset"} disabled={!!saving} icon={<RotateCcw size={15} />}>
              Transcrever de novo pela IA
            </Button>
          )}
          <Button variant="secondary" onClick={() => save(false)} loading={saving === "save"} disabled={!dirty || !!saving || !text.trim()} icon={<Save size={15} />}>
            Salvar
          </Button>
          <Button onClick={() => save(true)} loading={saving === "reindex"} disabled={!!saving || !text.trim()} icon={<RefreshCw size={15} />}>
            Salvar e atualizar busca
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="ui-loading-inline"><div className="ui-spinner" /> Carregando transcrição...</div>
      ) : (
        <div className="adm-form">
          <div className="tr-meta">
            {data?.transcript_edited ? (
              <span className="ui-badge ui-badge--success"><CheckCircle2 size={12} /> Revisada pela equipe</span>
            ) : source ? (
              <span className="ui-badge"><Sparkles size={12} /> {SOURCE_LABEL[source] || source}</span>
            ) : null}
            {data?.indexed_at && <span className="ui-hint">Indexada em {new Date(data.indexed_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
            {data?.index_status === "processing" && <span className="ui-badge ui-badge--neutral"><span className="ui-spinner ui-spinner--sm" /> Processando...</span>}
          </div>

          {data?.index_error && (
            <div className="ui-alert ui-alert--danger"><AlertTriangle size={16} /> {data.index_error}</div>
          )}

          {empty && (
            <div className="ui-alert">
              Esta aula ainda não tem transcrição. Ela é criada quando a aula entra na busca (botão ↻ na lista).
              Você também pode colar ou escrever o texto aqui e salvar.
            </div>
          )}

          <div className="ui-field">
            <label className="ui-label" htmlFor="tr-text">Texto</label>
            <textarea
              id="tr-text"
              className="ui-input tr-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck
              placeholder={"[00:00] Olá, nesta aula vamos ver...\n[00:45] Para começar, abra o menu..."}
            />
            <span className="ui-hint">
              {stats.words.toLocaleString("pt-BR")} palavras · {stats.lines} linhas · {stats.withTime} com minuto.
              Mantenha o formato <code>[mm:ss]</code> no começo das linhas: é o que leva o aluno ao minuto certo na busca.
            </span>
          </div>

          <div className="ui-alert">
            {/* Um único filho: o alerta é flex e quebraria o texto em colunas */}
            <span>
              Ao salvar, esta versão passa a ser a <strong>oficial</strong>: a busca e o quiz da aula usam este texto,
              e a IA não transcreve o vídeo de novo por cima das suas correções.
            </span>
          </div>

          {notice && <div className={`ui-alert ui-alert--${notice.tone}`} role="status">{notice.text}</div>}
        </div>
      )}
    </Drawer>
  );
}

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { Button, EmptyState, PageHeader, Skeleton } from "../components/ui";
import {
  AlertTriangle, ArrowRight, BrainCircuit, Compass, CreditCard, Library,
  PlayCircle, Search, Sparkles, Store, Tv, X,
} from "lucide-react";
import "./cursos.css";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

interface AiLessonResult {
  lesson_title: string;
  course_slug: string;
  content: string;
  similarity: number;
}

const getCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("live")) return <Tv size={26} />;
  if (lowerName.includes("pdv")) return <CreditCard size={26} />;
  if (lowerName.includes("shop")) return <Store size={26} />;
  return <Library size={26} />;
};

const AI_SUGGESTIONS = ["Como cancelar uma venda no PDV?", "Configurar uma live", "Cadastrar produto na loja"];

function Cursos() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [aiSearchTerm, setAiSearchTerm] = useState("");
  const [aiResults, setAiResults] = useState<AiLessonResult[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiResults, setShowAiResults] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError(false);
        const { data: categoriesRes, error } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;
        setCategories(categoriesRes || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(term) || cat.description?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  const runAiSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsAiLoading(true);
    setShowAiResults(true);
    setAiError(null);

    try {
      const response = await fetch("https://pandai.discloud.app/search-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error("Falha na comunicação com a IA");
      const data = await response.json();
      setAiResults(data.results || []);
    } catch (error) {
      console.error("Erro na busca IA:", error);
      setAiResults([]);
      setAiError("Não foi possível falar com a pandAI agora. Tente novamente em instantes.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runAiSearch(aiSearchTerm);
  };

  return (
    <div className="ui-shell">
      <SEO title="Trilhas" description="Explore as trilhas de conhecimento da KA Tech." />
      <Sidebar />
      <div className="ui-ambient" aria-hidden="true" />

      <main className="ui-main">
        <div className="ui-main__inner">
          {/* Busca com IA */}
          <section className="trl-ai ui-fade-up" aria-labelledby="trl-ai-title">
            <span className="ui-badge"><Sparkles size={13} /> pandAI</span>
            <h1 id="trl-ai-title" className="trl-ai__title">O que você quer <span className="ui-text-gradient">aprender hoje?</span></h1>
            <p className="trl-ai__text">Pergunte do seu jeito e a IA encontra a aula certa para você.</p>

            <form onSubmit={handleAiSearch} className="trl-ai__form" role="search">
              <div className="ui-input-group trl-ai__field">
                <BrainCircuit size={20} />
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Ex.: Como cancelar uma venda no PDV?"
                  aria-label="Pergunta para a pandAI"
                  value={aiSearchTerm}
                  onChange={(e) => setAiSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" loading={isAiLoading} icon={!isAiLoading ? <Sparkles size={16} /> : undefined}>
                {isAiLoading ? "Buscando..." : "Perguntar"}
              </Button>
            </form>

            <div className="trl-ai__chips">
              {AI_SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="trl-chip" onClick={() => { setAiSearchTerm(s); runAiSearch(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </section>

          {showAiResults && (
            <section className="ui-section trl-results" aria-live="polite">
              <div className="ui-section__head">
                <h2 className="ui-section__title"><BrainCircuit size={18} /> Aulas encontradas</h2>
                <button className="sb-icon-btn" onClick={() => setShowAiResults(false)} aria-label="Fechar resultados">
                  <X size={18} />
                </button>
              </div>

              {isAiLoading ? (
                <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "280px" }}>
                  {[0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={16} />)}
                </div>
              ) : aiError ? (
                <div className="ui-alert ui-alert--danger" role="alert"><AlertTriangle size={18} /> {aiError}</div>
              ) : aiResults.length > 0 ? (
                <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "280px" }}>
                  {aiResults.map((item, index) => (
                    <Link key={index} to={`/curso/${item.course_slug}`} className="ui-card ui-card--interactive trl-result">
                      <div className="trl-result__head">
                        <span className="trl-result__icon"><PlayCircle size={18} /></span>
                        <span className="ui-badge ui-badge--success">{(item.similarity * 100).toFixed(0)}% relevante</span>
                      </div>
                      <h3 className="trl-result__title">{item.lesson_title}</h3>
                      <p className="trl-result__snippet">{item.content.substring(0, 150)}…</p>
                      <span className="trl-result__cta">Ir para a aula <ArrowRight size={15} /></span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="ui-alert">Ainda não temos uma aula sobre esse tema. Tente perguntar de outra forma.</div>
              )}
            </section>
          )}

          <PageHeader
            eyebrow={<><Compass size={14} /> Catálogo</>}
            title="Trilhas de conhecimento"
            subtitle="Cada trilha reúne cursos de um mesmo tema, do básico ao avançado."
            actions={
              <div className="ui-input-group trl-filter">
                <Search size={18} />
                <input
                  type="search"
                  className="ui-input"
                  placeholder="Filtrar trilhas"
                  aria-label="Filtrar trilhas"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            }
          />

          {loading ? (
            <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "280px" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={220} radius={16} />)}
            </div>
          ) : loadError ? (
            <EmptyState
              tone="danger"
              icon={<AlertTriangle size={30} />}
              title="Não foi possível carregar as trilhas"
              description="Verifique sua conexão e recarregue a página."
              action={<Button onClick={() => window.location.reload()}>Recarregar</Button>}
            />
          ) : filteredCategories.length > 0 ? (
            <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "280px" }}>
              {filteredCategories.map((cat, index) => (
                <Link
                  key={cat.id}
                  to={`/categoria/${cat.slug}`}
                  className="ui-card ui-card--interactive trl-card ui-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div className="trl-card__icon">
                    {cat.image_url ? <img src={cat.image_url} alt="" loading="lazy" /> : getCategoryIcon(cat.name)}
                  </div>
                  <h3 className="trl-card__title">{cat.name}</h3>
                  <p className="trl-card__desc">
                    {cat.description || "Domine o assunto passo a passo com cursos selecionados."}
                  </p>
                  <span className="trl-card__cta">Ver cursos <ArrowRight size={16} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={30} />}
              title="Nenhuma trilha encontrada"
              description={`Nada corresponde a "${searchTerm}".`}
              action={<Button variant="secondary" onClick={() => setSearchTerm("")}>Limpar filtro</Button>}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default Cursos;

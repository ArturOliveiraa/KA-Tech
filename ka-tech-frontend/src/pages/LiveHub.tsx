import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, PlayCircle, PlaySquare, Radio, Video } from "lucide-react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import SEO from "../components/SEO";
import { EmptyState, PageHeader, Skeleton } from "../components/ui";

interface Live {
  id: string;
  title: string;
  video_id: string;
  scheduled_at: string;
  duration: string | null;
}

/** Extrai o ID de 11 caracteres de um link ou ID do YouTube. */
const youtubeId = (urlOrId: string) => {
  if (!urlOrId) return "";
  if (urlOrId.length === 11 && !urlOrId.includes("/")) return urlOrId;
  const match = urlOrId.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : urlOrId;
};

function LiveCard({ live, onAir }: { live: Live; onAir?: boolean }) {
  const id = youtubeId(live.video_id);
  const replay = !!live.duration;
  const date = new Date(live.scheduled_at);
  return (
    <Link
      to={`/live?v=${encodeURIComponent(id)}${replay ? "&replay=true" : ""}`}
      state={{ videoId: id, isReplay: replay }}
      className={`ui-card ui-card--interactive lh-card ${onAir ? "is-on-air" : ""}`}
    >
      <div className="lh-card__thumb">
        <img
          src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
          onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }}
          alt=""
          loading="lazy"
        />
        <span className="lh-card__play" aria-hidden="true"><PlayCircle size={34} /></span>
        {onAir ? (
          <span className="lh-card__badge lh-card__badge--live"><Radio size={13} /> Ao vivo agora</span>
        ) : !replay ? (
          <span className="lh-card__badge">Agendada</span>
        ) : null}
        {replay && <span className="lh-card__time"><Clock size={13} /> {live.duration}</span>}
      </div>
      <div className="lh-card__body">
        <h3 className="lh-card__title">{live.title}</h3>
        <span className={`lh-card__meta ${onAir ? "is-live" : ""}`}>
          {onAir ? (
            <><Radio size={14} /> Acontecendo agora</>
          ) : replay ? (
            <><Calendar size={14} /> Replay de {date.toLocaleDateString("pt-BR")}</>
          ) : (
            <><Calendar size={14} /> {date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</>
          )}
        </span>
      </div>
    </Link>
  );
}

/** Agenda das transmissões e biblioteca de replays. */
export default function LiveHub() {
  const [upcoming, setUpcoming] = useState<Live[]>([]);
  const [replays, setReplays] = useState<Live[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    (async () => {
      const [up, rep] = await Promise.all([
        supabase.from("lives").select("*").is("duration", null).order("scheduled_at", { ascending: true }),
        supabase.from("lives").select("*").not("duration", "is", null).order("scheduled_at", { ascending: false }),
      ]);
      setUpcoming((up.data as Live[]) || []);
      setReplays((rep.data as Live[]) || []);
      setLoading(false);
    })();
    return () => clearInterval(timer);
  }, []);

  const skeletons = (
    <div className="ui-grid" style={{ ["--ui-grid-min" as string]: "300px" }}>
      {[0, 1, 2].map((i) => <Skeleton key={i} height={260} radius={16} />)}
    </div>
  );

  return (
    <div className="ui-shell">
      <SEO title="Lives" description="Transmissões ao vivo e replays da KA Academy." />
      <Sidebar />
      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader eyebrow={<><Radio size={14} /> Lives</>} title="Lives e replays" subtitle="Transmissões ao vivo, mentorias e a biblioteca com as gravações." />

          <section className="ui-section" aria-labelledby="lh-upcoming">
            <div className="ui-section__head">
              <h2 id="lh-upcoming" className="ui-section__title"><Radio size={18} /> Próximas transmissões</h2>
            </div>
            {loading ? skeletons : upcoming.length === 0 ? (
              <EmptyState icon={<Calendar size={28} />} title="Nenhuma transmissão agendada" description="Quando uma live for marcada, ela aparece aqui." />
            ) : (
              <div className="ui-grid" style={{ ["--ui-grid-min" as string]: "300px" }}>
                {upcoming.map((live) => <LiveCard key={live.id} live={live} onAir={new Date(live.scheduled_at) <= now} />)}
              </div>
            )}
          </section>

          <section className="ui-section" aria-labelledby="lh-replays">
            <div className="ui-section__head">
              <h2 id="lh-replays" className="ui-section__title"><PlaySquare size={18} /> Replays</h2>
              {!loading && replays.length > 0 && <span className="ui-section__meta">{replays.length} gravaç{replays.length === 1 ? "ão" : "ões"}</span>}
            </div>
            {loading ? skeletons : replays.length === 0 ? (
              <EmptyState icon={<Video size={28} />} title="Ainda não há replays" description="As gravações das lives encerradas aparecem aqui." />
            ) : (
              <div className="ui-grid" style={{ ["--ui-grid-min" as string]: "300px" }}>
                {replays.map((live) => <LiveCard key={live.id} live={live} />)}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

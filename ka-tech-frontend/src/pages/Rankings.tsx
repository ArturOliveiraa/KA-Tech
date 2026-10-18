import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";
import Avatar from "../components/Avatar";
import SEO from "../components/SEO";
import { useUser } from "../components/UserContext";
import { Button, EmptyState, Select, Skeleton } from "../components/ui";
import { AlertTriangle, Award, BarChart3, Clock, Crown, Flame, Medal, Star, Target, Trophy, Users, Zap } from "lucide-react";
import "./Rankings.css";

type RankingCategory = "xp" | "badges" | "maratonistas" | "tempo" | "on_fire";

interface RankingUser {
  id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  rank_name?: string;
}

const CATEGORIES: { id: RankingCategory; label: string; icon: React.ElementType; table: string; column: string; unit: string; hint: string }[] = [
  { id: "xp", label: "XP Global", icon: Star, table: "ranking_xp", column: "total_xp", unit: "XP", hint: "Quem mais acumulou experiência na plataforma." },
  { id: "badges", label: "Colecionadores", icon: Award, table: "ranking_badges", column: "total_badges", unit: "insígnias", hint: "Quem mais concluiu cursos e ganhou insígnias." },
  { id: "maratonistas", label: "Maratonistas", icon: Zap, table: "ranking_maratonistas", column: "lessons_completed", unit: "aulas", hint: "Quem mais concluiu aulas." },
  { id: "tempo", label: "Tempo de Voo", icon: Clock, table: "ranking_tempo_voo", column: "total_time_spent", unit: "min", hint: "Quem passou mais tempo estudando." },
  { id: "on_fire", label: "Ofensiva", icon: Flame, table: "ranking_on_fire", column: "active_days", unit: "dias", hint: "Quem estudou em mais dias diferentes." },
];

const LIST_LIMIT = 50;
const firstName = (name: string | null) => (name || "Anônimo").split(" ")[0];

export default function Rankings() {
  const { userName, avatarUrl } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<RankingCategory>("xp");
  const [rankingList, setRankingList] = useState<RankingUser[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  const category = CATEGORIES.find((c) => c.id === activeCategory)!;

  const [myBadges, setMyBadges] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id || null;
      setMyId(uid);
      if (!uid) return;
      const { count } = await supabase.from("user_badges").select("*", { count: "exact", head: true }).eq("user_id", uid);
      setMyBadges(count ?? 0);
    });
  }, []);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: dbError } = await supabase
      .from(category.table)
      .select("*")
      .order(category.column, { ascending: false })
      .limit(LIST_LIMIT);

    if (dbError || !data) {
      console.error("Erro ao carregar ranking:", dbError);
      setError(true);
      setRankingList([]);
    } else {
      setRankingList(data.map((item: any) => ({
        id: item.user_id ?? item.profile_id ?? item.id ?? null,
        full_name: item.full_name,
        avatar_url: item.avatar_url,
        score: Number(item[category.column]) || 0,
        rank_name: item.rank_name,
      })));
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  // Identifica o usuário logado: pelo id quando a view expõe, senão por nome + foto
  const isMe = useCallback((u: RankingUser) => {
    if (u.id && myId) return u.id === myId;
    return !!u.full_name && u.full_name === userName && (u.avatar_url || null) === (avatarUrl || null);
  }, [myId, userName, avatarUrl]);

  const myIndex = useMemo(() => rankingList.findIndex(isMe), [rankingList, isMe]);
  const topScore = rankingList[0]?.score || 1;
  const podium = rankingList.slice(0, 3);
  const rest = rankingList.slice(3);

  const formatScore = (score: number) => score.toLocaleString("pt-BR");

  const renderPodium = (user: RankingUser, place: 1 | 2 | 3) => {
    const tier = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
    const me = isMe(user);
    return (
      <div key={place} className={`rk-podium__slot rk-podium__slot--${place}`}>
        <article className={`rk-card rk-card--${tier} ${me ? "is-me" : ""}`} style={{ animationDelay: `${place === 1 ? 0 : place === 2 ? 120 : 220}ms` }}>
          <span className="rk-card__medal" aria-label={`${place}º lugar`}>
            {place === 1 ? <Crown size={16} strokeWidth={2.4} /> : <Medal size={14} strokeWidth={2.4} />}
          </span>
          <div className="rk-card__avatar">
            <Avatar src={user.avatar_url} name={user.full_name || "Anônimo"} size={place === 1 ? 68 : 56} bordered={false} />
          </div>
          <h3 className="rk-card__name" title={user.full_name || undefined}>{firstName(user.full_name)}</h3>
          {activeCategory === "xp" && <span className="rk-card__tier">{user.rank_name || "Panda Broto"}</span>}
          <div className="rk-card__score">
            <strong>{formatScore(user.score)}</strong>
            <span>{category.unit}</span>
          </div>
          {me && <span className="rk-you">Você</span>}
        </article>
        <div className="rk-step" aria-hidden="true"><span>{place}</span></div>
      </div>
    );
  };

  const scrollToMe = () => {
    document.querySelector(".rk-row.is-me")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const gap = myIndex > 0 ? rankingList[myIndex - 1].score - rankingList[myIndex].score + 1 : 0;
  const me = myIndex >= 0 ? rankingList[myIndex] : null;
  const podiumCut = rankingList[2]?.score ?? 0;
  const toPodium = me && myIndex > 2 ? Math.max(0, podiumCut - me.score + 1) : 0;
  const avgScore = rankingList.length ? Math.round(rankingList.reduce((sum, u) => sum + u.score, 0) / rankingList.length) : 0;
  const activeCount = rankingList.filter((u) => u.score > 0).length;
  const percentile = me ? Math.max(1, Math.round(((myIndex + 1) / rankingList.length) * 100)) : null;

  return (
    <div className="ui-shell">
      <SEO title="Hall da Fama" description="Ranking da comunidade KA Tech." />
      <Sidebar />
      <main className="ui-main rk-main">
        <div className="ui-main__inner rk">
          <header className="rk-head">
            <div className="rk-head__text">
              <span className="ui-page-header__eyebrow"><Trophy size={14} /> Gamificação</span>
              <h1 className="rk-head__title">Hall da Fama</h1>
              <p className="rk-head__hint"><category.icon size={14} aria-hidden="true" /> {category.hint}</p>
            </div>
            <div className="rk-head__controls">
              {!loading && !error && rankingList.length > 0 && (
                myIndex >= 0 ? (
                  <button type="button" className="rk-chip" onClick={scrollToMe} title="Ir para a sua posição">
                    <span className="rk-chip__pos">#{myIndex + 1}</span>
                    <span>{myIndex === 0 ? "Você lidera!" : <>Faltam <strong>{formatScore(gap)} {category.unit}</strong> para subir</>}</span>
                  </button>
                ) : (
                  <span className="rk-chip rk-chip--out">Fora do top {LIST_LIMIT}</span>
                )
              )}
              <Select
                aria-label="Categoria do ranking"
                value={activeCategory}
                onChange={(v) => setActiveCategory(v as RankingCategory)}
                minWidth={210}
                options={CATEGORIES.map(({ id, label, icon: Icon }) => ({ value: id, label, icon: <Icon size={15} /> }))}
              />
            </div>
          </header>

          {loading ? (
            <div className="rk-layout" aria-busy="true">
              <div className="rk-podium">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={i === 1 ? 230 : 200} radius={18} />)}
              </div>
              <div className="ui-card rk-list" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={44} radius={10} />)}
              </div>
            </div>
          ) : error ? (
            <EmptyState
              tone="danger"
              icon={<AlertTriangle size={30} />}
              title="Não foi possível carregar o ranking"
              description="Verifique sua conexão e tente de novo."
              action={<Button onClick={loadRanking}>Tentar de novo</Button>}
            />
          ) : rankingList.length === 0 ? (
            <EmptyState icon={<Users size={30} />} title="Ninguém por aqui ainda" description="Ainda não há participantes suficientes nesta categoria. Que tal ser o primeiro?" />
          ) : (
            <div className="rk-layout">
              <div className="rk-left">
                <section className="rk-podium" aria-label="Pódio">
                  {podium[1] && renderPodium(podium[1], 2)}
                  {podium[0] && renderPodium(podium[0], 1)}
                  {podium[2] && renderPodium(podium[2], 3)}
                </section>

                <div className="rk-panels">
                  <section className="ui-card rk-panel" aria-label="Seu desempenho">
                    <h2 className="rk-panel__title"><Target size={16} /> Seu desempenho</h2>
                    {me ? (
                      <>
                        <div className="rk-kpis">
                          <div><strong>#{myIndex + 1}</strong><span>posição</span></div>
                          <div><strong>{formatScore(me.score)}</strong><span>{category.unit}</span></div>
                          <div><strong>{myBadges ?? "–"}</strong><span>cursos concluídos</span></div>
                        </div>
                        {myIndex > 2 ? (
                          <div className="rk-goal">
                            <div className="rk-goal__label">
                              <span>Até o pódio</span>
                              <strong>faltam {formatScore(toPodium)} {category.unit}</strong>
                            </div>
                            <div className="ui-progress">
                              <div className="ui-progress__fill" style={{ width: `${podiumCut ? Math.min(100, (me.score / podiumCut) * 100) : 0}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="rk-panel__note">Você está no pódio. Defenda sua posição!</p>
                        )}
                        <p className="rk-panel__note">Você está entre os <strong>{percentile}%</strong> primeiros desta categoria.</p>
                      </>
                    ) : (
                      <p className="rk-panel__note">Você ainda não aparece entre os {LIST_LIMIT} primeiros. Conclua aulas para entrar no ranking.</p>
                    )}
                  </section>

                  <section className="ui-card rk-panel" aria-label="Estatísticas da liga">
                    <h2 className="rk-panel__title"><BarChart3 size={16} /> Estatísticas da liga</h2>
                    <ul className="rk-stats">
                      <li><span><Users size={14} /> Participantes</span><strong>{rankingList.length}</strong></li>
                      <li><span><Zap size={14} /> Pontuando</span><strong>{activeCount}</strong></li>
                      <li><span><BarChart3 size={14} /> Média</span><strong>{formatScore(avgScore)} {category.unit}</strong></li>
                      <li><span><Crown size={14} /> Líder</span><strong>{formatScore(rankingList[0].score)} {category.unit}</strong></li>
                      <li><span><Medal size={14} /> Corte do pódio</span><strong>{formatScore(podiumCut)} {category.unit}</strong></li>
                    </ul>
                  </section>
                </div>
              </div>

              <section className="ui-card rk-list" aria-label="Classificação">
                <div className="rk-list__head">
                  <span>Classificação</span>
                  <span>{rankingList.length} participantes</span>
                </div>
                {rest.length > 0 ? (
                  <ol start={4} className="rk-list__body">
                    {rest.map((user, i) => {
                      const pos = i + 4;
                      const me = isMe(user);
                      return (
                        <li key={`${user.id || user.full_name}-${pos}`} className={`rk-row ${me ? "is-me" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                          <span className="rk-row__pos">{pos}</span>
                          <Avatar src={user.avatar_url} name={user.full_name || "Anônimo"} size={32} bordered={false} />
                          <div className="rk-row__info">
                            <strong>
                              {user.full_name || "Anônimo"}
                              {me && <span className="rk-you rk-you--inline">Você</span>}
                            </strong>
                            {activeCategory === "xp" && <span>{user.rank_name || "Panda Broto"}</span>}
                          </div>
                          <div className="rk-row__bar" aria-hidden="true">
                            <span style={{ width: `${Math.max(4, (user.score / topScore) * 100)}%` }} />
                          </div>
                          <div className="rk-row__score">
                            <strong>{formatScore(user.score)}</strong>
                            <span>{category.unit}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="rk-list__empty">Só há {rankingList.length} participante(s) nesta categoria.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

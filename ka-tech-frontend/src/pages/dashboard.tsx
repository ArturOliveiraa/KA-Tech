import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import logo from "../assets/ka-tech-logo.png";
import SEO from "../components/SEO";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  Play,
  PlayCircle,
  BookOpen,
  Compass,
  Target,
  Flame,
  ChevronRight,
} from "lucide-react";
import styles from "./Dashboard.module.css";

// ─── Tipagem explícita para o objeto de curso ─────────────────────────────────
interface EnrolledCourse {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  progress: number;      // 0–100
  enrolledAt: string;    // ISO string
}

// ─── Constante de negócio (evita magic numbers no JSX) ───────────────────────
const MAX_RECENT_COURSES = 3;

export default function Dashboard() {
  const { userName } = useUser();
  const navigate = useNavigate();
  const {
    data: enrolledCourses = [] as EnrolledCourse[],
    isLoading,
    isError,
    refetch,
  } = useDashboardData();

  // ─── Ordenações memorizadas (evitam re-computação a cada render) ─────────────
  const recentCourses = useMemo(
    () =>
      [...enrolledCourses].sort(
        (a, b) =>
          new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
      ),
    [enrolledCourses]
  );

  const tableCourses = useMemo(
    () => [...enrolledCourses].sort((a, b) => b.progress - a.progress),
    [enrolledCourses]
  );

  const featuredCourse = recentCourses[0];
  const otherRecent    = recentCourses.slice(1, 1 + MAX_RECENT_COURSES);

  // ─── Fallback de imagem (usado nas tags <img>, não no backgroundImage) ───────
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = logo;
  };

  // ─── Primeiro nome com proteção contra valor vazio / nulo ────────────────────
  const firstName = (userName ?? "Visitante").split(" ")[0];

  // ─── Estado de erro com botão de retry ───────────────────────────────────────
  if (isError) {
    return (
      <div className={`${styles.dashboardWrapper}`}>
        <Sidebar />
        <div className={styles.errorState}>
          <h3>Erro ao carregar sua jornada.</h3>
          <p>Tente novamente ou recarregue a página.</p>
          <button className={styles.btnRetry} onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <SEO title="Minha Jornada" description="Acompanhe seu progresso na KA Tech." />
      <Sidebar />

      {/* Fundo decorativo */}
      <div className={styles.ambientBg}>
        <div className={`${styles.ambientBlob} ${styles.blob1}`} />
        <div className={`${styles.ambientBlob} ${styles.blob2}`} />
      </div>

      <main className={styles.dashboardContent}>
        {/* Logo mobile */}
        <div className={styles.brandLogoMobile}>
          <img src={logo} alt="KA Tech Logo" />
        </div>

        {/* Header */}
        <header className={styles.heroHeader}>
          <h1 className={styles.pageTitle}>
            Minha <span className={styles.textGradient}>Jornada</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Bem-vindo de volta, <strong>{firstName}</strong>. Retome seu foco.
          </p>
        </header>

        {/* ─── Conteúdo principal ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className={`${styles.loadingState} ${styles.glassPanel}`}>
            <Compass
              size={44}
              className={`${styles.spinSlow} ${styles.textPrimary}`}
              style={{ margin: "0 auto 15px" }}
            />
            <p>Sincronizando seu progresso...</p>
          </div>
        ) : enrolledCourses.length > 0 ? (
          <>
            {/* 1. BANNER DESTAQUE */}
            {featuredCourse && (
              <div
                className={`${styles.featuredBanner} ${styles.glassPanel}`}
                role="button"
                tabIndex={0}
                aria-label={`Continuar curso: ${featuredCourse.title}`}
                onClick={() => navigate(`/curso/${featuredCourse.slug}`)}
                onKeyDown={(e) =>
                  e.key === "Enter" && navigate(`/curso/${featuredCourse.slug}`)
                }
              >
                <div
                  className={styles.featuredBg}
                  style={{
                    backgroundImage: `url(${featuredCourse.thumbnailUrl || logo})`,
                  }}
                />
                <div className={styles.featuredOverlay} />

                <div className={styles.featuredContent}>
                  <div className={styles.featuredBadge}>
                    <Flame size={14} /> CONTINUAR ASSISTINDO
                  </div>

                  <h2 className={styles.featuredTitle} title={featuredCourse.title}>
                    {featuredCourse.title}
                  </h2>

                  <div className={styles.featuredProgressWrapper}>
                    <div
                      className={`${styles.progressTrack} ${styles.progressTrackFeatured}`}
                    >
                      <div
                        className={styles.progressFill}
                        style={{ width: `${featuredCourse.progress}%` }}
                      />
                    </div>
                    <span className={styles.featuredPercent}>
                      {featuredCourse.progress}% concluído
                    </span>
                  </div>

                  <button className={styles.btnFeaturedPlay}>
                    <Play size={20} fill="currentColor" /> Retomar Aula
                  </button>
                </div>
              </div>
            )}

            {/* 2. ASSISTIDOS RECENTEMENTE */}
            {otherRecent.length > 0 && (
              <div className={styles.sectionBlock}>
                <h3 className={styles.sectionTitle}>
                  <Target size={20} className={styles.textPrimary} />
                  Assistidos Recentemente
                </h3>

                <div className={styles.recentGrid}>
                  {otherRecent.map((course, index) => (
                    <div
                      key={course.id}
                      className={`${styles.recentCard} ${styles.glassPanel}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Acessar curso: ${course.title}, ${course.progress}% concluído`}
                      onClick={() => navigate(`/curso/${course.slug}`)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && navigate(`/curso/${course.slug}`)
                      }
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={styles.recentThumb}>
                        <div className={styles.thumbOverlayDark} />
                        <img
                          src={course.thumbnailUrl || logo}
                          alt={course.title}
                          onError={handleImageError}
                        />
                        <div className={styles.playIconCenter}>
                          <PlayCircle size={36} color="#fff" />
                        </div>
                      </div>

                      <div className={styles.recentInfo}>
                        <h4 className={styles.recentTitle} title={course.title}>
                          {course.title}
                        </h4>
                        <div
                          className={`${styles.progressTrack} ${styles.progressTrackCompact}`}
                        >
                          <div
                            className={styles.progressFill}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className={styles.recentPercent}>
                          {course.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. ACERVO COMPLETO */}
            <div className={styles.sectionBlockSpaced}>
              <h3 className={styles.sectionTitle}>
                <BookOpen size={20} className={styles.textPrimary} />
                Seu Acervo Completo
              </h3>

              <div className={styles.allCoursesGrid}>
                {tableCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className={`${styles.listCard} ${styles.glassPanel}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Acessar curso: ${course.title}, ${course.progress}% concluído`}
                    onClick={() => navigate(`/curso/${course.slug}`)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && navigate(`/curso/${course.slug}`)
                    }
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={styles.listThumb}>
                      <img
                        src={course.thumbnailUrl || logo}
                        alt={course.title}
                        onError={handleImageError}
                      />
                    </div>

                    <div className={styles.listInfo}>
                      <h4 className={styles.listTitle} title={course.title}>
                        {course.title}
                      </h4>
                      <div className={styles.listProgressArea}>
                        <div
                          className={`${styles.progressTrack} ${styles.progressTrackList}`}
                        >
                          <div
                            className={styles.progressFill}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className={styles.listPercent}>
                          {course.progress}%
                        </span>
                      </div>
                    </div>

                    <div className={styles.listAction}>
                      <button
                        className={styles.btnCirclePlay}
                        title="Acessar curso"
                        tabIndex={-1}  // o pai já é focável, evita dupla parada no Tab
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Estado vazio */
          <div className={`${styles.emptyState} ${styles.glassPanel}`}>
            <Compass
              size={64}
              color="#475569"
              style={{ marginBottom: "20px", opacity: 0.5 }}
            />
            <h3 className={styles.emptyStateTitle}>
              O início da sua jornada.
            </h3>
            <p className={styles.emptyStateText}>
              Seu painel está vazio. Explore as trilhas de conhecimento no menu
              lateral e dê o primeiro passo rumo à maestria.
            </p>
            <button
              onClick={() => navigate("/cursos")}
              className={styles.btnPrimaryLarge}
            >
              Explorar Trilhas Agora
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
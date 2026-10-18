import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useUser } from "../components/UserContext";
import { supabase } from "../supabaseClient";
import logo from "../assets/ka-tech-logo.png";
import SEO from "../components/SEO";
import { useDashboardData, DashboardCourse } from "../hooks/useDashboardData";
import { Button, EmptyState, PageHeader, ProgressBar, Skeleton } from "../components/ui";
import { AlertTriangle, BookOpen, Compass, Flame, Heart, Play, PlayCircle, Search, Target, TrendingUp, X } from "lucide-react";
import "./dashboard.css";

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = logo;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

interface CourseCardProps {
  course: DashboardCourse;
  isFav: boolean;
  onToggleFav: (id: number, e: React.MouseEvent) => void;
  index: number;
}

function CourseCard({ course, isFav, onToggleFav, index }: CourseCardProps) {
  return (
    <article className="ui-card ui-card--interactive ui-course-card ui-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link to={`/curso/${course.slug}`} className="dash-card-link" aria-label={`Abrir ${course.title}`} />
      <div className="ui-course-card__thumb">
        <img src={course.thumbnailUrl || logo} alt="" loading="lazy" onError={handleImageError} />
        <div className="ui-course-card__play"><PlayCircle size={44} /></div>
      </div>
      <button
        className={`dash-fav ui-course-card__fav ${isFav ? "is-active" : ""}`}
        onClick={(e) => onToggleFav(course.id, e)}
        aria-pressed={isFav}
        aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Heart size={16} fill={isFav ? "currentColor" : "none"} />
      </button>
      <div className="ui-course-card__body">
        <h3 className="ui-course-card__title" title={course.title}>{course.title}</h3>
        <div className="ui-course-card__meta">
          <ProgressBar value={course.progress} size="sm" label={`Progresso em ${course.title}`} />
          <span className="dash-percent">{course.progress}%</span>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { userName } = useUser();
  const navigate = useNavigate();
  const { data: enrolledCourses = [], isLoading, isError, refetch } = useDashboardData();

  // Estados de Busca, Abas e Favoritos
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [favorites, setFavorites] = useState<number[]>([]);

  // Buscar favoritos do banco vinculados ao usuário autenticado atual
  const fetchFavorites = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_favorites")
        .select("course_id")
        .eq("user_id", user.id);

      if (error) throw error;
      if (data) setFavorites(data.map((fav) => fav.course_id));
    } catch (err) {
      console.error("Erro ao buscar favoritos do banco:", err);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Alternar favorito com captura segura do usuário no momento do clique
  const toggleFavorite = async (courseId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      navigate("/login");
      return;
    }

    const isAlreadyFav = favorites.includes(courseId);

    // Atualização otimista na tela
    setFavorites(isAlreadyFav ? favorites.filter((id) => id !== courseId) : [...favorites, courseId]);

    try {
      if (isAlreadyFav) {
        const { error } = await supabase.from("user_favorites").delete().match({ user_id: user.id, course_id: courseId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_favorites").insert([{ user_id: user.id, course_id: courseId }]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Erro ao atualizar favorito no banco:", err);
      // Reverte o estado visual se falhar
      fetchFavorites();
    }
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return enrolledCourses
      .filter((course) => activeTab !== "favorites" || favorites.includes(course.id))
      .filter((course) => {
        if (!term) return true;
        const titleMatch = course.title?.toLowerCase().includes(term);
        const descMatch = (course as any).description?.toLowerCase().includes(term);
        return titleMatch || descMatch;
      });
  }, [enrolledCourses, activeTab, favorites, searchTerm]);

  const recentCourses = useMemo(
    () => [...enrolledCourses].sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()),
    [enrolledCourses]
  );
  const featuredCourse = recentCourses[0];
  const gridCourses = useMemo(() => [...filteredCourses].sort((a, b) => b.progress - a.progress), [filteredCourses]);

  const avgProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.progress || 0), 0) / enrolledCourses.length)
    : 0;

  const showFeatured = !!featuredCourse && !searchTerm && activeTab === "all";
  const firstName = userName.split(" ")[0];

  const renderContent = () => {
    if (isError) {
      return (
        <EmptyState
          tone="danger"
          icon={<AlertTriangle size={32} />}
          title="Não foi possível carregar sua jornada"
          description="Verifique sua conexão e tente novamente."
          action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
        />
      );
    }

    if (isLoading) {
      return (
        <div className="dash-loading" aria-busy="true" aria-label="Carregando cursos">
          <Skeleton height={260} radius={22} />
          <div className="ui-grid" style={{ marginTop: 24 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={240} radius={16} />)}
          </div>
        </div>
      );
    }

    if (enrolledCourses.length === 0) {
      return (
        <EmptyState
          icon={<Compass size={32} />}
          title="Sua jornada começa aqui"
          description="Você ainda não começou nenhum curso. Explore as trilhas e escolha o primeiro passo."
          action={<Button size="lg" onClick={() => navigate("/cursos")} icon={<Compass size={18} />}>Explorar trilhas</Button>}
        />
      );
    }

    return (
      <>
        {showFeatured && (
          <section className="dash-hero ui-fade-up" aria-label="Continuar assistindo">
            <div className="dash-hero__media">
              <img src={featuredCourse.thumbnailUrl || logo} alt="" onError={handleImageError} />
            </div>
            <div className="dash-hero__body">
              <span className="ui-badge ui-badge--danger"><Flame size={13} /> Continuar assistindo</span>
              <h2 className="dash-hero__title" title={featuredCourse.title}>{featuredCourse.title}</h2>
              <div className="dash-hero__progress">
                <ProgressBar value={featuredCourse.progress} size="lg" label="Progresso do curso" />
                <span>{featuredCourse.progress}% concluído</span>
              </div>
              <div className="dash-hero__actions">
                <Button size="lg" onClick={() => navigate(`/curso/${featuredCourse.slug}`)} icon={<Play size={18} fill="currentColor" />}>
                  Retomar aula
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="ui-btn--icon"
                  onClick={(e) => toggleFavorite(featuredCourse.id, e)}
                  aria-pressed={favorites.includes(featuredCourse.id)}
                  aria-label={favorites.includes(featuredCourse.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart size={18} fill={favorites.includes(featuredCourse.id) ? "currentColor" : "none"} color={favorites.includes(featuredCourse.id) ? "var(--color-danger)" : undefined} />
                </Button>
              </div>
            </div>
          </section>
        )}

        <section className="ui-section">
          <div className="ui-section__head">
            <h2 className="ui-section__title">
              <BookOpen size={18} />
              {activeTab === "favorites" ? "Favoritos" : searchTerm ? "Resultados da busca" : "Em andamento"}
            </h2>
            <span className="ui-section__meta">{filteredCourses.length} {filteredCourses.length === 1 ? "curso" : "cursos"}</span>
          </div>

          {gridCourses.length > 0 ? (
            <div className="ui-grid" style={{ ["--ui-grid-min" as any]: "250px" }}>
              {gridCourses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={index}
                  isFav={favorites.includes(course.id)}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={activeTab === "favorites" ? <Heart size={30} /> : <Search size={30} />}
              title={activeTab === "favorites" ? "Nenhum favorito ainda" : "Nada encontrado"}
              description={activeTab === "favorites"
                ? "Toque no coração de um curso para guardá-lo aqui."
                : `Não encontramos cursos para "${searchTerm}". Tente outro termo.`}
              action={
                <Button variant="secondary" onClick={() => { setSearchTerm(""); setActiveTab("all"); }}>
                  {activeTab === "favorites" ? "Ver todos os cursos" : "Limpar busca"}
                </Button>
              }
            />
          )}
        </section>
      </>
    );
  };

  return (
    <div className="ui-shell">
      <SEO title="Minha Jornada" description="Acompanhe seu progresso na KA Tech." />
      <Sidebar />
      <div className="ui-ambient" aria-hidden="true" />

      <main className="ui-main">
        <div className="ui-main__inner">
          <PageHeader
            eyebrow={greeting()}
            title={<>Olá, <span className="ui-text-gradient">{firstName}</span></>}
            subtitle="Retome de onde parou e mantenha o ritmo."
            actions={
              <div className="ui-input-group dash-search">
                <Search size={18} />
                <input
                  type="search"
                  className="ui-input"
                  placeholder="Buscar nos seus cursos"
                  aria-label="Buscar nos seus cursos"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="ui-input-group__end sb-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setSearchTerm("")} aria-label="Limpar busca">
                    <X size={16} />
                  </button>
                )}
              </div>
            }
          />

          {!isLoading && !isError && enrolledCourses.length > 0 && (
            <div className="dash-stats">
              <div className="ui-card dash-stat">
                <span className="dash-stat__icon"><Target size={18} /></span>
                <div><strong>{enrolledCourses.length}</strong><span>em andamento</span></div>
              </div>
              <div className="ui-card dash-stat">
                <span className="dash-stat__icon dash-stat__icon--blue"><TrendingUp size={18} /></span>
                <div><strong>{avgProgress}%</strong><span>progresso médio</span></div>
              </div>
              <div className="ui-card dash-stat">
                <span className="dash-stat__icon dash-stat__icon--pink"><Heart size={18} /></span>
                <div><strong>{favorites.length}</strong><span>favoritos</span></div>
              </div>
            </div>
          )}

          {!isLoading && !isError && enrolledCourses.length > 0 && (
            <div className="ui-tabs dash-tabs" role="tablist" aria-label="Filtrar cursos">
              <button role="tab" className="ui-tab" aria-selected={activeTab === "all"} onClick={() => setActiveTab("all")}>
                Meus cursos <span className="dash-count">{enrolledCourses.length}</span>
              </button>
              <button role="tab" className="ui-tab" aria-selected={activeTab === "favorites"} onClick={() => setActiveTab("favorites")}>
                <Heart size={14} fill={activeTab === "favorites" ? "currentColor" : "none"} />
                Favoritos <span className="dash-count">{favorites.length}</span>
              </button>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

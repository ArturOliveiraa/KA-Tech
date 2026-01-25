import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Sidebar from "../components/Sidebar";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

function Cursos() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Estado para a busca
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        const [profileRes, categoriesRes] = await Promise.all([
          user ? supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null },
          supabase.from("categories").select("*").order('name', { ascending: true })
        ]);

        if (profileRes.data) setUserRole(profileRes.data.role);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Lógica de filtragem reativa
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar/>

      <main style={{ flex: 1, padding: '40px', marginLeft: '260px', boxSizing: 'border-box' }}>
        
        {/* Header com Busca */}
        <header style={{ 
          marginBottom: '50px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px' 
        }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Explorar Trilhas</h1>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Escolha um caminho e comece a sua jornada.</p>
          </div>

          {/* Barra de Busca (Lupa) */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', zIndex: 10 }}>🔍</span>
            <input 
              type="text"
              placeholder="Buscar trilha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 55px',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#fff',
                outline: 'none',
                fontFamily: 'Sora',
                fontSize: '0.95rem',
                transition: '0.3s',
                backdropFilter: 'blur(10px)'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)'}
            />
          </div>
        </header>

        {loading ? (
          <div style={{ color: '#8b5cf6', textAlign: 'center', padding: '100px', fontSize: '1.2rem', fontWeight: 700 }}>
             Sincronizando trilhas...
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '30px' 
          }}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div 
                  key={cat.id} 
                  style={{ 
                    background: 'linear-gradient(145deg, #09090b 0%, #020617 100%)', 
                    borderRadius: '28px', 
                    border: '1px solid rgba(255, 255, 255, 0.03)', 
                    padding: '35px', 
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  className="category-card"
                >
                  {/* Detalhe estético de fundo */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '-20px', 
                    right: '-20px', 
                    width: '100px', 
                    height: '100px', 
                    background: 'rgba(139, 92, 246, 0.05)', 
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                  }}></div>

                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: '25px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>🚀</span>
                    )}
                  </div>

                  <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>{cat.name}</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px', flex: 1 }}>
                    {cat.description || "Inicie seu aprendizado nesta trilha de conhecimento específica."}
                  </p>

                  <button 
                    onClick={() => navigate(`/categoria/${cat.slug}`)}
                    style={{ 
                      background: 'rgba(139, 92, 246, 0.1)', 
                      color: '#a78bfa', 
                      border: '1px solid rgba(139, 92, 246, 0.2)', 
                      padding: '16px', 
                      borderRadius: '14px', 
                      cursor: 'pointer', 
                      fontWeight: 800, 
                      fontSize: '0.9rem',
                      transition: '0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#8b5cf6';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                      e.currentTarget.style.color = '#a78bfa';
                    }}
                  >
                    Acessar Cursos <span>→</span>
                  </button>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                Nenhuma trilha encontrada com o nome "{searchTerm}".
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Cursos;
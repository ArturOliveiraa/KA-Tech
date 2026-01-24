import React, { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true); // Esta é a variável do aviso
  const [userRole, setUserRole] = useState<string | null>(null);
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
        setLoading(false); // Define como falso após o carregamento
      }
    }
    loadData();
  }, []);

  return (
    <div className="dashboard-wrapper" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#020617', fontFamily: "'Sora', sans-serif" }}>
      <Sidebar userRole={userRole} />

      <main style={{ flex: 1, padding: '2rem' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800 }}>Explorar Trilhas</h1>
          <p style={{ color: '#9ca3af' }}>Selecione uma categoria para ver os cursos disponíveis.</p>
        </header>

        {/* USO DA VARIÁVEL LOADING PARA RESOLVER O ERRO */}
        {loading ? (
          <div style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '1.1rem' }}>
            Carregando categorias...
          </div>
        ) : (
          <div className="admin-content-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {categories.length > 0 ? (
              categories.map((cat) => (
                <div 
                  key={cat.id} 
                  onClick={() => navigate(`/categoria/${cat.slug}`)}
                  style={{ 
                    background: '#09090b', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(139, 92, 246, 0.15)', 
                    padding: '30px', 
                    flex: '1 1 300px', 
                    maxWidth: '400px', 
                    cursor: 'pointer', 
                    transition: '0.3s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#8b5cf6')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)')}
                >
                  {cat.image_url && (
                    <img src={cat.image_url} alt={cat.name} style={{ width: '50px', height: '50px', marginBottom: '20px', objectFit: 'contain' }} />
                  )}
                  <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>{cat.name}</h2>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6' }}>{cat.description || "Explore os cursos desta trilha."}</p>
                </div>
              ))
            ) : (
              <p style={{ color: '#9ca3af' }}>Nenhuma categoria cadastrada ainda.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Cursos;
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/api/buscar-ia', async (req, res) => {
    const { query } = req.body;
    console.log("--- Nova busca iniciada ---");
    console.log("Termo buscado:", query);

    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Sua GEMINI_API_KEY não foi encontrada no arquivo .env");
        }

        // 1. Chamada ao Gemini
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`;
        
        console.log("Solicitando vetor ao Gemini...");
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: query }] }
            })
        });

        const data = await response.json();
        
        if (!data.embedding) {
            console.error("Erro retornado pelo Gemini:", data);
            throw new Error("Gemini não devolveu o vetor. Verifique sua chave.");
        }

        const query_embedding = data.embedding.values;
        console.log("Vetor gerado com sucesso.");

        // 2. Chamada ao Supabase
        console.log("Consultando banco de dados...");
        const { data: lessons, error } = await supabase.rpc('match_aulas', {
            query_embedding: query_embedding,
            match_threshold: 0.3,
            match_count: 5
        });

        if (error) {
            console.error("Erro no Supabase RPC:", error);
            throw error;
        }

        console.log(`Busca finalizada. ${lessons.length} resultados encontrados.`);
        res.json({ results: lessons });

    } catch (err) {
        // Este console.log vai te dizer EXATAMENTE o que deu errado no terminal do VS Code
        console.error("ERRO FATAL NO BACKEND:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Servidor KA rodando em http://localhost:${PORT}`));
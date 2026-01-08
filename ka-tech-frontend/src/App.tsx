import { FormEvent, useState } from "react";
import api from "./services/api";

function App() {
  const [email, setEmail] = useState("artur.seguro@example.com");
  const [password, setPassword] = useState("minhaSenha123");
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await api.post("/auth/login", { email, password });

      const { token, user } = response.data;

      localStorage.setItem("ka-tech:token", token);
      setUserName(user.name);
      setMessage("Login realizado com sucesso!");
    } catch (error: any) {
      console.error(error);
      setMessage(
        error.response?.data?.error || "Erro ao fazer login. Tente novamente."
      );
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a, #020617)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: 400,
          padding: 32,
          borderRadius: 16,
          background: "rgba(15,23,42,0.9)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.75)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          KA Tech
        </h1>
        <p style={{ marginBottom: 24, color: "#9ca3af" }}>
          Faça login para gerenciar seus contatos.
        </p>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8,
              width: "100%",
              padding: 10,
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #22c55e, #16a34a, #22c55e)",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>

        {message && (
          <p style={{ marginTop: 16, fontSize: 14, color: "#f97316" }}>
            {message}
          </p>
        )}

        {userName && (
          <p style={{ marginTop: 8, fontSize: 14 }}>
            Bem-vindo, <strong>{userName}</strong>!
          </p>
        )}
      </div>
    </div>
  );
}

export default App;

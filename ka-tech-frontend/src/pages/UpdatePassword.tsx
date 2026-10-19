import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import { Button } from "../components/ui";
import { authErrorMessage } from "../utils/authErrors";

function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // O Supabase atualiza a senha do usuário da sessão atual (vinda do link do e-mail)
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccessMessage("Senha atualizada! Redirecionando para o login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setErrorMessage(authErrorMessage(err, "Não foi possível trocar a senha."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Crie uma nova senha"
      subtitle="Escolha uma senha forte que você não usa em outros sites."
      heroTitle="Sua segurança vem primeiro."
      heroText="Depois de salvar, é só entrar novamente com a nova senha."
    >
      <form className="auth-form" onSubmit={handleUpdate}>
        <AuthField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo de 6 caracteres"
          minLength={6}
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          icon={<Lock size={18} />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {errorMessage && <div className="ui-alert ui-alert--danger" role="alert">{errorMessage}</div>}
        {successMessage && <div className="ui-alert ui-alert--success" role="status">{successMessage}</div>}

        <Button type="submit" size="lg" block loading={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default UpdatePassword;

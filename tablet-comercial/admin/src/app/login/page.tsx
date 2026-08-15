"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

function traduzErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (m.includes("network") || m.includes("fetch")) return "Falha de conexão. Verifique sua internet.";
  if (m.includes("missing email")) return "Informe o e-mail.";
  if (m.includes("missing password")) return "Informe a senha.";
  return `Não foi possível entrar: ${mensagem}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    // Já logado? Vai direto para o conteúdo.
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/conteudo");
      });
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.trim()) {
      setErro("Informe o e-mail.");
      return;
    }
    if (!senha) {
      setErro("Informe a senha.");
      return;
    }
    setCarregando(true);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro(traduzErroAuth(error.message));
      return;
    }
    router.replace("/conteudo");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#072525] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#018063] text-2xl font-black text-white">
            T
          </div>
          <h1 className="text-2xl font-bold text-[#F9FFFF]">Tablet Comercial</h1>
          <p className="mt-1 text-sm text-[#BCD62B]">Painel do gestor</p>
        </div>

        <form onSubmit={entrar} className="card space-y-4">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@empresa.com.br"
            />
          </div>
          <div>
            <label htmlFor="senha" className="label">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              className="input"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

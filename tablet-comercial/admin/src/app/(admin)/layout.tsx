"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

const NAV = [
  { href: "/conteudo", label: "Conteúdo" },
  { href: "/publicar", label: "Publicar" },
  { href: "/dispositivos", label: "Dispositivos" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setEmail(data.session.user.email ?? null);
      setVerificando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setEmail(session.user.email ?? null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function sair() {
    await getSupabase().auth.signOut();
    router.replace("/login");
  }

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando sessão…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[#0B3134] bg-[#072525]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/conteudo" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#018063] text-sm font-black text-white">
                T
              </span>
              <span className="text-sm font-bold text-[#F9FFFF]">Tablet Comercial</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const ativo = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                      (ativo
                        ? "bg-[#018063] text-white"
                        : "text-[#F9FFFF]/80 hover:bg-[#0B3134] hover:text-white")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#F9FFFF]/60 sm:block">{email}</span>
            <button
              onClick={sair}
              className="rounded-lg border border-[#0B3134] px-3 py-1.5 text-xs font-medium text-[#F9FFFF]/80 hover:bg-[#0B3134]"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

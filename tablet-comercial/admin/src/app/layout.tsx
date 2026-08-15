import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tablet Comercial — Admin",
  description: "Painel do gestor — conteúdo dos tablets de evento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

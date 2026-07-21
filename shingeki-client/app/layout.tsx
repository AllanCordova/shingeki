import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shingeki",
  description: "Plataforma de testes de seguranca (DAST) — cliente web",
};

/*
  Script anti-flash: aplica a classe `dark` antes da hidratação, lendo a
  escolha persistida pelo Zustand (chave "shingeki-theme"). Evita o "flash"
  de tema claro ao carregar com tema escuro selecionado.
*/
const themeScript = `(function(){try{var s=localStorage.getItem('shingeki-theme');if(s){var t=JSON.parse(s).state.theme;if(t==='dark'){document.documentElement.classList.add('dark');}}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

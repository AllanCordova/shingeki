import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingPage } from "@/components/landing/landing-page";
import { AUTH_COOKIE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Shingeki — Segurança web automatizada",
  description:
    "Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web. DAST, SAST e correção guiada por stack.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthenticated = Boolean(cookieStore.get(AUTH_COOKIE)?.value);

  return <LandingPage isAuthenticated={isAuthenticated} />;
}

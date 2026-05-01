import {
  BottomCtaBanner,
  FeaturesSection,
  HeroSection,
  HomeHeader,
  Showcase3DSection,
  SiteFooter,
  WorkflowSection,
} from "@/components/home";

export default function HomePage() {
  return (
    <main data-landing="dark" className="min-h-screen bg-background text-foreground">
      <HomeHeader />
      <HeroSection />
      <FeaturesSection />
      <Showcase3DSection />
      <WorkflowSection />
      <BottomCtaBanner />
      <SiteFooter />
    </main>
  );
}

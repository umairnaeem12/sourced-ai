import { ClosingCta } from "@/features/landing/ClosingCta";
import { Comparison } from "@/features/landing/Comparison";
import { DemoStore } from "@/features/landing/DemoStore";
import { Faq } from "@/features/landing/Faq";
import { Features } from "@/features/landing/Features";
import { Hero } from "@/features/landing/Hero";
import { MotionProvider, ScrollProgress } from "@/features/landing/motion";
import { Pipeline } from "@/features/landing/Pipeline";
import { SiteFooter } from "@/features/landing/SiteFooter";
import { SiteHeader } from "@/features/landing/SiteHeader";
import { TeamView } from "@/features/landing/TeamView";

export default function Home() {
  return (
    <MotionProvider>
      <ScrollProgress />
      <SiteHeader />
      <main className="overflow-x-clip">
        <Hero />
        <Pipeline />
        <Features />
        <TeamView />
        <Comparison />
        <DemoStore />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </MotionProvider>
  );
}

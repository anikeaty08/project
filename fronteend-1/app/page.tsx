import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { WisdomSection } from "@/components/landing/wisdom-section";
import { JourneySection } from "@/components/landing/journey-section";
import { TraditionsSection } from "@/components/landing/traditions-section";
import { MetricsSection } from "@/components/landing/metrics-section";
import { HerbalRemediesSection } from "@/components/landing/herbal-remedies-section";
import { SymptomCheckerSection } from "@/components/landing/symptom-checker-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <WisdomSection />
      <JourneySection />
      <TraditionsSection />
      <MetricsSection />
      <HerbalRemediesSection />
      <SymptomCheckerSection />
      <TestimonialsSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}

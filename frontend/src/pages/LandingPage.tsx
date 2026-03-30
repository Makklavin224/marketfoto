import { lazy, Suspense } from "react";
import HeroSection from "../components/landing/HeroSection";

const HowItWorksSection = lazy(() => import("../components/landing/HowItWorksSection"));
const BeforeAfterSection = lazy(() => import("../components/landing/BeforeAfterSection"));
const MarketplacesSection = lazy(() => import("../components/landing/MarketplacesSection"));
const PricingSection = lazy(() => import("../components/landing/PricingSection"));
const FAQSection = lazy(() => import("../components/landing/FAQSection"));
const FooterSection = lazy(() => import("../components/landing/FooterSection"));

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <Suspense fallback={<div className="min-h-screen" />}>
        <HowItWorksSection />
        <BeforeAfterSection />
        <MarketplacesSection />
        <PricingSection />
        <FAQSection />
        <FooterSection />
      </Suspense>
    </div>
  );
}

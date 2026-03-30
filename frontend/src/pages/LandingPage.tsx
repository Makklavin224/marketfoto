import HeroSection from "../components/landing/HeroSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import BeforeAfterSection from "../components/landing/BeforeAfterSection";
import MarketplacesSection from "../components/landing/MarketplacesSection";
import PricingSection from "../components/landing/PricingSection";
import FAQSection from "../components/landing/FAQSection";
import FooterSection from "../components/landing/FooterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorksSection />
      <BeforeAfterSection />
      <MarketplacesSection />
      <PricingSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}

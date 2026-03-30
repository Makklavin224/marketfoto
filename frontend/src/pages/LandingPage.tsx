import { lazy, Suspense, useEffect } from "react";
import HeroSection from "../components/landing/HeroSection";

const HowItWorksSection = lazy(() => import("../components/landing/HowItWorksSection"));
const BeforeAfterSection = lazy(() => import("../components/landing/BeforeAfterSection"));
const MarketplacesSection = lazy(() => import("../components/landing/MarketplacesSection"));
const PricingSection = lazy(() => import("../components/landing/PricingSection"));
const FAQSection = lazy(() => import("../components/landing/FAQSection"));
const FooterSection = lazy(() => import("../components/landing/FooterSection"));

export default function LandingPage() {
  /* Track mouse position for glow gradient (--mouse-x / --mouse-y) */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.round((e.clientX / window.innerWidth) * 100);
      const y = Math.round((e.clientY / window.innerHeight) * 100);
      document.documentElement.style.setProperty("--mouse-x", `${x}%`);
      document.documentElement.style.setProperty("--mouse-y", `${y}%`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Animated mesh background */}
      <div className="bg-mesh" />

      {/* Mouse-follow glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Page content */}
      <div className="relative z-10">
        <HeroSection />
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "var(--purple-500)",
                  borderRightColor: "var(--purple-500)",
                }}
              />
            </div>
          }
        >
          <HowItWorksSection />
          <BeforeAfterSection />
          <MarketplacesSection />
          <PricingSection />
          <FAQSection />
          <FooterSection />
        </Suspense>
      </div>
    </div>
  );
}

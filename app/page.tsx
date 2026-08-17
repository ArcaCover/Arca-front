import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ToolsBelt from "@/components/landing/ToolsBelt";
import AiGapSection from "@/components/AiGapSection";
import RisksBelt from "@/components/landing/RisksBelt";
import Products from "@/components/Products";
import Testimonials from "@/components/Testimonials";
// Replaced by ToolsBelt + RisksBelt — kept for reference
// import CoverageBelt from "@/components/landing/CoverageBelt";
// Moved out of landing — kept for Partners/About page
// import ValuePillars from "@/components/ValuePillars";
// Moved out of landing — kept for Partners/About page
// import HowWeOperate from "@/components/HowWeOperate";
import OceanPrefooter from "@/components/OceanPrefooter";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        {/* One lit canvas behind every body section, so the page reads as a
            single space rather than a stack of differently tinted bands. */}
        <div className="page-canvas">
          {/* Problem before solution: the tools the reader already uses, then
              the gap in their policy, then the risks that gap leaves open, and
              only then what we sell. */}
          <ToolsBelt />
          <AiGapSection />
          <RisksBelt />
          <Products />
          <Testimonials />
        </div>
      </main>
      <OceanPrefooter>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

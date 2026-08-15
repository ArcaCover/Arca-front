import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import AiGapSection from "@/components/AiGapSection";
import Testimonials from "@/components/Testimonials";
import ValuePillars from "@/components/ValuePillars";
import HowWeOperate from "@/components/HowWeOperate";
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
          <Products />
          <AiGapSection />
          <Testimonials />
          <ValuePillars />
          <HowWeOperate />
        </div>
      </main>
      <OceanPrefooter>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

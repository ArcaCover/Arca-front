import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
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
        <Products />
        <Testimonials />
        <ValuePillars />
        <HowWeOperate />
        <OceanPrefooter />
      </main>
      <Footer />
    </>
  );
}

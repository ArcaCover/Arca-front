import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Testimonials from "@/components/Testimonials";
import ValuePillars from "@/components/ValuePillars";
import QuoteForm from "@/components/QuoteForm";
import HowWeOperate from "@/components/HowWeOperate";
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
        <QuoteForm />
        <HowWeOperate />
      </main>
      <Footer />
    </>
  );
}

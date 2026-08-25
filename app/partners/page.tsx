import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  PartnerForm,
  PartnerSteps,
  PartnersHero,
  PlatformsSection,
  WhyPartner,
} from "@/components/partners";

export default function PartnersPage() {
  return (
    <>
      <Navbar />
      <main className="bg-canvas">
        <PartnersHero />
        <WhyPartner />
        <PartnerSteps />
        <PartnerForm />
      </main>
      {/* The footer is a glass panel (bg-marino/60 over a blur), built to sit on
          the landing's ocean video. Marino at 60% over solid marino resolves to
          the same marino, so closing the page on a dark block lets it render as
          designed without touching the component. */}
      <PlatformsSection />
      <div className="bg-marino">
        <Footer />
      </div>
    </>
  );
}

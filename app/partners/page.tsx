import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OceanPrefooter from "@/components/OceanPrefooter";
import {
  PartnerForm,
  PartnerSteps,
  PartnersHero,
  WhyPartner,
} from "@/components/partners";
export default function PartnersPage() {
  return (
    <>
      <Navbar />
      {/* The same lit canvas as the landing: near-white with wide halos of
          cielo and bruma, so this page reads as the same room. */}
      <main className="page-canvas">
        <PartnersHero />
        <WhyPartner />
        <PartnerSteps />
        <PartnerForm />
      </main>
      {/* The footer is a glass panel, so it needs the ocean behind it to read
          as designed — the same closing treatment as the landing, minus the
          prefooter block that page carries above it. */}
      <OceanPrefooter showCta={false}>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

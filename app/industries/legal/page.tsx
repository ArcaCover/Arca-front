import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OceanPrefooter from "@/components/OceanPrefooter";
import {
  BuiltForPractice,
  LegalHero,
  WhatsHappening,
  WhoWeWorkWith,
  WhyExposed,
} from "@/components/industries-legal";

export default function LegalIndustryPage() {
  return (
    <>
      <Navbar />
      {/* The same lit canvas as the landing and the other institutional pages. */}
      <main className="page-canvas">
        <LegalHero />
        <WhatsHappening />
        <WhyExposed />
        <WhoWeWorkWith />
        <BuiltForPractice />
      </main>
      {/* Closes like /partners and /platforms: the footer is a glass panel and
          needs the ocean behind it, without the landing's prefooter block. */}
      <OceanPrefooter showCta={false}>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

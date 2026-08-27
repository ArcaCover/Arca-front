import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OceanPrefooter from "@/components/OceanPrefooter";
import {
  CoverageClosing,
  CoverageGroup,
  CoverageHero,
  FIRST_PARTY_GROUP,
  THIRD_PARTY_GROUP,
} from "@/components/coverage";

export default function CoveragePage() {
  return (
    <>
      <Navbar />
      {/* The same lit canvas as the landing and the other institutional pages.
          The two coverage groups stay transparent so the halos run through
          them; only the closing block goes dark. */}
      <main className="page-canvas">
        <CoverageHero />
        <CoverageGroup group={THIRD_PARTY_GROUP} />
        <CoverageGroup group={FIRST_PARTY_GROUP} />
        <CoverageClosing />
      </main>
      {/* Closes like /partners, /platforms and /industries/legal: the footer is
          a glass panel and needs the ocean behind it, without the landing's
          prefooter block. */}
      <OceanPrefooter showCta={false}>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

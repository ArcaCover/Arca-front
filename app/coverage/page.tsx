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
import {
  IllustBias,
  IllustCompliance,
  IllustCrisis,
  IllustForensic,
  IllustPrivacy,
  IllustRegulatory,
  IllustRemediation,
  IllustWorkProduct,
} from "@/components/coverage/illustrations";

// The illustrations are pure CSS, so they stay server components and are
// handed down as children rather than picked by a key inside the card.
const THIRD_PARTY_ILLUSTRATIONS = [
  <IllustWorkProduct key="work-product" />,
  <IllustRegulatory key="regulatory" />,
  <IllustBias key="bias" />,
  <IllustPrivacy key="privacy" />,
];

const FIRST_PARTY_ILLUSTRATIONS = [
  <IllustRemediation key="remediation" />,
  <IllustForensic key="forensic" />,
  <IllustCrisis key="crisis" />,
  <IllustCompliance key="compliance" />,
];

export default function CoveragePage() {
  return (
    <>
      <Navbar />
      {/* The same lit canvas as the landing and the other institutional pages.
          Both coverage bands sit on it; the first-party one inside a marino
          panel, and only the closing goes full-width dark. */}
      <main className="page-canvas">
        <CoverageHero />
        <CoverageGroup
          group={THIRD_PARTY_GROUP}
          tone="light"
          illustrations={THIRD_PARTY_ILLUSTRATIONS}
        />
        <CoverageGroup
          group={FIRST_PARTY_GROUP}
          tone="dark"
          illustrations={FIRST_PARTY_ILLUSTRATIONS}
        />
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

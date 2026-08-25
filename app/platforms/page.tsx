import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OceanPrefooter from "@/components/OceanPrefooter";
import {
  IntegrationSteps,
  PlatformForm,
  PlatformsHero,
  WhatYouCanBuild,
  WhyIntegrate,
} from "@/components/platforms";

export default function PlatformsPage() {
  return (
    <>
      <Navbar />
      {/* The same lit canvas as the landing and /partners. The marino section
          inside it is the one dark band, which is what gives this page its
          more technical read. */}
      <main className="page-canvas">
        <PlatformsHero />
        <WhatYouCanBuild />
        <IntegrationSteps />
        <WhyIntegrate />
        <PlatformForm />
      </main>
      {/* Closes exactly like /partners: the footer is a glass panel and needs
          the ocean behind it, without the prefooter block the landing carries. */}
      <OceanPrefooter showCta={false}>
        <Footer />
      </OceanPrefooter>
    </>
  );
}

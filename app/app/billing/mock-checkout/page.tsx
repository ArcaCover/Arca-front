import { Suspense } from "react";
import { notFound } from "next/navigation";

import MockCheckout from "./MockCheckout";

// A server component, so outside mock the route is a real 404 from the build on, like the back's debug routes: the
// comparison against the inlined literal decides it (DN-09 literal guard).
export default function MockCheckoutPage() {
  if (process.env.NEXT_PUBLIC_ARCA_MODE === "mock") {
    return (
      <Suspense fallback={null}>
        <MockCheckout />
      </Suspense>
    );
  }
  notFound();
}

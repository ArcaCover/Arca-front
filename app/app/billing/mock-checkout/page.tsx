import { Suspense, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

// Loaded only inside the literal guard below, never imported statically: in a production build the comparison folds to
// false, the import is dead code and no chunk for the simulated checkout is emitted (DN-09 literal guard, as in
// components/debug/DebugMount.tsx).
let MockCheckout: ComponentType | undefined;

// A server component, so outside mock the route is a real 404 from the build on, like the back's debug routes: the
// comparison against the inlined literal decides it (DN-09 literal guard).
export default function MockCheckoutPage() {
  if (process.env.NEXT_PUBLIC_ARCA_MODE === "mock") {
    MockCheckout ??= dynamic(() => import("./MockCheckout"));
    return (
      <Suspense fallback={null}>
        <MockCheckout />
      </Suspense>
    );
  }
  notFound();
}

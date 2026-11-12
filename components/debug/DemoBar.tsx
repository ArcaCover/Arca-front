"use client";

import { useState } from "react";

import { signOut } from "@/lib/app/auth";
import { rememberOrg, saveAppSession } from "@/lib/app/session";
import { mockSignIn } from "@/lib/debug/mock-auth";
import { mockSeed } from "@/lib/debug/mock-seed";
import { resetDemoStory } from "@/lib/demo/replay";

// The demo's control (lib/arca-mode.ts): a small marino pill floating at the bottom centre, not a strip at the top, because
// the demo is where the UX gets reviewed and a strip there would sit over every page's navigation. The oro dot keeps it
// from reading as the mock's stripes or the live rojo.
// "View as" signs in as one of the demo organization's users, the way the mock's debug panel does: every page then shows
// what that role sees. "Start over" clears everything the demo kept in this browser and goes back to the landing page.

type Viewer = { id: string; label: string; role?: string; home: string };

const VIEWERS: Viewer[] = [
  { id: "visitor", label: "Visitor", home: "/" },
  { id: "owner", label: "Owner", role: "owner", home: "/app" },
  { id: "admin", label: "Admin", role: "admin", home: "/app" },
  { id: "member", label: "Member", role: "member", home: "/app" },
  { id: "viewer", label: "Viewer", role: "viewer", home: "/app" },
  { id: "platform_admin", label: "ARCA admin", role: "platform_admin", home: "/app/admin" },
];

function forgetEverything(): void {
  signOut();
  resetDemoStory();
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("arca.")) sessionStorage.removeItem(key);
  } catch {
    // Blocked storage keeps nothing anyway.
  }
}

export default function DemoBar() {
  const [busy, setBusy] = useState(false);

  async function viewAs(viewer: Viewer) {
    setBusy(true);
    try {
      if (!viewer.role) {
        forgetEverything();
      } else {
        const { organization, users } = await mockSeed();
        const user = users.find(candidate => candidate.role === viewer.role);
        if (!user) throw new Error(`No ${viewer.label} in the demo organization`);
        const session = await mockSignIn(user.email, viewer.role === "platform_admin" || undefined);
        signOut();
        saveAppSession(session);
        if (viewer.role !== "platform_admin") rememberOrg(organization.id);
      }
      // A full load, so nothing of the previous viewer's state carries over.
      window.location.assign(viewer.home);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-marino px-4 py-2 font-body text-xs text-white shadow-lg"
    >
      <span className="flex items-center gap-1.5 font-semibold">
        <span aria-hidden className="size-1.5 rounded-full bg-oro" />
        DEMO
      </span>
      <span className="hidden text-white/70 md:inline">Sample data · nothing is saved</span>
      <label className="flex items-center gap-1">
        <span className="text-white/70">View as</span>
        <select
          disabled={busy}
          value=""
          onChange={event => {
            const viewer = VIEWERS.find(candidate => candidate.id === event.target.value);
            if (viewer) void viewAs(viewer);
          }}
          className="rounded bg-white/10 px-1 text-xs text-white disabled:opacity-50"
        >
          <option value="" disabled>
            {busy ? "Switching…" : "Choose"}
          </option>
          {VIEWERS.map(viewer => (
            <option key={viewer.id} value={viewer.id} className="text-marino">
              {viewer.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          forgetEverything();
          window.location.assign("/");
        }}
        className="font-semibold text-oro underline-offset-2 hover:underline disabled:opacity-50"
      >
        Start over
      </button>
    </div>
  );
}

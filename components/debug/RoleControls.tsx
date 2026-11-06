"use client";

import type { DebugSeedResponse } from "@arca/contracts/debug";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { useForbiddenShown } from "@/lib/app/access";
import { signOut } from "@/lib/app/auth";
import { rememberOrg, saveAppSession } from "@/lib/app/session";
import { setShowForbidden } from "@/lib/debug/bridge";
import { mockSignIn } from "@/lib/debug/mock-auth";
import { mockSeed } from "@/lib/debug/mock-seed";

// The webapp's demo tools (DN-11 §6.4). A role is tried by signing in as a real user of the seeded organization (D7),
// never by viewing as someone else. The buttons name the role: the seeded users' emails are never shown.

type SeededRole = DebugSeedResponse["users"][number]["role"];
type SignIn = { role: SeededRole; who: string; home: string };

const SIGN_INS: SignIn[] = [
  { role: "owner", who: "owner", home: "/app" },
  { role: "admin", who: "admin", home: "/app" },
  { role: "member", who: "member", home: "/app" },
  { role: "viewer", who: "viewer", home: "/app" },
  { role: "platform_admin", who: "ARCA admin", home: "/app/admin" },
];

const PRIMARY = "rounded-full bg-marino px-3 py-1 font-semibold text-white disabled:opacity-50";
const SECONDARY = "rounded-full border border-marino px-3 py-1 font-semibold disabled:opacity-50";

type Notice = { tone: "info" | "error"; text: string } | null;

const failure = (cause: unknown) => (cause instanceof ApiError ? cause.message : "The request failed");

export default function RoleControls() {
  const forbiddenShown = useForbiddenShown();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function seed() {
    setBusy(true);
    setNotice({ tone: "info", text: "Seeding: the mock back runs a scan and an assessment first, up to a minute" });
    try {
      const { organization, users } = await mockSeed();
      const roles = SIGN_INS.filter(entry => users.some(user => user.role === entry.role)).map(entry => entry.who);
      setNotice({ tone: "info", text: `${organization.name} is ready, with: ${roles.join(", ")}` });
    } catch (cause) {
      setNotice({ tone: "error", text: failure(cause) });
    }
    setBusy(false);
  }

  // The seed is asked again on every sign-in: it hands back the same organization, or builds it again after a reset, and
  // the panel keeps nothing across the full page load that follows.
  async function signInAs({ role, who, home }: SignIn) {
    setBusy(true);
    setNotice({ tone: "info", text: `Signing in as ${who}, after seeding the demo organization if it is missing…` });
    try {
      const { organization, users } = await mockSeed();
      const user = users.find(candidate => candidate.role === role);
      if (!user) {
        setNotice({ tone: "error", text: `The demo organization has no ${who} now` });
        setBusy(false);
        return;
      }
      // The new session is in hand before the old one goes, so a failed sign-in leaves the current user signed in.
      const session = await mockSignIn(user.email);
      signOut();
      saveAppSession(session);
      // The seeded owner may have made other organizations during the demo; this one opens first.
      if (role !== "platform_admin") rememberOrg(organization.id);
      // A full load rather than a client navigation, so nothing of the previous user's /me or state carries over.
      window.location.assign(home);
    } catch (cause) {
      setNotice({ tone: "error", text: failure(cause) });
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-bruma pt-3">
      <p className="font-semibold">Webapp demo</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void seed()} className={PRIMARY}>
          Seed demo organization
        </button>
        {SIGN_INS.map(entry => (
          <button key={entry.role} type="button" disabled={busy} onClick={() => void signInAs(entry)} className={SECONDARY}>
            Sign in as {entry.who}
          </button>
        ))}
      </div>
      {notice && <p className={notice.tone === "error" ? "mt-2 text-rojo" : "mt-2"}>{notice.text}</p>}
      <label className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          role="switch"
          checked={forbiddenShown}
          onChange={event => setShowForbidden(event.target.checked)}
        />
        Show forbidden actions
      </label>
      <p className="mt-1">
        Shows again the controls, sidebar items and pages this role may not use, so the back&apos;s refusal can be tried.
        This tab only.
      </p>
    </div>
  );
}

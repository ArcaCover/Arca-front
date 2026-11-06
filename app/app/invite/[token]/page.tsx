"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE, useBrowser } from "@/components/app/AppContext";
import { ApiError } from "@/lib/api/client";
import { signIn, signOut } from "@/lib/app/auth";
import { acceptInvitation } from "@/lib/app/client";
import { loadAppSession, rememberOrg } from "@/lib/app/session";

// An invited person skips the funnel and the payment: the organization already pays (DN-10 §3). The token stays in the
// URL it came in and is never shown on the page.
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const browser = useBrowser();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Set once the person signs out here, so the page asks for the invited email instead.
  const [signedOut, setSignedOut] = useState(false);
  const session = browser && !signedOut ? loadAppSession() : null;

  async function accept(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (!session && (await signIn(email.trim())) !== "signed_in") {
        setMessage(SIGN_IN_NOT_AVAILABLE);
        setBusy(false);
        return;
      }
      const org = await acceptInvitation(token);
      rememberOrg(org.id);
      router.replace("/app");
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "We could not accept the invitation. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Join an organization</h1>
      <p className="mt-3 text-sm text-marino/70">Sign in with the email the invitation was sent to.</p>
      <form onSubmit={accept} className="mt-6 space-y-4">
        {session ? (
          <p className="text-sm">
            Signed in as {session.email}.{" "}
            {/* The invitation is for one email: someone else signed in on this browser has to leave first. */}
            <button
              type="button"
              onClick={() => {
                signOut();
                setSignedOut(true);
              }}
              className="font-semibold underline"
            >
              Not you? Sign out
            </button>
          </p>
        ) : (
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2"
            />
          </label>
        )}
        <button type="submit" disabled={busy || !browser} className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60">
          {session ? "Accept invitation" : "Sign in and accept"}
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

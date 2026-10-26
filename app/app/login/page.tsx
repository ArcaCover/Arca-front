"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE } from "@/components/app/AppContext";
import { ApiError } from "@/lib/api/client";
import { signIn } from "@/lib/app/auth";

// Sign-in never creates an account (DN-10 §4.7): accounts come from saving the results of an analysis.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const signedIn = platformAdmin ? await signIn(email.trim(), { platformAdmin }) : await signIn(email.trim());
      if (signedIn === "signed_in") {
        router.replace(platformAdmin ? "/app/admin" : "/app");
        return;
      }
      setMessage(SIGN_IN_NOT_AVAILABLE);
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "We could not sign you in. Please try again.");
    }
    setBusy(false);
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
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
        {/* DN-10 §4.6: in mock, the simulated sign-in is also how someone at ARCA becomes a platform admin. */}
        {process.env.NEXT_PUBLIC_ARCA_MODE === "mock" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={platformAdmin} onChange={event => setPlatformAdmin(event.target.checked)} />
            Sign in as an ARCA platform admin (mock)
          </label>
        )}
        <button type="submit" disabled={busy} className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60">
          Sign in
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

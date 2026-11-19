"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { requestCode, verifyCode } from "@/lib/app/auth";

const INVALID = "That code is not valid or has expired. Check the latest email, or send a new code.";

/**
 * The second step of every sign-in on the real accounts (DN-13 §4.1): the 6-digit code Supabase emailed, typed in the same
 * tab, so a claim or an invitation kept by the page is still there afterwards. `neutral` is for the login, which never says
 * whether an email has an account (§4.2): a new code then gets the same answer whether it was sent or not. `next` is where
 * the email's fallback link goes on to, as in the first request.
 */
export default function CodeEntry({
  email,
  next,
  neutral = false,
  onVerified,
  children,
}: {
  email: string;
  next: string;
  neutral?: boolean;
  /** Called once the session exists; the button stays busy while the page goes on. */
  onVerified: () => void;
  /** Extra controls under the form, such as the login's "Use a different email". */
  children?: ReactNode;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (await verifyCode(email, code)) {
      onVerified();
      return;
    }
    setError(INVALID);
    setBusy(false);
  }

  async function resend() {
    setSending(true);
    setError(null);
    setNotice(null);
    const sent = await requestCode(email, next);
    if (neutral) setNotice(`If an account exists for ${email}, we sent it a new code.`);
    else if (sent) setNotice(`We sent a new code to ${email}.`);
    else setError("We could not send a new code. Wait a minute and try again.");
    setSending(false);
  }

  return (
    <div className="mt-6">
      <p role="status" className="text-sm text-marino/80">
        {neutral
          ? `If an account exists for ${email}, we sent it a 6-digit code. It expires in 10 minutes.`
          : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm">
          6-digit code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1 block w-40 rounded-xl border border-marino/20 bg-white px-3 py-2 font-heading text-lg tracking-[0.3em]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={busy || sending}
            className="rounded-full border border-marino/20 px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Send a new code
          </button>
          {children}
        </div>
      </form>
      <p className="mt-4 text-xs leading-5 text-marino/60">
        The email also has a link. It opens a page where you confirm the sign-in, on this device or another one.
      </p>
      {notice && (
        <p role="status" className="mt-4 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

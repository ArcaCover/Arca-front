"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { CircleCheck, MailCheck } from "lucide-react";

import { buttonClass } from "@/components/app/ui";
import { requestCode, verifyCode } from "@/lib/app/auth";

const LENGTH = 6;
/** Seconds before another code can be asked for: Supabase sends one per address every 60 s, and the page asks the person to wait. */
export const RESEND_COOLDOWN_S = 30;
/** The sender of ARCA's emails (DN-13 §4.9, F11), so the person knows what to look for in the spam folder. */
export const CODE_SENDER = "no-reply@arcacover.com";
const INVALID = "That code is not valid or has expired. Check the latest email, or send a new code.";
const EMPTY = Array<string>(LENGTH).fill("");

/**
 * The second step of every sign-in on the real accounts (DN-13 §4.1): the 6-digit code Supabase emailed, typed in the same tab, so a
 * claim or an invitation kept by the page is still there afterwards. Six boxes, one labelled group: typing moves on, Backspace goes
 * back, a pasted or autofilled code fills them all, and the sixth digit verifies. A wrong code keeps the digits, so one typo is one
 * fix. `neutral` is for the login, which never says whether an email has an account (§4.2). `next` is where the email's fallback
 * link goes on to, as in the first request.
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
  /** Called once the session exists; the page goes on from there. */
  onVerified: () => void;
  /** Extra controls beside the resend link, such as the login's "Use a different email". */
  children?: ReactNode;
}) {
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  // When a new code may be asked for, and the clock that counts down to it.
  const [until, setUntil] = useState(() => Date.now() + RESEND_COOLDOWN_S * 1000);
  const [now, setNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((until - now) / 1000));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const id = useId();

  useEffect(() => {
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);

  const focus = (index: number) => boxes.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  async function verify(code: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (await verifyCode(email, code)) {
      setVerified(true);
      onVerified();
      return;
    }
    setError(INVALID);
    setBusy(false);
    // The digits stay: the last box is selected, so the most common fix is one key.
    focus(LENGTH - 1);
    boxes.current[LENGTH - 1]?.select();
  }

  /**
   * Writes digits from a box on; a whole code, pasted or autofilled into any box, fills them all from the first. The sixth digit
   * verifies.
   */
  function fill(index: number, text: string) {
    const cleaned = text.replace(/\D/g, "");
    const from = cleaned.length >= LENGTH ? 0 : index;
    const typed = cleaned.slice(0, LENGTH - from).split("");
    if (typed.length === 0) return;
    const updated = [...digits];
    typed.forEach((digit, offset) => { updated[from + offset] = digit; });
    setDigits(updated);
    setError(null);
    const complete = updated.every(Boolean);
    focus(complete ? LENGTH - 1 : from + typed.length);
    if (complete && !busy) void verify(updated.join(""));
  }

  function change(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "");
    const old = digits[index];
    // A key typed into a box that holds a digit: the new one replaces it, on whichever side of it the caret was.
    if (cleaned.length === 2 && old) {
      fill(index, cleaned.startsWith(old) ? cleaned.slice(1) : cleaned.slice(0, 1));
      return;
    }
    if (cleaned.length > 1) {
      // An autofilled or pasted code lands in one box.
      fill(index, cleaned);
      return;
    }
    const digit = cleaned;
    if (!digit) {
      setDigits(current => current.map((old, at) => (at === index ? "" : old)));
      return;
    }
    fill(index, digit);
  }

  function key(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits(current => current.map((old, at) => (at === index - 1 ? "" : old)));
      focus(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index + 1);
    }
  }

  function paste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (digits.every(Boolean) && !busy) void verify(digits.join(""));
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
    const time = Date.now();
    setNow(time);
    setUntil(time + RESEND_COOLDOWN_S * 1000);
  }

  const label = `${id}-label`;
  const described = [error && `${id}-error`, `${id}-expiry`].filter(Boolean).join(" ");
  return (
    <div className="mt-6">
      <div className="flex items-start gap-3 rounded-2xl bg-bruma/50 p-4">
        <MailCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <p role="status" className="text-sm text-marino/85">
          {neutral ? (
            <>If an account exists for <strong className="break-words">{email}</strong>, we sent it a 6-digit code.</>
          ) : (
            <>We sent a 6-digit code to <strong className="break-words">{email}</strong>.</>
          )}{" "}
          <span id={`${id}-expiry`}>It expires in 10 minutes.</span>
        </p>
      </div>
      <form onSubmit={submit} className="mt-6">
        <div role="group" aria-labelledby={label} aria-describedby={described}>
          <p id={label} className="text-sm font-semibold">
            Verification code<span className="sr-only">, 6 digits</span>
          </p>
          <div className="mt-3 flex gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={element => { boxes.current[index] = element; }}
                value={digit}
                onChange={event => change(index, event.target.value)}
                onKeyDown={event => key(index, event)}
                onPaste={event => paste(index, event)}
                onFocus={event => event.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                autoFocus={index === 0}
                aria-label={`Digit ${index + 1} of ${LENGTH}`}
                aria-invalid={error ? true : undefined}
                disabled={verified}
                className={`h-14 w-11 min-w-0 rounded-2xl border bg-white text-center font-mono text-2xl font-semibold text-marino motion-safe:transition-colors focus-visible:border-cielo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cielo sm:h-16 sm:w-14 ${
                  error ? "border-rojo" : verified ? "border-marino bg-bruma/50" : digit ? "border-marino/40" : "border-marino/20"}`}
              />
            ))}
          </div>
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-3 text-sm font-semibold text-rojo">
            {error}
          </p>
        )}
        {verified ? (
          <p role="status" className="mt-5 flex items-center gap-2 text-sm font-semibold">
            <CircleCheck aria-hidden className="h-5 w-5" />
            Verified. One moment…
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="submit" disabled={busy || !digits.every(Boolean)} className={buttonClass.primary}>
              Verify
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={busy || sending || cooldown > 0}
              className="text-sm font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Send a new code in 0:${String(cooldown).padStart(2, "0")}` : "Send a new code"}
            </button>
            {children}
          </div>
        )}
      </form>
      {notice && (
        <p role="status" className="mt-4 text-sm">
          {notice}
        </p>
      )}
      <p className="mt-6 text-xs leading-5 text-marino/60">
        Can&apos;t find it? Check your spam or junk folder: the email comes from {CODE_SENDER}. It also has a link, which opens a page
        where you confirm the sign-in, on this device or another one.
      </p>
    </div>
  );
}

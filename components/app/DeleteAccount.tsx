"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useApp, useFailure } from "@/components/app/AppContext";
import { Card, Dialog, buttonClass } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { signOut } from "@/lib/app/auth";
import { deleteAccount } from "@/lib/app/client";

const SOLE_OWNER =
  "You are the only owner of an organization. Make another member an owner on the Members page, or request the " +
  "organization's deletion, before deleting your account.";
const NOT_FINISHED = "Your account is closed, but we could not finish removing your sign-in. Try again to finish.";

/**
 * "Delete my account" (DN-13 §4.8, §17.8 step 8): personal, so every role has it, in every mode (the debug modes close a
 * simulated account in the back's memory). DELETE /me answers 204, and then this browser forgets everything the webapp kept
 * and signs out; 409 while the person is the only owner of an organization; 503 when the account is already closed but its
 * sign-in was not removed yet, which the same request, with the same token, finishes.
 */
export default function DeleteAccount() {
  const { me } = useApp();
  const router = useRouter();
  const fail = useFailure();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a 503 the account is closed already: the button only finishes it.
  const [closing, setClosing] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "conflict") setError(SOLE_OWNER);
      else if (cause instanceof ApiError && cause.code === "auth_unavailable") {
        setClosing(true);
        setError(NOT_FINISHED);
      } else setError(fail(cause));
      setBusy(false);
      return;
    }
    await signOut();
    router.replace("/");
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  return (
    <Card title="Your account" description={`Signed in as ${me.user.email}.`}>
      <p className="text-sm text-marino/70">
        Deleting your account signs you out and removes you from every organization you belong to. The organizations, their
        analyses and their activity stay with their other members.
      </p>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass.danger} mt-4`}>
        Delete my account
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Delete your account?"
        description="This cannot be undone. You will be signed out, and an organization would have to invite you again."
        footer={
          <>
            <button type="button" onClick={close} disabled={busy} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="button" onClick={remove} disabled={busy} className={buttonClass.danger}>
              {closing ? "Try again" : "Yes, delete my account"}
            </button>
          </>
        }
      >
        {error && (
          <p role="alert" className="text-sm text-rojo">
            {error}
          </p>
        )}
      </Dialog>
    </Card>
  );
}

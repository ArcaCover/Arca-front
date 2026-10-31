"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy } from "lucide-react";
import {
  ROLES, can, canManageMember, type InvitationView, type InviteRequest, type MemberView, type Permission, type Role,
} from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { invite, listMembers, removeMember, revokeInvitation, setMemberRole } from "@/lib/app/client";

type People = { members: MemberView[]; invitations: InvitationView[] };
type InvitableRole = InviteRequest["role"];
const INVITABLE: InvitableRole[] = ["admin", "member", "viewer"];

// The invite link carries the invitation's secret, so the page shows only its start and copies the rest.
const masked = (link: string) => link.replace(/(\/app\/invite\/.{6}).*$/, "$1…");

export default function MembersPage() {
  const { org } = useApp();
  const fail = useFailure();
  const [people, setPeople] = useState<People | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMembers(org.id)
      .then(list => {
        if (!cancelled) setPeople(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, version, fail]);

  // The buttons follow the contract's permission table (DN-10 §4.3) and the rule that an admin never acts on an owner.
  // In the debug modes they all stay active, so the demo shows the back's 403 (DN-10 §5).
  const debug = process.env.NEXT_PUBLIC_ARCA_MODE === "mock" || process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug";
  const allowed = (permission: Permission, target?: Role, nextRole?: Role) =>
    debug || (can(org.role, permission) && (target === undefined || canManageMember(org.role, target, nextRole)));

  async function act(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      setVersion(value => value + 1);
    } catch (cause) {
      setError(fail(cause));
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    setLink(null);
    setCopied(null);
    void act(async () => {
      const created = await invite(org.id, email.trim(), role);
      setLink(created.inviteUrl ?? null);
      setEmail("");
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("Invite link copied.");
    } catch {
      setCopied("Could not copy the link.");
    }
  }

  return (
    <>
      <h1 className="font-heading text-2xl">Members</h1>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
      {people === null ? (
        !error && (
          <p role="status" className="mt-6 text-sm text-marino/70">
            Loading members…
          </p>
        )
      ) : (
        <>
          <ul className="mt-6 divide-y divide-marino/10 rounded-3xl border border-marino/10 bg-white">
            {people.members.map(member => (
              <li key={member.userId} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="flex-1">{member.email}</span>
                <select
                  aria-label={`Role for ${member.email}`}
                  value={member.role}
                  disabled={!allowed("members.set_role", member.role)}
                  onChange={event => act(() => setMemberRole(org.id, member.userId, event.target.value as Role))}
                  className="rounded-full border border-marino/20 bg-white px-3 py-1.5 disabled:opacity-60"
                >
                  {ROLES.map(option => (
                    <option key={option} value={option} disabled={!allowed("members.set_role", member.role, option)}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Remove ${member.email}`}
                  disabled={!allowed("members.remove", member.role)}
                  onClick={() => act(() => removeMember(org.id, member.userId))}
                  className="rounded-full border border-marino/20 px-3 py-1.5 disabled:opacity-60"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-heading text-lg">Pending invitations</h2>
          {people.invitations.length === 0 && <p className="mt-2 text-sm text-marino/70">None.</p>}
          <ul className="mt-2 space-y-2">
            {people.invitations.map(invitation => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex-1">
                  {invitation.email} · {invitation.role} · expires{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
                <button
                  type="button"
                  aria-label={`Revoke invitation for ${invitation.email}`}
                  disabled={!allowed("members.invite")}
                  onClick={() => act(() => revokeInvitation(org.id, invitation.id))}
                  className="rounded-full border border-marino/20 px-3 py-1.5 disabled:opacity-60"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mt-8 font-heading text-lg">Invite someone</h2>
      <form onSubmit={send} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
        <label>
          Email to invite
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="mt-1 block rounded-xl border border-marino/20 bg-white px-3 py-2"
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={event => setRole(event.target.value as InvitableRole)}
            className="mt-1 block rounded-xl border border-marino/20 bg-white px-3 py-2"
          >
            {INVITABLE.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!allowed("members.invite")}
          className="rounded-full bg-oro px-5 py-2 font-semibold disabled:opacity-60"
        >
          Send invitation
        </button>
      </form>
      {link && (
        <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          Invitation created. Link: {masked(link)}
          <button
            type="button"
            onClick={() => copy(link)}
            className="inline-flex items-center gap-1.5 rounded-full border border-marino/20 px-3 py-1.5"
          >
            <Copy aria-hidden className="h-3.5 w-3.5" />
            Copy invite link
          </button>
          {copied && <span role="status">{copied}</span>}
        </p>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Minus, Search, UserPlus } from "lucide-react";
import {
  PERMISSIONS, ROLES, ROLE_PERMISSIONS, type InvitationView, type InviteRequest, type MemberView, type Permission, type Role,
} from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { Avatar, Badge, Card, PageHeader, ReadOnlyNotice, buttonClass, formatDate, inputClass } from "@/components/app/ui";
import { useAccess } from "@/lib/app/access";
import { invite, listMembers, removeMember, revokeInvitation, setMemberRole } from "@/lib/app/client";
import { PERMISSION_LABEL, ROLE_LABEL } from "@/lib/app/labels";

type People = { members: MemberView[]; invitations: InvitationView[] };
type InvitableRole = InviteRequest["role"];
const INVITABLE: InvitableRole[] = ["admin", "member", "viewer"];

// A row of the permission table stands alone, so its words start with a capital.
const permissionRow = (permission: Permission) => {
  const words = PERMISSION_LABEL[permission];
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// The invite link carries the invitation's secret, so the page shows only its start and copies the rest.
const masked = (link: string) => link.replace(/(\/app\/invite\/.{6}).*$/, "$1…");

export default function MembersPage() {
  const { org, me } = useApp();
  const fail = useFailure();
  const [people, setPeople] = useState<People | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  // The controls follow the contract's permission table and the rule that an admin never acts on an owner, in every mode:
  // what the role may not do is not shown at all. Only the debug switch brings it back, to show the back's 403 (DN-11 D3).
  const access = useAccess();
  const allowed = (permission: Permission, target?: Role, nextRole?: Role) => access.can(permission, { target, nextRole });
  const canInvite = allowed("members.invite");
  // Nothing on this page is the role's to change: it says once who can, instead of showing controls that would only fail.
  const readOnly = !canInvite && !allowed("members.set_role") && !allowed("members.remove");

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

  const needle = query.trim().toLowerCase();
  const shown = people?.members.filter(member => member.email.toLowerCase().includes(needle)) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Members"
        description="Who has access to this workspace, what each role can do, and the invitations still open."
        actions={
          access.can("org.transfer_ownership") && (
            <button type="button" disabled className={buttonClass.secondary}>
              Transfer ownership
              <Badge>Coming soon</Badge>
            </button>
          )
        }
      />
      {readOnly && <ReadOnlyNotice>Ask an owner or admin to invite people or change roles.</ReadOnlyNotice>}
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`space-y-6 ${canInvite ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {people === null ? (
            !error && (
              <p role="status" className="rounded-3xl border border-marino/10 bg-white p-6 text-sm text-marino/70">
                Loading members…
              </p>
            )
          ) : (
            <>
              <Card
                title="People"
                description={`${people.members.length} ${people.members.length === 1 ? "member" : "members"}`}
                actions={
                  <label className="relative block">
                    <span className="sr-only">Search members by email</span>
                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-marino/45" />
                    <input
                      type="search"
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder="Search by email"
                      className="w-56 rounded-full border border-marino/20 bg-white py-1.5 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-cielo"
                    />
                  </label>
                }
              >
                <ul className="divide-y divide-marino/10">
                  {shown.map(member => (
                    <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <Avatar name={member.email} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-semibold">{member.email}</span>
                          {member.email === me.user.email && <Badge tone="info">You</Badge>}
                        </p>
                        <p className="text-xs text-marino/60">Joined {formatDate(member.joinedAt)}</p>
                      </div>
                      {allowed("members.set_role", member.role) ? (
                        <select
                          aria-label={`Role for ${member.email}`}
                          value={member.role}
                          onChange={event => act(() => setMemberRole(org.id, member.userId, event.target.value as Role))}
                          className="rounded-full border border-marino/20 bg-white px-3 py-1.5"
                        >
                          {/* Only the roles this user may hand out, plus the member's own so the select can show it. */}
                          {ROLES.filter(option => option === member.role || allowed("members.set_role", member.role, option)).map(
                            option => (
                              <option key={option} value={option}>
                                {ROLE_LABEL[option]}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <Badge>{ROLE_LABEL[member.role]}</Badge>
                      )}
                      {allowed("members.remove", member.role) && (
                        <button
                          type="button"
                          aria-label={`Remove ${member.email}`}
                          onClick={() => act(() => removeMember(org.id, member.userId))}
                          className={buttonClass.secondary}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {shown.length === 0 && (
                  <p className="py-3 text-sm text-marino/70">
                    {people.members.length === 0 ? "No members yet." : "No member matches that search."}
                  </p>
                )}
              </Card>

              <Card title="Pending invitations" description="An invitation is open until it is accepted, revoked or expires.">
                {people.invitations.length === 0 && <p className="text-sm text-marino/70">None.</p>}
                <ul className="divide-y divide-marino/10">
                  {people.invitations.map(invitation => (
                    <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <Avatar name={invitation.email} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{invitation.email}</p>
                        <p className="text-xs text-marino/60">Expires {formatDate(invitation.expiresAt)}</p>
                      </div>
                      <Badge>{ROLE_LABEL[invitation.role]}</Badge>
                      {canInvite && (
                        <button
                          type="button"
                          aria-label={`Revoke invitation for ${invitation.email}`}
                          onClick={() => act(() => revokeInvitation(org.id, invitation.id))}
                          className={buttonClass.secondary}
                        >
                          Revoke
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>

        {canInvite && (
          <Card title="Invite someone" description="They get a link to join with their own email." className="self-start">
            <form onSubmit={send} className="space-y-3 text-sm">
              <label className="block">
                Email to invite
                <input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                Role
                <select value={role} onChange={event => setRole(event.target.value as InvitableRole)} className={inputClass}>
                  {INVITABLE.map(option => (
                    <option key={option} value={option}>
                      {ROLE_LABEL[option]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={`${buttonClass.primary} w-full`}>
                <UserPlus aria-hidden className="h-4 w-4" />
                Send invitation
              </button>
            </form>
            {link && (
              <div className="mt-4 space-y-2 rounded-2xl bg-bruma p-4 text-sm">
                <p className="break-all">Invitation created. Link: {masked(link)}</p>
                <button type="button" onClick={() => copy(link)} className={buttonClass.secondary}>
                  <Copy aria-hidden className="h-3.5 w-3.5" />
                  Copy invite link
                </button>
                {copied && (
                  <p role="status" className="text-marino/70">
                    {copied}
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      <Card
        className="mt-6"
        title="Roles and permissions"
        description="The same table the API checks. An admin never acts on an owner nor makes someone an owner."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-marino/10 text-xs uppercase tracking-wide text-marino/55">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Permission
                </th>
                {ROLES.map(option => (
                  <th key={option} scope="col" className="px-3 py-2 text-center font-semibold">
                    {ROLE_LABEL[option]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-marino/10">
              {PERMISSIONS.map(permission => (
                <tr key={permission}>
                  <th scope="row" className="py-2.5 pr-4 font-normal">
                    {permissionRow(permission)}
                  </th>
                  {ROLES.map(option => (
                    <td key={option} className="px-3 py-2.5 text-center">
                      {ROLE_PERMISSIONS[option].includes(permission) ? (
                        <Check aria-hidden className="mx-auto h-4 w-4 text-marino" />
                      ) : (
                        <Minus aria-hidden className="mx-auto h-4 w-4 text-marino/30" />
                      )}
                      <span className="sr-only">{ROLE_PERMISSIONS[option].includes(permission) ? "Allowed" : "Not allowed"}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

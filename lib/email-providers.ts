// Consumer mail providers. Kept identical to PERSONAL_EMAIL_DOMAINS in Arca-back
// (apps/api/src/pipeline/domain-resolution.ts): the API refuses any of these as the firm's
// website with `personal_email_domain`, and this list lets /quote say so before the request.
const EMAIL_PROVIDER_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com", "aol.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "mail.com", "yandex.com",
]);

/** The bare host of whatever was typed: no scheme, no `www.`, no path. */
function host(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

export function isEmailProviderDomain(input: string): boolean {
  return EMAIL_PROVIDER_DOMAINS.has(host(input));
}

export function isEmailProviderAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  return at > 0 && EMAIL_PROVIDER_DOMAINS.has(host(email.slice(at + 1)));
}

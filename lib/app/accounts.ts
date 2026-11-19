// Which accounts this build signs people in with (DN-13 §3.2, §8). The real ones are Supabase Auth: production with
// NEXT_PUBLIC_WEBAPP_ENABLED=true, or live-debug with it, against a back started with WEBAPP_PROVIDERS=real. mock is always
// simulated (it never calls a real service, DN-10 §2), and live-debug is simulated by default, like its back. Production
// without the flag has no webapp at all: the back answers 501 and the screens say sign-in is not available.
//
// Until the back reports its providers to the debug panel (DN-13 T19), the flag is what decides, so front and back must agree:
// a Supabase token sent to the simulated back is refused (401) and the other way round too.
//
// Not a debug gate: the real accounts are production code. The debug gates keep their literal comparisons (DN-09 §6.1).
export function realAccounts(): boolean {
  if (process.env.NEXT_PUBLIC_ARCA_MODE === "mock") return false;
  return process.env.NEXT_PUBLIC_WEBAPP_ENABLED === "true";
}

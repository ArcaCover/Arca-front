import { NextResponse, type NextRequest } from "next/server";

// The password of pilot.arcacover.com and dev.arcacover.com (DN-14 §5 in Arca-back). With SITE_BASIC_AUTH ("user:password")
// set for a deployment, every request, pages and scripts alike, asks for the browser's sign-in; without it, as in
// production, this lets everything through. A server variable, never NEXT_PUBLIC_: it must not reach the browser.
export function proxy(request: NextRequest) {
  const credentials = process.env.SITE_BASIC_AUTH;
  if (!credentials) return NextResponse.next();
  if (request.headers.get("authorization") === `Basic ${btoa(credentials)}`) return NextResponse.next();
  return new NextResponse("Sign-in required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Arca", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

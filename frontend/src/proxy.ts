import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const REALM = 'Basic realm="ScholarLens ops", charset="UTF-8"';

interface Credentials {
  username: string;
  password: string;
}

function parseBasicAuth(header: string | null): Credentials | null {
  const [scheme, encoded] = header?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

// Hashing first gives equal-length inputs, so timingSafeEqual never leaks the secret's length.
function matches(presented: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(presented), digest(expected));
}

export function proxy(request: NextRequest) {
  const username = process.env.OPS_USERNAME;
  const password = process.env.OPS_PASSWORD;
  // Fail closed: an unset password must never mean an open page.
  if (!username || !password) {
    return new NextResponse("Operations view is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  // Both compared every time, so the response time doesn't show which one was wrong.
  const usernameMatches = matches(credentials?.username ?? "", username);
  const passwordMatches = matches(credentials?.password ?? "", password);
  if (credentials && usernameMatches && passwordMatches) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: ["/ops", "/ops/:path*"],
};

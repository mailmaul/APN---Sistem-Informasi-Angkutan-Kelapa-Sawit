import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session";
import type { Peran } from "@/lib/constants";

// jose kompatibel dengan edge runtime, jadi proxy bisa memverifikasi JWT
// sendiri tanpa mengimpor next/headers (ambilSesi hanya untuk server component).

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-insecure-secret-do-not-use-in-prod",
);

const JALUR_PUBLIK = ["/login", "/manifest.webmanifest", "/sw.js"];

function publik(pathname: string): boolean {
  return (
    JALUR_PUBLIK.includes(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/icons/")
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (publik(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let peran: Peran | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      peran = payload.peran as Peran;
    } catch {
      peran = null;
    }
  }

  const apiRequest = pathname.startsWith("/api");
  const areaSupir = pathname === "/supir" || pathname.startsWith("/supir/");

  if (!peran) {
    if (apiRequest) return NextResponse.json({ error: "Belum login" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Supir hanya boleh di areanya sendiri; kantor tidak perlu layar supir.
  if (peran === "SUPIR" && !areaSupir && !apiRequest) {
    const url = req.nextUrl.clone();
    url.pathname = "/supir";
    return NextResponse.redirect(url);
  }
  if (peran !== "SUPIR" && areaSupir) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

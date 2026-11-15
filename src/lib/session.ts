import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Peran } from "./constants";

export const SESSION_COOKIE = "apn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-insecure-secret-do-not-use-in-prod",
);

/** Klaim sengaja minimal — apa pun yang bisa berubah dibaca ulang dari DB. */
export type Sesi = {
  sub: string;
  peran: Peran;
  nama: string;
};

export async function buatSesi(klaim: Sesi): Promise<void> {
  const token = await new SignJWT({ peran: klaim.peran, nama: klaim.nama })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(klaim.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function ambilSesi(): Promise<Sesi | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      peran: payload.peran as Peran,
      nama: payload.nama as string,
    };
  } catch {
    return null;
  }
}

export async function hapusSesi(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

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

/**
 * Tanda tangani klaim jadi JWT.
 *
 * Dipisah dari buatSesi() karena aplikasi Android menyimpan token sendiri di
 * penyimpanan terenkripsi dan mengirimnya lewat header Authorization. Cookie
 * pada klien non-browser rapuh: redirect nginx, perubahan SameSite, atau
 * pembersihan cookie memutus sesi 30 hari tanpa gejala.
 */
export async function tandatanganiToken(klaim: Sesi): Promise<string> {
  return new SignJWT({ peran: klaim.peran, nama: klaim.nama })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(klaim.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
}

/** Verifikasi token mentah. Dipakai jalur Bearer dan pembaca cookie. */
export async function bacaToken(token: string): Promise<Sesi | null> {
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

/** Buat sesi: set cookie untuk browser, kembalikan token untuk aplikasi. */
export async function buatSesi(klaim: Sesi): Promise<string> {
  const token = await tandatanganiToken(klaim);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return token;
}

export async function ambilSesi(): Promise<Sesi | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return bacaToken(token);
}

export async function hapusSesi(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

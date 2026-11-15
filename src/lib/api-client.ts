"use client";

import { withBasePath } from "./base-path";

// Pembungkus fetch untuk komponen klien.
// fetch() TIDAK otomatis dapat basePath dari Next, jadi semua URL API harus
// lewat sini (atau withBasePath) — bukan fetch("/api/...") langsung.

async function jalankan<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBasePath(url), {
    credentials: "same-origin",
    ...init,
  });

  const teks = await res.text();
  const data = teks ? JSON.parse(teks) : null;

  if (!res.ok) {
    throw new Error(data?.error ?? `Gagal memuat (${res.status})`);
  }
  return data as T;
}

/** Request JSON. Body otomatis di-stringify kalau dikirim sebagai objek. */
export async function apiJson<T>(
  url: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, headers, ...sisa } = init ?? {};
  return jalankan<T>(url, {
    ...sisa,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Upload multipart — jangan set Content-Type manual, browser yang atur boundary. */
export async function apiForm<T>(url: string, form: FormData, method = "POST"): Promise<T> {
  return jalankan<T>(url, { method, body: form });
}

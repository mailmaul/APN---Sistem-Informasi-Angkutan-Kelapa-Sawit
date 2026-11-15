import { redirect } from "next/navigation";
import { ambilSesi } from "@/lib/session";
import { ShellKantor } from "@/components/kantor/ShellKantor";
import { PERAN_KANTOR } from "@/lib/constants";

// Semua halaman kantor memakai shell ini. Proxy sudah menjaga jalur, tetapi
// sesi tetap dibaca di sini karena nama & peran dibutuhkan header + menu.

export default async function LayoutKantor({ children }: { children: React.ReactNode }) {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login");
  if (!PERAN_KANTOR.includes(sesi.peran)) redirect("/supir");

  return (
    <ShellKantor nama={sesi.nama} peran={sesi.peran}>
      {children}
    </ShellKantor>
  );
}

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusAplikasiSupirPanel } from "@/components/kantor/StatusAplikasiSupir";
import { hitungStatusAplikasiSupir } from "@/lib/aplikasi-supir";

// Halaman pemantauan aplikasi supir. Render awal dihitung di server; panelnya
// menyegarkan diri tiap 30 detik lewat /api/aplikasi-supir yang memakai fungsi
// agregasi yang sama persis.

export const dynamic = "force-dynamic";

export default async function HalamanAplikasiSupir() {
  const status = await hitungStatusAplikasiSupir();

  return (
    <div className="flex flex-col gap-4">
      <StatusAplikasiSupirPanel awal={status} />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-sm">Yang belum terlihat dari sini</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aplikasi Android punya dua alur yang datanya belum ada di basis data: pendaftaran
            supir mandiri (verifikasi akun) dan pengajuan DO oleh supir. Keduanya baru bisa
            dipantau setelah endpoint <code className="angka">api/mobile/*</code> dan tabel{" "}
            <code className="angka">PengajuanDo</code> dibuat — lihat{" "}
            <code className="angka">android/docs/PERMINTAAN-BACKEND.md</code>. Sampai itu ada,
            halaman ini memantau bagian yang sudah nyata: perangkat yang masih mengirim jejak,
            rit yang sedang dikerjakan, dan kendala yang dilaporkan dari lapangan.
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}

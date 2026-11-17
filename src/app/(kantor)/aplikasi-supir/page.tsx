import { PanelPengajuanDo } from "@/components/kantor/PanelPengajuanDo";
import { PanelVerifikasiSupir } from "@/components/kantor/PanelVerifikasiSupir";
import { StatusAplikasiSupirPanel } from "@/components/kantor/StatusAplikasiSupir";
import { hitungStatusAplikasiSupir } from "@/lib/aplikasi-supir";
import { daftarPengajuan } from "@/lib/pengajuan";

// Satu halaman untuk semua urusan aplikasi supir: putusan DO, verifikasi akun,
// dan pemantauan perangkat. Render awal dihitung di server; panelnya
// menyegarkan diri lewat API yang memakai fungsi agregasi yang sama persis.

export const dynamic = "force-dynamic";

export default async function HalamanAplikasiSupir() {
  const [status, pengajuan] = await Promise.all([hitungStatusAplikasiSupir(), daftarPengajuan()]);

  return (
    <div className="flex flex-col gap-4">
      <PanelPengajuanDo awal={pengajuan} />
      <PanelVerifikasiSupir awal={status.verifikasi} />
      <StatusAplikasiSupirPanel awal={status} />
    </div>
  );
}

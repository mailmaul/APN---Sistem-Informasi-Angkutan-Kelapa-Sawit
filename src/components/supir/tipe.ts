import type { JenisBarang, StatusRit } from "@/lib/constants";

// Bentuk data yang dikirim server component ke layar supir.
// Sengaja TIDAK memuat satu pun kolom rupiah (tarif, ongkos, snapshot) —
// supir tidak boleh melihat angka uang, dan cara paling aman adalah angka itu
// tidak pernah sampai ke browsernya.

export type TugasSupir = {
  id: string;
  noDo: string;
  status: StatusRit;
  jenisBarang: JenisBarang;
  nopol: string | null;
  shipper: string;
  noSpk: string;
  asal: string;
  asalAlamat: string | null;
  tujuan: string;
  tujuanAlamat: string | null;
  tanggalTerbit: string;
  tibaMuat: string | null;
  selesaiMuat: string | null;
  tibaBongkar: string | null;
  selesaiBongkar: string | null;
  /** Hanya terisi saat status KENDALA — titik lanjut perjalanan. */
  statusSebelumKendala: StatusRit | null;
};

// Bentuk JSON pengajuan untuk aplikasi supir. Dipakai beberapa route, jadi
// tinggal di lib: berkas route Next tidak boleh mengekspor apa pun selain
// handler HTTP.

export type PengajuanMentah = {
  id: string;
  kontrakId: string;
  nopol: string;
  status: string;
  alasanTolak: string | null;
  createdAt: Date;
  kontrak: { noSpk: string; shipper: { nama: string } };
  rit: { id: string } | null;
};

export type PengajuanDto = {
  id: string;
  kontrakId: string;
  noSpk: string;
  shipper: string;
  nopol: string;
  status: string;
  alasanTolak: string | null;
  dibuatPada: string;
  ritId: string | null;
};

export function bentukPengajuan(p: PengajuanMentah): PengajuanDto {
  return {
    id: p.id,
    kontrakId: p.kontrakId,
    noSpk: p.kontrak.noSpk,
    shipper: p.kontrak.shipper.nama,
    nopol: p.nopol,
    status: p.status,
    alasanTolak: p.alasanTolak,
    dibuatPada: p.createdAt.toISOString(),
    ritId: p.rit?.id ?? null,
  };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { db } from "@/lib/db";
import {
  JENIS_BARANG_LABEL,
  JENIS_KENDALA_LABEL,
  STATUS_RIT_LABEL,
  type JenisBarang,
  type JenisKendala,
  type StatusRit,
  type SumberAngka,
} from "@/lib/constants";
import { formatKg, formatRupiah, hitungMargin } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { AksiRit, TandaSlipFisik } from "@/components/rit/aksi-rit";
import { FormTimbang, type IsiTimbang } from "@/components/rit/form-timbang";
import { LinimasaRit } from "@/components/rit/linimasa";
import { PanelBiaya } from "@/components/rit/panel-biaya";
import { PanelKlaim } from "@/components/rit/panel-klaim";
import { PanelSlip } from "@/components/rit/panel-slip";
import { PetaJejak } from "@/components/rit/peta-jejak";
import type { TitikTetap } from "@/components/rit/peta-leaflet";

export const dynamic = "force-dynamic";

function BarisNilai({
  label,
  nilai,
  tebal,
}: {
  label: string;
  nilai: React.ReactNode;
  tebal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`angka text-sm ${tebal ? "font-semibold" : "font-medium"}`}>{nilai}</span>
    </div>
  );
}

export default async function HalamanDetailRit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rit = await db.rit.findUnique({
    where: { id },
    include: {
      kontrak: { include: { shipper: true, lokasiAsal: true, lokasiTujuan: true } },
      truk: true,
      supir: { select: { id: true, nama: true, hp: true } },
      penimbangan: true,
      foto: { orderBy: { waktu: "asc" } },
      titikGps: { orderBy: { waktu: "asc" } },
      biaya: { orderBy: { tanggal: "desc" } },
      klaim: true,
      kendala: { orderBy: { waktu: "desc" } },
      riwayatStatus: { include: { oleh: { select: { nama: true } } }, orderBy: { waktu: "desc" } },
    },
  });
  if (!rit) notFound();

  const [truk, supir] = await Promise.all([
    db.truk.findMany({ where: { aktif: true }, select: { id: true, nopol: true }, orderBy: { nopol: "asc" } }),
    db.user.findMany({
      where: { peran: "SUPIR", aktif: true },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  const status = rit.status as StatusRit;
  const muat = rit.penimbangan.find((p) => p.jenis === "MUAT") ?? null;
  const bongkar = rit.penimbangan.find((p) => p.jenis === "BONGKAR") ?? null;

  const keIsi = (p: typeof muat): IsiTimbang | null =>
    p
      ? {
          tanggal: format(p.tanggal, "yyyy-MM-dd"),
          noTiket: p.noTiket ?? "",
          bruto: String(p.bruto),
          tara: String(p.tara),
          namaTimbangan: p.namaTimbangan ?? "",
          sumberAngka: p.sumberAngka as SumberAngka,
          catatan: p.catatan ?? "",
        }
      : null;

  const totalBiaya = rit.biaya.reduce((t, b) => t + b.nominal, 0);
  const margin = hitungMargin({
    nettoBongkarKg: bongkar?.netto ?? 0,
    tarifShipperPerTon: rit.tarifShipperPerTonSnapshot,
    ongkosSupirPerRit: rit.ongkosSupirPerRitSnapshot,
    totalBiaya,
    klaimShipper: rit.klaim?.nominal ?? 0,
  });

  const tetap: TitikTetap[] = [
    rit.kontrak.lokasiAsal.lat != null && rit.kontrak.lokasiAsal.lng != null
      ? {
          lat: rit.kontrak.lokasiAsal.lat,
          lng: rit.kontrak.lokasiAsal.lng,
          nama: rit.kontrak.lokasiAsal.nama,
          jenis: "ASAL" as const,
        }
      : null,
    rit.kontrak.lokasiTujuan.lat != null && rit.kontrak.lokasiTujuan.lng != null
      ? {
          lat: rit.kontrak.lokasiTujuan.lat,
          lng: rit.kontrak.lokasiTujuan.lng,
          nama: rit.kontrak.lokasiTujuan.nama,
          jenis: "TUJUAN" as const,
        }
      : null,
  ].filter((t): t is TitikTetap => t !== null);

  const dibatalkan = status === "DIBATALKAN";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/rit" />}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke daftar rit
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{rit.noDo}</h2>
            <StatusBadge status={status} />
            {rit.slipFisikDiterima && (
              <span className="rounded-md border border-sukses/25 bg-sukses/10 px-2 py-0.5 text-xs font-medium text-sukses">
                Slip fisik diterima
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/kontrak/${rit.kontrakId}`} className="hover:text-primary hover:underline">
              {rit.kontrak.noSpk}
            </Link>{" "}
            · {rit.kontrak.shipper.nama} ·{" "}
            {JENIS_BARANG_LABEL[rit.kontrak.jenisBarang as JenisBarang]} ·{" "}
            {rit.kontrak.lokasiAsal.nama} → {rit.kontrak.lokasiTujuan.nama}
          </p>
          <p className="angka text-xs text-muted-foreground">
            Terbit {format(rit.tanggalTerbit, "d MMM yyyy", { locale: localeId })} · Truk{" "}
            {rit.truk?.nopol ?? "belum dialokasikan"} · Supir {rit.supir?.nama ?? "belum dialokasikan"}
          </p>
        </div>
        <AksiRit
          ritId={rit.id}
          noDo={rit.noDo}
          status={status}
          trukId={rit.trukId}
          supirId={rit.supirId}
          truk={truk.map((t) => ({ id: t.id, label: t.nopol }))}
          supir={supir.map((s) => ({ id: s.id, label: s.nama }))}
        />
      </div>

      {dibatalkan && rit.alasanBatal && (
        <p className="flex items-start gap-2 rounded-md border border-bahaya/30 bg-bahaya/10 px-3 py-2 text-sm text-bahaya">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>DO dibatalkan: {rit.alasanBatal}</span>
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* Kiri — bukti lapangan */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Foto slip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PanelSlip foto={rit.foto} />
              <Separator />
              <TandaSlipFisik ritId={rit.id} diterima={rit.slipFisikDiterima} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Linimasa checkpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <LinimasaRit
                tibaMuat={rit.tibaMuat}
                selesaiMuat={rit.selesaiMuat}
                tibaBongkar={rit.tibaBongkar}
                selesaiBongkar={rit.selesaiBongkar}
                lokasiMuat={rit.kontrak.lokasiAsal.nama}
                lokasiBongkar={rit.kontrak.lokasiTujuan.nama}
              />
            </CardContent>
          </Card>

          {rit.kendala.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Kendala lapangan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rit.kendala.map((k) => (
                  <div key={k.id} className="rounded-md border border-bahaya/25 bg-bahaya/5 px-3 py-2">
                    <p className="text-sm font-medium text-bahaya">
                      {JENIS_KENDALA_LABEL[k.jenis as JenisKendala] ?? k.jenis}
                    </p>
                    <p className="angka text-xs text-muted-foreground">
                      {format(k.waktu, "d MMM yyyy HH:mm", { locale: localeId })}
                    </p>
                    <p className="mt-1 text-xs">{k.catatan}</p>
                    {k.penyelesaian && (
                      <p className="mt-1 text-xs text-sukses">Selesai: {k.penyelesaian}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Riwayat status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {rit.riwayatStatus.map((r) => (
                <div key={r.id} className="text-xs">
                  <p>
                    <span className="font-medium">{STATUS_RIT_LABEL[r.ke as StatusRit] ?? r.ke}</span>
                    <span className="text-muted-foreground"> · {r.oleh.nama}</span>
                  </p>
                  <p className="angka text-muted-foreground">
                    {format(r.waktu, "d MMM yyyy HH:mm", { locale: localeId })}
                    {r.catatan ? ` · ${r.catatan}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Tengah — input timbangan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Input timbangan</CardTitle>
          </CardHeader>
          <CardContent>
            <FormTimbang
              ritId={rit.id}
              status={status}
              jenisBarang={rit.kontrak.jenisBarang as JenisBarang}
              taraBakuTruk={rit.truk?.taraBaku ?? null}
              tarifShipperPerTonSnapshot={rit.tarifShipperPerTonSnapshot}
              ongkosSupirPerRitSnapshot={rit.ongkosSupirPerRitSnapshot}
              awal={{ muat: keIsi(muat), bongkar: keIsi(bongkar) }}
            />
          </CardContent>
        </Card>

        {/* Kanan — jejak, biaya, klaim, margin */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Jejak GPS</CardTitle>
            </CardHeader>
            <CardContent>
              <PetaJejak
                jejak={rit.titikGps.map((t) => ({
                  lat: t.lat,
                  lng: t.lng,
                  waktu: t.waktu,
                  leg: t.leg,
                }))}
                tetap={tetap}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Biaya perusahaan</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelBiaya ritId={rit.id} biaya={rit.biaya} terkunci={dibatalkan} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Klaim shipper</CardTitle>
            </CardHeader>
            <CardContent>
              <PanelKlaim
                ritId={rit.id}
                klaim={rit.klaim}
                nilaiSelisihUsulan={rit.nilaiSelisih}
                terkunci={dibatalkan}
              />
            </CardContent>
          </Card>

          {status === "SELESAI" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Lock className="size-3.5" />
                  Angka beku rit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarisNilai
                  label="Selisih berat"
                  nilai={formatKg(Math.abs(rit.selisihKg ?? 0))}
                />
                <BarisNilai label="Kelebihan dinilai" nilai={formatKg(rit.kelebihanKg ?? 0)} />
                <BarisNilai label="Nilai selisih" nilai={formatRupiah(rit.nilaiSelisih ?? 0)} />
                <Separator />
                <BarisNilai label="Tagihan shipper" nilai={formatRupiah(rit.tagihanShipper ?? 0)} />
                <BarisNilai label="Ongkos supir" nilai={formatRupiah(rit.ongkosSupir ?? 0)} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ringkasan margin</CardTitle>
            </CardHeader>
            <CardContent>
              <BarisNilai label="Tagihan shipper" nilai={formatRupiah(margin.tagihanShipper)} />
              <BarisNilai label="Ongkos supir" nilai={`− ${formatRupiah(margin.ongkosSupir)}`} />
              <BarisNilai label="BBM + uang makan" nilai={`− ${formatRupiah(margin.totalBiaya)}`} />
              <BarisNilai label="Klaim shipper" nilai={`− ${formatRupiah(margin.klaimShipper)}`} />
              <Separator />
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <span className="text-xs font-medium">Margin rit</span>
                {status === "SELESAI" ? (
                  <span
                    className={`angka text-base font-semibold ${margin.margin >= 0 ? "text-sukses" : "text-bahaya"}`}
                  >
                    {formatRupiah(margin.margin)}
                  </span>
                ) : (
                  // Sebelum rit selesai, tagihan masih nol sementara BBM & uang
                  // makan sudah keluar — menampilkan selisihnya sebagai margin
                  // merah besar menyesatkan, padahal rit belum tentu rugi.
                  <span className="text-xs text-muted-foreground">Belum final</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Dihitung dari tarif snapshot DO ini:{" "}
                <span className="angka">{formatRupiah(rit.tarifShipperPerTonSnapshot)}/ton</span> dan{" "}
                <span className="angka">{formatRupiah(rit.ongkosSupirPerRitSnapshot)}/rit</span>.
              </p>
              {status !== "SELESAI" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Margin dihitung setelah angka timbang bongkar dimasukkan.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

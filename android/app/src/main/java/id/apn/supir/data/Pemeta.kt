package id.apn.supir.data

import id.apn.supir.data.jaringan.PoAktifDto
import id.apn.supir.data.jaringan.PengajuanDto
import id.apn.supir.data.jaringan.PotonganDto
import id.apn.supir.data.jaringan.RitAktifDto
import id.apn.supir.data.jaringan.RitRiwayatDto
import id.apn.supir.data.jaringan.SupirDto
import id.apn.supir.data.lokal.RitAktifEntity
import id.apn.supir.domain.JenisBarang
import id.apn.supir.domain.PoAktif
import id.apn.supir.domain.Pengajuan
import id.apn.supir.domain.RincianPotongan
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.RitRiwayat
import id.apn.supir.domain.StatusPengajuan
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.StatusVerifikasi
import id.apn.supir.domain.Supir
import java.time.Instant

/** ISO-8601 dari server → epoch milidetik; nilai tak terbaca dianggap kosong. */
fun String?.keEpoch(): Long? =
    this?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }

fun Long.keIso(): String = Instant.ofEpochMilli(this).toString()

private fun barang(nama: String): JenisBarang =
    JenisBarang.entries.firstOrNull { it.name == nama } ?: JenisBarang.PALM_KERNEL

fun SupirDto.keDomain() = Supir(
    id = id,
    nama = nama,
    hp = hp,
    noSim = noSim,
    nopolTerakhir = nopolTerakhir,
    statusVerifikasi = StatusVerifikasi.entries.firstOrNull { it.name == statusVerifikasi }
        ?: StatusVerifikasi.MENUNGGU_VERIFIKASI,
    alasanTolak = alasanTolak,
)

fun PoAktifDto.keDomain() = PoAktif(
    id = id,
    noSpk = noSpk,
    shipper = shipper,
    jenisBarang = barang(jenisBarang),
    lokasiAsal = lokasiAsal,
    lokasiTujuan = lokasiTujuan,
    unitDiminta = unitDiminta,
    unitTerpakai = unitTerpakai,
    periodeSelesai = periodeSelesai,
)

fun PengajuanDto.keDomain() = Pengajuan(
    id = id,
    kontrakId = kontrakId,
    noSpk = noSpk,
    shipper = shipper,
    nopol = nopol,
    status = StatusPengajuan.entries.firstOrNull { it.name == status } ?: StatusPengajuan.DIAJUKAN,
    alasanTolak = alasanTolak,
    dibuatPada = dibuatPadaIso.keEpoch() ?: System.currentTimeMillis(),
    ritId = ritId,
)

fun RitAktifDto.keEntity(sekarang: Long) = RitAktifEntity(
    id = id,
    noDo = noDo,
    status = status,
    nopol = nopol,
    jenisBarang = jenisBarang,
    lokasiMuat = lokasiMuat,
    alamatMuat = alamatMuat,
    lokasiBongkar = lokasiBongkar,
    alamatBongkar = alamatBongkar,
    shipper = shipper,
    doPdfUrl = doPdfUrl,
    tibaMuat = tibaMuat.keEpoch(),
    selesaiMuat = selesaiMuat.keEpoch(),
    tibaBongkar = tibaBongkar.keEpoch(),
    selesaiBongkar = selesaiBongkar.keEpoch(),
    fotoSlipMuatUrl = fotoSlipMuatUrl,
    fotoSlipBongkarUrl = fotoSlipBongkarUrl,
    diperbaruiPada = sekarang,
)

fun RitAktifEntity.keDomain() = RitAktif(
    id = id,
    noDo = noDo,
    status = StatusRit.dari(status) ?: StatusRit.DITUGASKAN,
    nopol = nopol,
    jenisBarang = barang(jenisBarang),
    lokasiMuat = lokasiMuat,
    alamatMuat = alamatMuat,
    lokasiBongkar = lokasiBongkar,
    alamatBongkar = alamatBongkar,
    shipper = shipper,
    doPdfUrl = doPdfUrl,
    tibaMuat = tibaMuat,
    selesaiMuat = selesaiMuat,
    tibaBongkar = tibaBongkar,
    selesaiBongkar = selesaiBongkar,
    fotoSlipMuatUrl = fotoSlipMuatUrl,
    fotoSlipBongkarUrl = fotoSlipBongkarUrl,
)

fun PotonganDto.keDomain() = RincianPotongan(
    selisihKg = selisihKg,
    toleransiKg = toleransiKg,
    kelebihanKg = kelebihanKg,
    tarifPerKg = tarifPerKg,
    nilaiPotongan = nilaiPotongan,
    pemaafan = pemaafan,
    alasanPemaafan = alasanPemaafan,
)

fun RitRiwayatDto.keDomain() = RitRiwayat(
    id = id,
    noDo = noDo,
    tanggal = tanggal.keEpoch() ?: 0L,
    status = StatusRit.dari(status) ?: StatusRit.SELESAI,
    nopol = nopol,
    lokasiMuat = lokasiMuat,
    lokasiBongkar = lokasiBongkar,
    nettoMuatKg = nettoMuatKg,
    nettoBongkarKg = nettoBongkarKg,
    potongan = potongan?.keDomain(),
)

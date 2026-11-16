package id.apn.supir.data.sumber

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import id.apn.supir.data.jaringan.DaftarReq
import id.apn.supir.data.jaringan.DaftarRes
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.jaringan.KendalaReq
import id.apn.supir.data.jaringan.KendalaRes
import id.apn.supir.data.jaringan.PengajuanDto
import id.apn.supir.data.jaringan.PoAktifDto
import id.apn.supir.data.jaringan.PoAktifRes
import id.apn.supir.data.jaringan.PotonganDto
import id.apn.supir.data.jaringan.RitAktifDto
import id.apn.supir.data.jaringan.RitAktifRes
import id.apn.supir.data.jaringan.RitRiwayatDto
import id.apn.supir.data.jaringan.RiwayatRes
import id.apn.supir.data.jaringan.StatusReq
import id.apn.supir.data.jaringan.StatusRes
import id.apn.supir.data.jaringan.SupirDto
import id.apn.supir.data.jaringan.TrackReq
import id.apn.supir.data.jaringan.TrackRes
import id.apn.supir.data.jaringan.UnggahRes
import id.apn.supir.data.keIso
import id.apn.supir.domain.ALUR_SUPIR
import id.apn.supir.domain.FormPengajuan
import id.apn.supir.domain.STATUS_BOLEH_KENDALA
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.TRANSISI_SUDAH_DI_LOKASI
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Backend tiruan untuk `api/mobile/…` selama endpoint aslinya dikerjakan di
 * server (SPEC-ANDROID.md §6).
 *
 * Aturan bisnis yang ditiru sengaja hanya yang kelihatan di layar: kuota PO,
 * persetujuan tertunda, dan mesin status rit — termasuk penolakan 409 untuk
 * aksi basi, supaya antrian offline teruji sungguhan. Tidak ada satu pun angka
 * rupiah selain rincian potongan milik supir sendiri.
 *
 * Dipakai hanya bila `BuildConfig.MOBILE_API_SIAP` bernilai false.
 */
@Singleton
class SumberMobilePalsu @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : SumberMobile {

    @Serializable
    private data class Keadaan(
        var supir: SupirDto = SupirDto(
            id = "supir-palsu",
            nama = "Supir Uji",
            hp = "081311110001",
            noSim = "6271-0101-990001",
            nopolTerakhir = "KH 8123 AB",
            statusVerifikasi = "TERVERIFIKASI",
        ),
        var po: List<PoAktifDto> = PO_AWAL,
        var pengajuan: List<PengajuanDto> = emptyList(),
        var rit: RitAktifDto? = null,
        var riwayat: List<RitRiwayatDto> = RIWAYAT_AWAL,
        /** Waktu pengajuan terakhir dikirim; dipakai untuk simulasi persetujuan. */
        var diajukanPada: Long? = null,
    )

    private val json = Json { prettyPrint = true; ignoreUnknownKeys = true; encodeDefaults = true }
    private val berkas: File get() = File(context.filesDir, "mobile-palsu.json")
    private val gembok = Mutex()
    private var keadaan: Keadaan? = null

    private suspend fun <T> dengan(blok: (Keadaan) -> T): T = gembok.withLock {
        val sekarang = keadaan ?: muat()
        majukanSimulasi(sekarang)
        val hasil = blok(sekarang)
        simpan(sekarang)
        hasil
    }

    private fun muat(): Keadaan {
        val dibaca = runCatching { json.decodeFromString<Keadaan>(berkas.readText()) }.getOrNull()
        return (dibaca ?: Keadaan()).also { keadaan = it }
    }

    private fun simpan(k: Keadaan) {
        keadaan = k
        runCatching { berkas.writeText(json.encodeToString(k)) }
    }

    /** Persetujuan "kantor" datang sendiri setelah jeda, meniru admin menekan Accept. */
    private fun majukanSimulasi(k: Keadaan) {
        val diajukan = k.diajukanPada ?: return
        if (System.currentTimeMillis() - diajukan < JEDA_PERSETUJUAN_MS) return

        val menunggu = k.pengajuan.firstOrNull { it.status == "DIAJUKAN" } ?: run {
            k.diajukanPada = null
            return
        }
        val po = k.po.firstOrNull { it.id == menunggu.kontrakId }
        if (po == null || po.unitTerpakai >= po.unitDiminta) {
            k.pengajuan = k.pengajuan.map {
                if (it.id == menunggu.id) it.copy(status = "KEDALUWARSA", alasanTolak = "Kuota PO sudah penuh") else it
            }
            k.diajukanPada = null
            return
        }

        val ritId = "rit-" + UUID.randomUUID().toString().take(8)
        val nomor = (k.riwayat.size + 1).toString().padStart(4, '0')
        k.rit = RitAktifDto(
            id = ritId,
            noDo = "$nomor/KTM/DO-PK/11/2026",
            status = StatusRit.DITUGASKAN.name,
            nopol = menunggu.nopol,
            jenisBarang = po.jenisBarang,
            lokasiMuat = po.lokasiAsal,
            alamatMuat = "Jl. Pelabuhan Kumai, Kotawaringin Barat",
            lokasiBongkar = po.lokasiTujuan,
            alamatBongkar = "Gudang KTN, Pangkalan Bun",
            shipper = po.shipper,
            doPdfUrl = "api/do/$ritId.pdf",
        )
        k.po = k.po.map { if (it.id == po.id) it.copy(unitTerpakai = it.unitTerpakai + 1) else it }
        k.pengajuan = k.pengajuan.map {
            if (it.id == menunggu.id) it.copy(status = "DISETUJUI", ritId = ritId) else it
        }
        k.diajukanPada = null
    }

    override suspend fun daftar(req: DaftarReq): Hasil<DaftarRes> = dengan { k ->
        k.supir = SupirDto(
            id = "supir-" + UUID.randomUUID().toString().take(6),
            nama = req.nama,
            hp = req.hp,
            noSim = req.noSim,
            nopolTerakhir = req.nopol,
            statusVerifikasi = "MENUNGGU_VERIFIKASI",
        )
        Hasil.Sukses(DaftarRes(k.supir.id, k.supir.statusVerifikasi))
    }

    override suspend fun poAktif(): Hasil<PoAktifRes> = dengan { k ->
        Hasil.Sukses(PoAktifRes(po = k.po, supir = k.supir))
    }

    override suspend fun ajukanDo(form: FormPengajuan): Hasil<PengajuanDto> = dengan { k ->
        if (k.supir.statusVerifikasi != "TERVERIFIKASI") {
            return@dengan Hasil.Galat("Akun Anda belum diverifikasi kantor", 403)
        }
        if (k.rit != null) {
            return@dengan Hasil.Galat("Selesaikan dulu rit yang sedang berjalan", 409)
        }
        val po = k.po.firstOrNull { it.id == form.kontrakId }
            ?: return@dengan Hasil.Galat("PO tidak ditemukan", 404)
        if (po.unitTerpakai >= po.unitDiminta) {
            return@dengan Hasil.Galat("Kuota PO sudah penuh", 409)
        }

        val pengajuan = PengajuanDto(
            id = "aju-" + UUID.randomUUID().toString().take(8),
            kontrakId = po.id,
            noSpk = po.noSpk,
            shipper = po.shipper,
            nopol = form.nopol,
            status = "DIAJUKAN",
            dibuatPadaIso = System.currentTimeMillis().keIso(),
        )
        k.pengajuan = k.pengajuan + pengajuan
        k.supir = k.supir.copy(nopolTerakhir = form.nopol, noSim = form.noSim)
        k.diajukanPada = System.currentTimeMillis()
        Hasil.Sukses(pengajuan)
    }

    override suspend fun pengajuan(id: String): Hasil<PengajuanDto> = dengan { k ->
        k.pengajuan.firstOrNull { it.id == id }
            ?.let { Hasil.Sukses(it) }
            ?: Hasil.Galat("Pengajuan tidak ditemukan", 404)
    }

    override suspend fun ritAktif(): Hasil<RitAktifRes> = dengan { k ->
        Hasil.Sukses(RitAktifRes(rit = k.rit))
    }

    override suspend fun riwayat(): Hasil<RiwayatRes> = dengan { k ->
        Hasil.Sukses(RiwayatRes(rit = k.riwayat))
    }

    override suspend fun majukanStatus(ritId: String, req: StatusReq): Hasil<StatusRes> = dengan { k ->
        val rit = k.rit?.takeIf { it.id == ritId }
            ?: return@dengan Hasil.Galat("Rit tidak ditemukan", 404)
        val sekarang = StatusRit.dari(rit.status) ?: StatusRit.DITUGASKAN
        val tujuan = StatusRit.dari(req.ke) ?: return@dengan Hasil.Galat("Status tidak dikenal", 400)

        if (req.dari != null && req.dari != sekarang.name) {
            return@dengan Hasil.Galat("Status rit sudah berubah, muat ulang layar", 409)
        }
        // Lanjut setelah kendala boleh kembali ke langkah mana pun pada alur:
        // status sebelum kendala tidak disimpan di sumber palsu.
        val lanjutDariKendala =
            if (sekarang == StatusRit.KENDALA) ALUR_SUPIR.firstOrNull { it.ke == tujuan } else null
        val transisi = ALUR_SUPIR.firstOrNull { it.dari == sekarang && it.ke == tujuan }
            ?: TRANSISI_SUDAH_DI_LOKASI.takeIf { it.dari == sekarang && it.ke == tujuan }
            ?: lanjutDariKendala
            ?: return@dengan Hasil.Galat(
                "Langkah ini tidak bisa dilakukan dari status \"${sekarang.label}\"",
                409,
            )

        if (transisi.wajibFoto != null && req.fotoUrl == null) {
            return@dengan Hasil.Galat("Foto slip timbang wajib diunggah sebelum langkah ini", 400)
        }

        val waktu = System.currentTimeMillis()
        val lanjutOtomatis = tujuan == StatusRit.SELESAI_BONGKAR
        val akhir = if (lanjutOtomatis) StatusRit.MENUNGGU_INPUT else tujuan

        var baru = rit.copy(status = akhir.name)
        baru = when (tujuan) {
            StatusRit.TIBA_MUAT -> baru.copy(tibaMuat = waktu.keIso())
            StatusRit.SELESAI_MUAT -> baru.copy(selesaiMuat = waktu.keIso(), fotoSlipMuatUrl = req.fotoUrl)
            StatusRit.TIBA_BONGKAR -> baru.copy(tibaBongkar = waktu.keIso())
            StatusRit.SELESAI_BONGKAR -> baru.copy(selesaiBongkar = waktu.keIso(), fotoSlipBongkarUrl = req.fotoUrl)
            else -> baru
        }
        k.rit = baru
        Hasil.Sukses(StatusRes(status = akhir.name, label = akhir.label))
    }

    override suspend fun laporKendala(ritId: String, req: KendalaReq): Hasil<KendalaRes> = dengan { k ->
        val rit = k.rit?.takeIf { it.id == ritId }
            ?: return@dengan Hasil.Galat("Rit tidak ditemukan", 404)
        val sekarang = StatusRit.dari(rit.status) ?: StatusRit.DITUGASKAN
        if (sekarang !in STATUS_BOLEH_KENDALA) {
            return@dengan Hasil.Galat(
                "Kendala tidak bisa dilaporkan saat status rit \"${sekarang.label}\"",
                409,
            )
        }
        k.rit = rit.copy(status = StatusRit.KENDALA.name)
        Hasil.Sukses(KendalaRes(ok = true, status = StatusRit.KENDALA.name))
    }

    override suspend fun kirimTitik(ritId: String, req: TrackReq): Hasil<TrackRes> = dengan { k ->
        val rit = k.rit?.takeIf { it.id == ritId }
            ?: return@dengan Hasil.Galat("Rit tidak ditemukan", 404)
        val leg = when (StatusRit.dari(rit.status)) {
            StatusRit.MENUJU_MUAT -> "MENUJU_MUAT"
            StatusRit.MENUJU_BONGKAR -> "MENUJU_BONGKAR"
            else -> return@dengan Hasil.Galat("Rit sedang tidak dalam perjalanan", 409)
        }
        Hasil.Sukses(TrackRes(ok = true, leg = leg))
    }

    override suspend fun unggahFoto(berkas: File): Hasil<UnggahRes> = Hasil.Sukses(
        UnggahRes(url = berkas.toURI().toString(), ukuran = berkas.length(), tipe = "image/jpeg"),
    )

    private companion object {
        /** Jeda sebelum "kantor" menyetujui pengajuan pada mode palsu. */
        const val JEDA_PERSETUJUAN_MS = 30_000L

        val PO_AWAL = listOf(
            PoAktifDto(
                id = "po-1",
                noSpk = "0015/MKM-SIM/PK/11/2026",
                shipper = "PT Mitra Karya Mandiri",
                jenisBarang = "PALM_KERNEL",
                lokasiAsal = "PKS Sungai Rangit, Kumai",
                lokasiTujuan = "Gudang KTN, Pangkalan Bun",
                unitDiminta = 10,
                unitTerpakai = 7,
                periodeSelesai = "2026-11-30",
            ),
            PoAktifDto(
                id = "po-2",
                noSpk = "0021/SJM-SIM/PS/11/2026",
                shipper = "PT Sungai Jaya Makmur",
                jenisBarang = "PALM_SHELL",
                lokasiAsal = "PKS Natai Baru, Arut Selatan",
                lokasiTujuan = "Pelabuhan Panglima Utar, Kumai",
                unitDiminta = 6,
                unitTerpakai = 6,
                periodeSelesai = "2026-11-25",
            ),
            PoAktifDto(
                id = "po-3",
                noSpk = "0023/MKM-SIM/PK/11/2026",
                shipper = "PT Mitra Karya Mandiri",
                jenisBarang = "PALM_KERNEL",
                lokasiAsal = "PKS Sulung Ranch, Kotawaringin Lama",
                lokasiTujuan = "Gudang KTN, Pangkalan Bun",
                unitDiminta = 12,
                unitTerpakai = 3,
                periodeSelesai = "2026-12-05",
            ),
        )

        val RIWAYAT_AWAL = listOf(
            RitRiwayatDto(
                id = "rit-lama-1",
                noDo = "0012/KTM/DO-PK/11/2026",
                tanggal = "2026-11-09T01:20:00Z",
                status = "SELESAI",
                nopol = "KH 8123 AB",
                lokasiMuat = "PKS Sungai Rangit, Kumai",
                lokasiBongkar = "Gudang KTN, Pangkalan Bun",
                nettoMuatKg = 9_840,
                nettoBongkarKg = 9_790,
                potongan = PotonganDto(
                    selisihKg = 50,
                    toleransiKg = 20,
                    kelebihanKg = 30,
                    tarifPerKg = 7_500,
                    nilaiPotongan = 225_000,
                    pemaafan = 0,
                ),
            ),
            RitRiwayatDto(
                id = "rit-lama-2",
                noDo = "0009/KTM/DO-PK/11/2026",
                tanggal = "2026-11-05T23:40:00Z",
                status = "SELESAI",
                nopol = "KH 8123 AB",
                lokasiMuat = "PKS Natai Baru, Arut Selatan",
                lokasiBongkar = "Pelabuhan Panglima Utar, Kumai",
                nettoMuatKg = 10_120,
                nettoBongkarKg = 10_118,
                potongan = null,
            ),
        )
    }
}

package id.apn.supir.data.jaringan

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Bentuk persis balasan backend web (src/app/api/**). Semua galat seragam:
// { "error": "pesan bahasa Indonesia" }.

@Serializable
data class GalatDto(val error: String)

@Serializable
data class MasukReq(val identitas: String, val password: String)

@Serializable
data class PenggunaDto(val id: String, val nama: String, val peran: String)

/**
 * `token` belum dikirim backend hari ini — sesi datang sebagai cookie
 * `apn_session`. Kolom opsional supaya aplikasi langsung memakai Bearer begitu
 * server menambahkannya (lihat docs/PERMINTAAN-BACKEND.md).
 */
@Serializable
data class MasukRes(val user: PenggunaDto, val token: String? = null)

@Serializable
data class StatusReq(
    val ke: String,
    val dari: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val fotoUrl: String? = null,
)

@Serializable
data class StatusRes(val status: String, val label: String)

@Serializable
data class TrackReq(
    val lat: Double,
    val lng: Double,
    val akurasi: Float? = null,
    /** ISO-8601 UTC; dikirim supaya titik antrian offline tidak tertanggal ulang. */
    val waktu: String? = null,
)

@Serializable
data class TrackRes(val ok: Boolean, val leg: String? = null)

@Serializable
data class KendalaReq(
    val jenis: String,
    val catatan: String,
    val fotoUrl: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
)

@Serializable
data class KendalaRes(val ok: Boolean, val status: String)

@Serializable
data class UnggahRes(val url: String, val ukuran: Long, val tipe: String)

// ───────────────────────── Kontrak /api/mobile/* ─────────────────────────
// Belum ada di server (SPEC-ANDROID.md §6). Bentuk di bawah adalah kontrak yang
// diminta ke sesi server; selama belum ada, SumberMobilePalsu yang melayani.

@Serializable
data class DaftarReq(
    val nama: String,
    val hp: String,
    val password: String,
    val noSim: String,
    val nopol: String? = null,
)

@Serializable
data class DaftarRes(val id: String, val statusVerifikasi: String)

@Serializable
data class SupirDto(
    val id: String,
    val nama: String,
    val hp: String,
    val noSim: String? = null,
    val nopolTerakhir: String? = null,
    val statusVerifikasi: String,
    val alasanTolak: String? = null,
)

@Serializable
data class PoAktifDto(
    val id: String,
    val noSpk: String,
    val shipper: String,
    val jenisBarang: String,
    val lokasiAsal: String,
    val lokasiTujuan: String,
    val unitDiminta: Int,
    val unitTerpakai: Int,
    val periodeSelesai: String? = null,
)

@Serializable
data class PoAktifRes(val po: List<PoAktifDto>, val supir: SupirDto)

@Serializable
data class PengajuanDto(
    val id: String,
    val kontrakId: String,
    val noSpk: String,
    val shipper: String,
    val nopol: String,
    val status: String,
    val alasanTolak: String? = null,
    @SerialName("dibuatPada") val dibuatPadaIso: String,
    val ritId: String? = null,
)

@Serializable
data class RitAktifDto(
    val id: String,
    val noDo: String,
    val status: String,
    val nopol: String,
    val jenisBarang: String,
    val lokasiMuat: String,
    val alamatMuat: String? = null,
    val lokasiBongkar: String,
    val alamatBongkar: String? = null,
    val shipper: String,
    val doPdfUrl: String? = null,
    val tibaMuat: String? = null,
    val selesaiMuat: String? = null,
    val tibaBongkar: String? = null,
    val selesaiBongkar: String? = null,
    val fotoSlipMuatUrl: String? = null,
    val fotoSlipBongkarUrl: String? = null,
)

@Serializable
data class RitAktifRes(val rit: RitAktifDto? = null)

@Serializable
data class PotonganDto(
    val selisihKg: Int,
    val toleransiKg: Int,
    val kelebihanKg: Int,
    val tarifPerKg: Long,
    val nilaiPotongan: Long,
    val pemaafan: Long,
    val alasanPemaafan: String? = null,
)

@Serializable
data class RitRiwayatDto(
    val id: String,
    val noDo: String,
    val tanggal: String,
    val status: String,
    val nopol: String,
    val lokasiMuat: String,
    val lokasiBongkar: String,
    val nettoMuatKg: Int? = null,
    val nettoBongkarKg: Int? = null,
    val potongan: PotonganDto? = null,
)

@Serializable
data class RiwayatRes(val rit: List<RitRiwayatDto>)

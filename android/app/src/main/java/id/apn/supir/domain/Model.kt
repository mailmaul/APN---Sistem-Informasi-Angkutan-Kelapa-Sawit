package id.apn.supir.domain

/** Status verifikasi akun supir (SPEC-ANDROID.md §2). */
enum class StatusVerifikasi(val label: String) {
    MENUNGGU_VERIFIKASI("Menunggu verifikasi"),
    TERVERIFIKASI("Terverifikasi"),
    DITOLAK("Ditolak"),
}

enum class StatusPengajuan(val label: String) {
    DIAJUKAN("Menunggu persetujuan"),
    DISETUJUI("Disetujui"),
    DITOLAK("Ditolak"),
    KEDALUWARSA("Kedaluwarsa"),
}

enum class JenisBarang(val label: String) {
    PALM_KERNEL("Palm Kernel"),
    PALM_SHELL("Palm Shell"),
    BESI("Besi"),
}

data class Supir(
    val id: String,
    val nama: String,
    val hp: String,
    val noSim: String?,
    val nopolTerakhir: String?,
    val statusVerifikasi: StatusVerifikasi,
    val alasanTolak: String?,
)

/** PO/kontrak yang sedang membuka kuota angkutan. */
data class PoAktif(
    val id: String,
    val noSpk: String,
    val shipper: String,
    val jenisBarang: JenisBarang,
    val lokasiAsal: String,
    val lokasiTujuan: String,
    val unitDiminta: Int,
    val unitTerpakai: Int,
    val periodeSelesai: String?,
) {
    val sisaKuota: Int get() = (unitDiminta - unitTerpakai).coerceAtLeast(0)
    val penuh: Boolean get() = sisaKuota <= 0
}

/** Isian form "Buat DO" yang dikirim supir. */
data class FormPengajuan(
    val kontrakId: String,
    val nama: String,
    val nopol: String,
    val noSim: String,
    val noHp: String,
    val fotoSelfiePath: String,
)

data class Pengajuan(
    val id: String,
    val kontrakId: String,
    val noSpk: String,
    val shipper: String,
    val nopol: String,
    val status: StatusPengajuan,
    val alasanTolak: String?,
    val dibuatPada: Long,
    val ritId: String?,
)

data class RitAktif(
    val id: String,
    val noDo: String,
    val status: StatusRit,
    val nopol: String,
    val jenisBarang: JenisBarang,
    val lokasiMuat: String,
    val alamatMuat: String?,
    val lokasiBongkar: String,
    val alamatBongkar: String?,
    val shipper: String,
    val doPdfUrl: String?,
    val tibaMuat: Long?,
    val selesaiMuat: Long?,
    val tibaBongkar: Long?,
    val selesaiBongkar: Long?,
    val fotoSlipMuatUrl: String?,
    val fotoSlipBongkarUrl: String?,
) {
    /** Indikator "langkah N dari 6"; 0 berarti belum berangkat. */
    val langkahSelesai: Int
        get() = LANGKAH_SUPIR.indexOfLast { urutanStatus(it) <= urutanStatus(status) } + 1

    private fun urutanStatus(s: StatusRit): Int = when (s) {
        StatusRit.DITERBITKAN, StatusRit.DITUGASKAN -> 0
        StatusRit.MENUJU_MUAT -> 1
        StatusRit.TIBA_MUAT -> 2
        StatusRit.SELESAI_MUAT -> 3
        StatusRit.MENUJU_BONGKAR -> 4
        StatusRit.TIBA_BONGKAR -> 5
        StatusRit.SELESAI_BONGKAR, StatusRit.MENUNGGU_INPUT, StatusRit.SELESAI -> 6
        StatusRit.KENDALA, StatusRit.DIBATALKAN -> 0
    }
}

/**
 * Rincian potongan susut milik supir sendiri.
 *
 * Satu-satunya angka rupiah yang boleh tampil di perangkat supir: SPEC.md v1.2
 * mewajibkan supir melihat dasar potongannya, bukan hanya bayaran yang mengecil.
 * Tarif shipper, tagihan, dan margin tidak pernah dikirim ke sini.
 */
data class RincianPotongan(
    val selisihKg: Int,
    val toleransiKg: Int,
    val kelebihanKg: Int,
    val tarifPerKg: Long,
    val nilaiPotongan: Long,
    val pemaafan: Long,
    val alasanPemaafan: String?,
) {
    val potonganBersih: Long get() = (nilaiPotongan - pemaafan).coerceAtLeast(0)
}

data class RitRiwayat(
    val id: String,
    val noDo: String,
    val tanggal: Long,
    val status: StatusRit,
    val nopol: String,
    val lokasiMuat: String,
    val lokasiBongkar: String,
    val nettoMuatKg: Int?,
    val nettoBongkarKg: Int?,
    val potongan: RincianPotongan?,
)

data class TitikGps(
    val lat: Double,
    val lng: Double,
    val akurasi: Float?,
    val waktu: Long,
)

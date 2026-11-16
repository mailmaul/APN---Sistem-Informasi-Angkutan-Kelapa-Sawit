package id.apn.supir.data.repo

import id.apn.supir.data.jaringan.DaftarReq
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.keDomain
import id.apn.supir.data.lokal.Preferensi
import id.apn.supir.data.sumber.SumberMobile
import id.apn.supir.domain.FormPengajuan
import id.apn.supir.domain.Pengajuan
import id.apn.supir.domain.PoAktif
import id.apn.supir.domain.StatusPengajuan
import id.apn.supir.domain.Supir
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

data class DaftarPo(val po: List<PoAktif>, val supir: Supir)

@Singleton
class RepoPengajuan @Inject constructor(
    private val sumber: SumberMobile,
    private val preferensi: Preferensi,
) {
    /** Pengajuan yang sedang ditunggu persetujuannya, dipulihkan setelah app ditutup. */
    val idPengajuanAktif: Flow<String?> = preferensi.idPengajuanAktif

    suspend fun daftar(
        nama: String,
        hp: String,
        password: String,
        noSim: String,
        nopol: String?,
    ): Hasil<String> = when (val hasil = sumber.daftar(DaftarReq(nama, hp, password, noSim, nopol))) {
        is Hasil.Sukses -> Hasil.Sukses(hasil.data.id)
        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    suspend fun muatPo(): Hasil<DaftarPo> = when (val hasil = sumber.poAktif()) {
        is Hasil.Sukses -> Hasil.Sukses(
            DaftarPo(
                po = hasil.data.po.map { it.keDomain() },
                supir = hasil.data.supir.keDomain(),
            ),
        )

        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    suspend fun ajukan(form: FormPengajuan): Hasil<Pengajuan> = when (val hasil = sumber.ajukanDo(form)) {
        is Hasil.Sukses -> {
            val pengajuan = hasil.data.keDomain()
            preferensi.simpanPengajuanAktif(pengajuan.id)
            Hasil.Sukses(pengajuan)
        }

        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    suspend fun pantau(id: String): Hasil<Pengajuan> = when (val hasil = sumber.pengajuan(id)) {
        is Hasil.Sukses -> {
            val pengajuan = hasil.data.keDomain()
            // Pengajuan yang sudah selesai tidak perlu dipulihkan lagi saat app dibuka.
            if (pengajuan.status != StatusPengajuan.DIAJUKAN) preferensi.simpanPengajuanAktif(null)
            Hasil.Sukses(pengajuan)
        }

        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    suspend fun lupakanPengajuan() = preferensi.simpanPengajuanAktif(null)
}

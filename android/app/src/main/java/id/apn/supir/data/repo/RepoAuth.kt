package id.apn.supir.data.repo

import id.apn.supir.data.jaringan.ApiApn
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.jaringan.MasukReq
import id.apn.supir.data.jaringan.SesiStore
import id.apn.supir.data.jaringan.panggil
import id.apn.supir.data.lokal.BasisDataApn
import id.apn.supir.data.lokal.Preferensi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RepoAuth @Inject constructor(
    private val api: ApiApn,
    private val sesi: SesiStore,
    private val basisData: BasisDataApn,
    private val preferensi: Preferensi,
) {
    val sudahMasuk: StateFlow<Boolean> = sesi.masuk
    val nama: String? get() = sesi.namaSupir

    /**
     * Masuk dengan username atau nomor HP. Akun kantor ditolak di sini: aplikasi
     * ini hanya untuk supir, dan sesi kantor di perangkat supir berbahaya.
     */
    suspend fun masuk(identitas: String, password: String): Hasil<Unit> {
        val hasil = panggil { api.masuk(MasukReq(identitas.trim(), password)) }
        val keluaran: Hasil<Unit> = when (hasil) {
            is Hasil.Sukses -> {
                val pengguna = hasil.data.user
                if (pengguna.peran != "SUPIR") {
                    sesi.hapus()
                    Hasil.Galat("Akun ini bukan akun supir", 403)
                } else {
                    sesi.simpanSesi(
                        cookie = sesi.cookieSesi,
                        token = hasil.data.token,
                        id = pengguna.id,
                        nama = pengguna.nama,
                    )
                    Hasil.Sukses<Unit>(Unit)
                }
            }

            is Hasil.Galat -> Hasil.Galat(hasil.pesan, hasil.kode)
            Hasil.Offline -> Hasil.Offline
        }
        return keluaran
    }

    /** Keluar selalu membersihkan perangkat, walau server tidak terjangkau. */
    suspend fun keluar() {
        panggil { api.keluar() }
        sesi.hapus()
        preferensi.simpanPengajuanAktif(null)
        // clearAllTables() memblokir, dan Room menolak dipanggil dari main
        // thread — tanpa perpindahan ini, menekan Keluar menutup aplikasi.
        withContext(Dispatchers.IO) { basisData.clearAllTables() }
    }
}

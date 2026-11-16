package id.apn.supir.data.repo

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import id.apn.supir.data.antrian.Antrian
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.jaringan.KendalaReq
import id.apn.supir.data.jaringan.StatusReq
import id.apn.supir.data.keDomain
import id.apn.supir.data.keEntity
import id.apn.supir.data.lokal.RitDao
import id.apn.supir.data.sumber.SumberMobile
import id.apn.supir.domain.JenisKendala
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.RitRiwayat
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.TitikGps
import id.apn.supir.domain.Transisi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/** Hasil satu aksi supir di lapangan. */
sealed interface HasilAksi {
    /** Server menerima dan status sudah pindah. */
    data class Terkirim(val status: StatusRit) : HasilAksi

    /** Tidak ada sinyal: aksi tersimpan dan akan dikirim sendiri. */
    data object Diantrikan : HasilAksi

    data class Ditolak(val pesan: String, val perluSegarkan: Boolean) : HasilAksi
}

/**
 * Sumber kebenaran layar rit.
 *
 * Status tidak pernah ditebak di perangkat: Room hanya menyimpan apa yang
 * terakhir dikatakan server. Saat offline, aksi masuk antrian dan layar
 * menandainya sebagai "menunggu terkirim" — bukan sebagai status baru.
 */
@Singleton
class RepoRit @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val sumber: SumberMobile,
    private val ritDao: RitDao,
    private val antrian: Antrian,
) {
    private val json = Json { encodeDefaults = true }

    /** DO disimpan di cache: boleh dibuang sistem, selalu bisa diunduh ulang. */
    private val folderDo: File get() = File(context.cacheDir, "do")

    val ritAktif: Flow<RitAktif?> = ritDao.alirkan().map { it?.keDomain() }

    /** Status yang sudah ditekan supir tetapi belum diakui server. */
    val statusTertunda: Flow<Set<StatusRit>> = antrian.sasaranTertunda.map { sasaran ->
        sasaran.mapNotNull { StatusRit.dari(it) }.toSet()
    }

    val jumlahTertunda: Flow<Int> = antrian.jumlahTertunda

    suspend fun segarkan(): Hasil<Unit> = when (val hasil = sumber.ritAktif()) {
        is Hasil.Sukses -> {
            val dto = hasil.data.rit
            if (dto == null) ritDao.kosongkan() else ritDao.simpan(dto.keEntity(System.currentTimeMillis()))
            Hasil.Sukses(Unit)
        }

        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    suspend fun riwayat(): Hasil<List<RitRiwayat>> = when (val hasil = sumber.riwayat()) {
        is Hasil.Sukses -> Hasil.Sukses(hasil.data.rit.map { it.keDomain() })
        is Hasil.Galat -> hasil
        Hasil.Offline -> Hasil.Offline
    }

    /**
     * Mengunduh DO ke penyimpanan cache aplikasi dan mengembalikan berkasnya.
     *
     * Berkas dipakai ulang bila sudah ada: DO tidak berubah setelah terbit, dan
     * supir di jalan sering membukanya berkali-kali tanpa sinyal.
     */
    suspend fun unduhDo(rit: RitAktif): Hasil<File> {
        val path = rit.doPdfUrl
            ?: return Hasil.Galat("DO untuk rit ini belum terbit", 404)
        val berkas = File(folderDo, "DO-${rit.noDo.replace('/', '-')}.pdf")
        if (berkas.exists() && berkas.length() > 0) return Hasil.Sukses(berkas)
        return sumber.unduhDo(path, berkas)
    }

    /**
     * Memajukan satu langkah. [fotoPath] wajib bila transisi menuntut bukti —
     * fotonya diunggah lebih dulu, baik sekarang maupun nanti dari antrian.
     */
    suspend fun majukan(
        ritId: String,
        dari: StatusRit,
        transisi: Transisi,
        fotoPath: String?,
        lokasi: TitikGps?,
    ): HasilAksi {
        if (transisi.wajibFoto != null && fotoPath == null) {
            return HasilAksi.Ditolak("Langkah ini perlu foto bukti dulu", perluSegarkan = false)
        }

        val fotoUrl = fotoPath?.let { path ->
            when (val unggah = sumber.unggahFoto(java.io.File(path))) {
                is Hasil.Sukses -> unggah.data.url
                Hasil.Offline -> null
                is Hasil.Galat -> return HasilAksi.Ditolak(unggah.pesan, perluSegarkan = false)
            }
        }

        val permintaan = StatusReq(
            ke = transisi.ke.name,
            dari = dari.name,
            lat = lokasi?.lat,
            lng = lokasi?.lng,
            fotoUrl = fotoUrl,
        )

        // Foto belum terunggah berarti tidak ada sinyal: seluruh langkah diantre
        // utuh bersama berkasnya.
        if (fotoPath != null && fotoUrl == null) {
            antrian.antreStatus(ritId, transisi.ke.name, json.encodeToString(permintaan), fotoPath)
            return HasilAksi.Diantrikan
        }

        return when (val hasil = sumber.majukanStatus(ritId, permintaan)) {
            is Hasil.Sukses -> {
                val status = StatusRit.dari(hasil.data.status) ?: transisi.ke
                ritDao.perbaruiStatus(ritId, status.name, System.currentTimeMillis())
                HasilAksi.Terkirim(status)
            }

            Hasil.Offline -> {
                antrian.antreStatus(ritId, transisi.ke.name, json.encodeToString(permintaan), fotoPath)
                HasilAksi.Diantrikan
            }

            is Hasil.Galat -> {
                if (hasil.kode == 409) segarkan()
                HasilAksi.Ditolak(hasil.pesan, perluSegarkan = hasil.kode == 409)
            }
        }
    }

    suspend fun laporKendala(
        ritId: String,
        jenis: JenisKendala,
        catatan: String,
        fotoPath: String?,
        lokasi: TitikGps?,
    ): HasilAksi {
        val fotoUrl = fotoPath?.let { path ->
            when (val unggah = sumber.unggahFoto(java.io.File(path))) {
                is Hasil.Sukses -> unggah.data.url
                Hasil.Offline -> null
                is Hasil.Galat -> return HasilAksi.Ditolak(unggah.pesan, perluSegarkan = false)
            }
        }

        val permintaan = KendalaReq(
            jenis = jenis.name,
            catatan = catatan,
            fotoUrl = fotoUrl,
            lat = lokasi?.lat,
            lng = lokasi?.lng,
        )

        if (fotoPath != null && fotoUrl == null) {
            antrian.antreKendala(ritId, json.encodeToString(permintaan), fotoPath, System.currentTimeMillis())
            return HasilAksi.Diantrikan
        }

        return when (val hasil = sumber.laporKendala(ritId, permintaan)) {
            is Hasil.Sukses -> {
                ritDao.perbaruiStatus(ritId, StatusRit.KENDALA.name, System.currentTimeMillis())
                HasilAksi.Terkirim(StatusRit.KENDALA)
            }

            Hasil.Offline -> {
                antrian.antreKendala(ritId, json.encodeToString(permintaan), fotoPath, System.currentTimeMillis())
                HasilAksi.Diantrikan
            }

            is Hasil.Galat -> {
                if (hasil.kode == 409) segarkan()
                HasilAksi.Ditolak(hasil.pesan, perluSegarkan = hasil.kode == 409)
            }
        }
    }

    /** Dipanggil layanan pelacakan; titik selalu lewat antrian supaya tidak hilang. */
    suspend fun catatTitik(ritId: String, titik: TitikGps) {
        antrian.antreTitik(ritId, titik.lat, titik.lng, titik.akurasi, titik.waktu)
    }
}

package id.apn.supir.data.antrian

import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import id.apn.supir.data.lokal.AksiDao
import id.apn.supir.data.lokal.AksiTertundaEntity
import id.apn.supir.data.lokal.JenisAksi
import id.apn.supir.data.lokal.TitikDao
import id.apn.supir.data.lokal.TitikTertundaEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Antrian aksi offline.
 *
 * Id baris dibuat deterministik dari (rit, jenis, sasaran) dan ditulis dengan
 * strategi IGNORE: supir yang menekan tombol dua kali karena layar belum
 * berubah tidak pernah menghasilkan dua kiriman.
 */
@Singleton
class Antrian @Inject constructor(
    private val aksiDao: AksiDao,
    private val titikDao: TitikDao,
    private val workManager: WorkManager,
) {

    val jumlahTertunda: Flow<Int> = aksiDao.jumlah()

    /** Status yang sudah ditekan supir tetapi belum diterima server. */
    val sasaranTertunda: Flow<Set<String>> = aksiDao.alirkan().map { daftar ->
        daftar.filter { it.jenis == JenisAksi.STATUS }.map { it.sasaran() }.toSet()
    }

    suspend fun antreStatus(ritId: String, ke: String, muatanJson: String, fotoPath: String?) {
        tambah(
            AksiTertundaEntity(
                id = "$ritId|STATUS|$ke",
                ritId = ritId,
                jenis = JenisAksi.STATUS,
                muatanJson = muatanJson,
                fotoPath = fotoPath,
                dibuatPada = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun antreKendala(ritId: String, muatanJson: String, fotoPath: String?, cap: Long) {
        tambah(
            AksiTertundaEntity(
                id = "$ritId|KENDALA|$cap",
                ritId = ritId,
                jenis = JenisAksi.KENDALA,
                muatanJson = muatanJson,
                fotoPath = fotoPath,
                dibuatPada = cap,
            ),
        )
    }

    suspend fun antreTitik(ritId: String, lat: Double, lng: Double, akurasi: Float?, waktu: Long) {
        titikDao.tambah(TitikTertundaEntity(ritId = ritId, lat = lat, lng = lng, akurasi = akurasi, waktu = waktu))
        picu()
    }

    private suspend fun tambah(aksi: AksiTertundaEntity) {
        aksiDao.tambah(aksi)
        picu()
    }

    /** Menjadwalkan pengiriman; WorkManager yang menunggu jaringan kembali. */
    fun picu() {
        workManager.enqueueUniqueWork(
            NAMA_KERJA,
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<PengirimAksiWorker>()
                .setConstraints(
                    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build(),
        )
    }

    companion object {
        const val NAMA_KERJA = "kirim-aksi-apn"
    }
}

/** Sasaran status pada id deterministik `rit|STATUS|KE`. */
fun AksiTertundaEntity.sasaran(): String = id.substringAfterLast('|')

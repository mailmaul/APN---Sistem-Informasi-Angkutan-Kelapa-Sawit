package id.apn.supir.data.lokal

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "preferensi_apn")

/** Preferensi non-rahasia; yang rahasia ada di SesiStore (terenkripsi). */
@Singleton
class Preferensi @Inject constructor(@param:ApplicationContext private val context: Context) {

    /** Pengajuan yang sedang ditunggu, supaya layar menunggu bisa dipulihkan. */
    val idPengajuanAktif: Flow<String?> =
        context.dataStore.data.map { it[KUNCI_PENGAJUAN] }

    /** Sudah pernah diminta mematikan optimasi baterai. */
    val bateraiSudahDiminta: Flow<Boolean> =
        context.dataStore.data.map { it[KUNCI_BATERAI] ?: false }

    suspend fun simpanPengajuanAktif(id: String?) {
        context.dataStore.edit { pref ->
            if (id == null) pref.remove(KUNCI_PENGAJUAN) else pref[KUNCI_PENGAJUAN] = id
        }
    }

    suspend fun tandaiBateraiDiminta() {
        context.dataStore.edit { it[KUNCI_BATERAI] = true }
    }

    private companion object {
        val KUNCI_PENGAJUAN = stringPreferencesKey("pengajuan_aktif")
        val KUNCI_BATERAI = booleanPreferencesKey("baterai_diminta")
    }
}

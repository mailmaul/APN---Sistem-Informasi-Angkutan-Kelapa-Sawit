package id.apn.supir.data.jaringan

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Penyimpanan sesi di keystore perangkat.
 *
 * Backend hari ini mengembalikan sesi sebagai cookie `apn_session`; nilainya
 * disimpan di sini dan dipasang kembali oleh [InterceptorSesi]. Begitu server
 * mengirim `token` di badan balasan, nilai itu dipakai sebagai Bearer tanpa
 * perubahan lain. Password tidak pernah disimpan.
 */
@Singleton
class SesiStore @Inject constructor(@param:ApplicationContext context: Context) {

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "sesi_apn",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    private val _masuk = MutableStateFlow(prefs.getString(KUNCI_COOKIE, null) != null)

    /** Apakah ada sesi tersimpan. Dipakai navigasi untuk memilih layar awal. */
    val masuk: StateFlow<Boolean> = _masuk.asStateFlow()

    var cookieSesi: String?
        get() = prefs.getString(KUNCI_COOKIE, null)
        private set(value) {
            prefs.edit().apply { if (value == null) remove(KUNCI_COOKIE) else putString(KUNCI_COOKIE, value) }.apply()
        }

    var tokenBearer: String?
        get() = prefs.getString(KUNCI_TOKEN, null)
        private set(value) {
            prefs.edit().apply { if (value == null) remove(KUNCI_TOKEN) else putString(KUNCI_TOKEN, value) }.apply()
        }

    var idSupir: String?
        get() = prefs.getString(KUNCI_ID, null)
        private set(value) {
            prefs.edit().apply { if (value == null) remove(KUNCI_ID) else putString(KUNCI_ID, value) }.apply()
        }

    var namaSupir: String?
        get() = prefs.getString(KUNCI_NAMA, null)
        private set(value) {
            prefs.edit().apply { if (value == null) remove(KUNCI_NAMA) else putString(KUNCI_NAMA, value) }.apply()
        }

    fun simpanSesi(cookie: String?, token: String?, id: String, nama: String) {
        if (cookie != null) cookieSesi = cookie
        tokenBearer = token
        idSupir = id
        namaSupir = nama
        _masuk.value = cookieSesi != null || token != null
    }

    /** Dipanggil interceptor saat server memperbarui cookie sesi. */
    fun simpanCookieDariBalasan(cookie: String) {
        cookieSesi = cookie
        _masuk.value = true
    }

    fun hapus() {
        prefs.edit().clear().apply()
        _masuk.value = false
    }

    private companion object {
        const val KUNCI_COOKIE = "cookie_sesi"
        const val KUNCI_TOKEN = "token_bearer"
        const val KUNCI_ID = "id_supir"
        const val KUNCI_NAMA = "nama_supir"
    }
}

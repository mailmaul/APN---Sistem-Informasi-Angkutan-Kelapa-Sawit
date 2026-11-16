package id.apn.supir.ui.layar.akun

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanMasuk(
    val identitas: String = "",
    val password: String = "",
    val galatIdentitas: String? = null,
    val galatPassword: String? = null,
    val galat: String? = null,
    val offline: Boolean = false,
    val sedangKirim: Boolean = false,
    val berhasil: Boolean = false,
)

@HiltViewModel
class VmMasuk @Inject constructor(private val repo: RepoAuth) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanMasuk())
    val keadaan = _keadaan.asStateFlow()

    fun ubahIdentitas(nilai: String) {
        _keadaan.value = _keadaan.value.copy(identitas = nilai, galatIdentitas = null, galat = null)
    }

    fun ubahPassword(nilai: String) {
        _keadaan.value = _keadaan.value.copy(password = nilai, galatPassword = null, galat = null)
    }

    fun masuk() {
        val sekarang = _keadaan.value
        // Validasi di perangkat hanya untuk mencegah permintaan sia-sia; server
        // tetap pemutus dan pesannya yang ditampilkan.
        val galatIdentitas = if (sekarang.identitas.trim().length < 3) "Isi username atau nomor HP" else null
        val galatPassword = if (sekarang.password.isEmpty()) "Password wajib diisi" else null
        if (galatIdentitas != null || galatPassword != null) {
            _keadaan.value = sekarang.copy(galatIdentitas = galatIdentitas, galatPassword = galatPassword)
            return
        }

        _keadaan.value = sekarang.copy(sedangKirim = true, galat = null, offline = false)
        viewModelScope.launch {
            when (val hasil = repo.masuk(sekarang.identitas, sekarang.password)) {
                is Hasil.Sukses -> _keadaan.value = _keadaan.value.copy(sedangKirim = false, berhasil = true)
                is Hasil.Galat -> _keadaan.value =
                    _keadaan.value.copy(sedangKirim = false, galat = hasil.pesan)

                Hasil.Offline -> _keadaan.value = _keadaan.value.copy(
                    sedangKirim = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Masuk butuh jaringan sekali saja — " +
                        "cari titik bersinyal lalu coba lagi.",
                )
            }
        }
    }
}

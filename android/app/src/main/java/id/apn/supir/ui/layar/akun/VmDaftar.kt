package id.apn.supir.ui.layar.akun

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoPengajuan
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanDaftar(
    val nama: String = "",
    val hp: String = "",
    val password: String = "",
    val noSim: String = "",
    val nopol: String = "",
    val galatNama: String? = null,
    val galatHp: String? = null,
    val galatPassword: String? = null,
    val galatSim: String? = null,
    val galat: String? = null,
    val offline: Boolean = false,
    val sedangKirim: Boolean = false,
    val terkirim: Boolean = false,
)

@HiltViewModel
class VmDaftar @Inject constructor(private val repo: RepoPengajuan) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanDaftar())
    val keadaan = _keadaan.asStateFlow()

    fun ubahNama(v: String) = perbarui { it.copy(nama = v, galatNama = null) }
    fun ubahHp(v: String) = perbarui { it.copy(hp = v.filter { c -> c.isDigit() || c == '+' }, galatHp = null) }
    fun ubahPassword(v: String) = perbarui { it.copy(password = v, galatPassword = null) }
    fun ubahSim(v: String) = perbarui { it.copy(noSim = v, galatSim = null) }
    fun ubahNopol(v: String) = perbarui { it.copy(nopol = v.uppercase()) }

    private fun perbarui(blok: (KeadaanDaftar) -> KeadaanDaftar) {
        _keadaan.value = blok(_keadaan.value).copy(galat = null)
    }

    fun kirim() {
        val k = _keadaan.value
        val tervalidasi = k.copy(
            galatNama = if (k.nama.trim().length < 3) "Isi nama lengkap sesuai SIM" else null,
            galatHp = if (k.hp.length < 9) "Nomor HP belum lengkap" else null,
            galatPassword = if (k.password.length < 6) "Password minimal 6 karakter" else null,
            galatSim = if (k.noSim.trim().length < 5) "Isi nomor SIM" else null,
        )
        _keadaan.value = tervalidasi
        if (listOfNotNull(
                tervalidasi.galatNama,
                tervalidasi.galatHp,
                tervalidasi.galatPassword,
                tervalidasi.galatSim,
            ).isNotEmpty()
        ) {
            return
        }

        _keadaan.value = tervalidasi.copy(sedangKirim = true, galat = null, offline = false)
        viewModelScope.launch {
            val hasil = repo.daftar(
                nama = k.nama.trim(),
                hp = k.hp.trim(),
                password = k.password,
                noSim = k.noSim.trim(),
                nopol = k.nopol.trim().ifBlank { null },
            )
            _keadaan.value = when (hasil) {
                is Hasil.Sukses -> _keadaan.value.copy(sedangKirim = false, terkirim = true)
                is Hasil.Galat -> _keadaan.value.copy(sedangKirim = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangKirim = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Pendaftaran butuh jaringan — coba lagi di titik bersinyal.",
                )
            }
        }
    }
}

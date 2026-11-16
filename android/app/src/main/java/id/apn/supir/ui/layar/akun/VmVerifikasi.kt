package id.apn.supir.ui.layar.akun

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoPengajuan
import id.apn.supir.domain.StatusVerifikasi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanVerifikasi(
    val status: StatusVerifikasi? = null,
    val alasanTolak: String? = null,
    val sedangMuat: Boolean = true,
    val galat: String? = null,
    val offline: Boolean = false,
)

@HiltViewModel
class VmVerifikasi @Inject constructor(private val repo: RepoPengajuan) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanVerifikasi())
    val keadaan = _keadaan.asStateFlow()

    init {
        muat()
    }

    fun muat() {
        _keadaan.value = _keadaan.value.copy(sedangMuat = true, galat = null, offline = false)
        viewModelScope.launch {
            _keadaan.value = when (val hasil = repo.muatPo()) {
                is Hasil.Sukses -> _keadaan.value.copy(
                    sedangMuat = false,
                    status = hasil.data.supir.statusVerifikasi,
                    alasanTolak = hasil.data.supir.alasanTolak,
                )

                is Hasil.Galat -> _keadaan.value.copy(sedangMuat = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangMuat = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Status verifikasi hanya bisa diperiksa saat ada jaringan.",
                )
            }
        }
    }
}

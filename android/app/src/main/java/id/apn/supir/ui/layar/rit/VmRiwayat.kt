package id.apn.supir.ui.layar.rit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.domain.RitRiwayat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanRiwayat(
    val rit: List<RitRiwayat> = emptyList(),
    val sedangMuat: Boolean = true,
    val galat: String? = null,
    val offline: Boolean = false,
)

@HiltViewModel
class VmRiwayat @Inject constructor(private val repo: RepoRit) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanRiwayat())
    val keadaan = _keadaan.asStateFlow()

    init {
        muat()
    }

    fun muat() {
        _keadaan.value = _keadaan.value.copy(sedangMuat = true, galat = null, offline = false)
        viewModelScope.launch {
            _keadaan.value = when (val hasil = repo.riwayat()) {
                is Hasil.Sukses -> _keadaan.value.copy(sedangMuat = false, rit = hasil.data)
                is Hasil.Galat -> _keadaan.value.copy(sedangMuat = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangMuat = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Riwayat hanya bisa dibuka saat ada jaringan.",
                )
            }
        }
    }
}

package id.apn.supir.ui.layar.rit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.repo.RepoAuth
import id.apn.supir.data.repo.RepoRit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanPengaturan(
    val nama: String = "",
    val jumlahTertunda: Int = 0,
    val sudahKeluar: Boolean = false,
)

@HiltViewModel
class VmPengaturan @Inject constructor(
    private val repoAuth: RepoAuth,
    repoRit: RepoRit,
) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanPengaturan(nama = repoAuth.nama ?: "Supir"))
    val keadaan = _keadaan.asStateFlow()

    init {
        viewModelScope.launch {
            repoRit.jumlahTertunda.collect { jumlah ->
                _keadaan.value = _keadaan.value.copy(jumlahTertunda = jumlah)
            }
        }
    }

    fun keluar() {
        viewModelScope.launch {
            repoAuth.keluar()
            _keadaan.value = _keadaan.value.copy(sudahKeluar = true)
        }
    }
}

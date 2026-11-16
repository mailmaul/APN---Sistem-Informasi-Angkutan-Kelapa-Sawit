package id.apn.supir.ui.navigasi

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.repo.RepoAuth
import id.apn.supir.data.repo.RepoPengajuan
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanAplikasi(
    val siap: Boolean = false,
    val sudahMasuk: Boolean = false,
    /** Pengajuan yang belum diputuskan; layar menunggu dipulihkan ke sini. */
    val pengajuanTertunda: String? = null,
)

/**
 * Memutuskan layar pertama sekali saat aplikasi dibuka. Splash ditahan sampai
 * [KeadaanAplikasi.siap] supaya supir tidak melihat layar masuk berkedip
 * sebelum sesi tersimpan terbaca.
 */
@HiltViewModel
class VmAplikasi @Inject constructor(
    repoAuth: RepoAuth,
    repoPengajuan: RepoPengajuan,
) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanAplikasi())
    val keadaan: StateFlow<KeadaanAplikasi> = _keadaan.asStateFlow()

    init {
        viewModelScope.launch {
            val masuk = repoAuth.sudahMasuk.value
            val pengajuan = if (masuk) repoPengajuan.idPengajuanAktif.first() else null
            _keadaan.value = KeadaanAplikasi(siap = true, sudahMasuk = masuk, pengajuanTertunda = pengajuan)
        }
    }
}

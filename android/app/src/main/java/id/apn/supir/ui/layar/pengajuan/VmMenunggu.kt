package id.apn.supir.ui.layar.pengajuan

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoPengajuan
import id.apn.supir.domain.Pengajuan
import id.apn.supir.domain.StatusPengajuan
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanMenunggu(
    val pengajuan: Pengajuan? = null,
    val sedangMuat: Boolean = true,
    val galat: String? = null,
    val offline: Boolean = false,
)

/**
 * Memantau pengajuan sampai kantor memutuskan.
 *
 * Polling, bukan push: FCM belum tersambung, dan supir yang menatap layar ini
 * memang sedang menunggu. Loop berhenti sendiri begitu status berubah atau
 * ViewModel dibersihkan.
 */
@HiltViewModel
class VmMenunggu @Inject constructor(
    private val repo: RepoPengajuan,
    simpanan: SavedStateHandle,
) : ViewModel() {

    private val pengajuanId: String = checkNotNull(simpanan["pengajuanId"])

    private val _keadaan = MutableStateFlow(KeadaanMenunggu())
    val keadaan = _keadaan.asStateFlow()

    init {
        viewModelScope.launch {
            while (true) {
                periksa()
                val status = _keadaan.value.pengajuan?.status
                if (status != null && status != StatusPengajuan.DIAJUKAN) break
                delay(JEDA_PANTAU_MS)
            }
        }
    }

    fun periksaSekarang() {
        viewModelScope.launch { periksa() }
    }

    private suspend fun periksa() {
        _keadaan.value = _keadaan.value.copy(galat = null, offline = false)
        _keadaan.value = when (val hasil = repo.pantau(pengajuanId)) {
            is Hasil.Sukses -> _keadaan.value.copy(sedangMuat = false, pengajuan = hasil.data)
            is Hasil.Galat -> _keadaan.value.copy(sedangMuat = false, galat = hasil.pesan)
            Hasil.Offline -> _keadaan.value.copy(
                sedangMuat = false,
                offline = true,
                galat = "Tidak ada sinyal. Status persetujuan diperiksa lagi otomatis.",
            )
        }
    }

    fun batalkanPantauan() {
        viewModelScope.launch { repo.lupakanPengajuan() }
    }

    private companion object {
        const val JEDA_PANTAU_MS = 10_000L
    }
}

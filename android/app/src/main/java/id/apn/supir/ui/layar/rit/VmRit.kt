package id.apn.supir.ui.layar.rit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.repo.HasilAksi
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.StatusRit
import id.apn.supir.domain.TitikGps
import id.apn.supir.domain.Transisi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanRit(
    val rit: RitAktif? = null,
    val statusTertunda: Set<StatusRit> = emptySet(),
    val jumlahTertunda: Int = 0,
    val sedangMuat: Boolean = true,
    val sedangKirim: Boolean = false,
    val pesan: String? = null,
    val pesanOffline: Boolean = false,
    val gpsAktif: Boolean = false,
    /** Transisi yang menunggu foto; kamera dibuka untuk ini. */
    val menungguFoto: Transisi? = null,
)

@HiltViewModel
class VmRit @Inject constructor(private val repo: RepoRit) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanRit())
    val keadaan = _keadaan.asStateFlow()

    init {
        viewModelScope.launch {
            // Cache Room yang masih kosong bukan berarti supir tidak punya rit:
            // layar baru boleh menyimpulkan itu setelah satu kali segarkan.
            repo.ritAktif.collect { rit ->
                _keadaan.value = _keadaan.value.copy(rit = rit)
            }
        }
        viewModelScope.launch {
            repo.statusTertunda.collect { daftar ->
                _keadaan.value = _keadaan.value.copy(statusTertunda = daftar)
            }
        }
        viewModelScope.launch {
            repo.jumlahTertunda.collect { jumlah ->
                _keadaan.value = _keadaan.value.copy(jumlahTertunda = jumlah)
            }
        }
        segarkan()
    }

    fun segarkan() {
        viewModelScope.launch {
            repo.segarkan()
            _keadaan.value = _keadaan.value.copy(sedangMuat = false)
        }
    }

    fun tandaiGps(aktif: Boolean) {
        _keadaan.value = _keadaan.value.copy(gpsAktif = aktif)
    }

    fun hapusPesan() {
        _keadaan.value = _keadaan.value.copy(pesan = null, pesanOffline = false)
    }

    /** Transisi berfoto ditahan dulu sampai kamera mengembalikan berkas. */
    fun mintaFoto(transisi: Transisi) {
        _keadaan.value = _keadaan.value.copy(menungguFoto = transisi, pesan = null)
    }

    fun batalFoto() {
        _keadaan.value = _keadaan.value.copy(menungguFoto = null)
    }

    fun jalankan(transisi: Transisi, fotoPath: String?, lokasi: TitikGps?) {
        val rit = _keadaan.value.rit ?: return
        _keadaan.value = _keadaan.value.copy(sedangKirim = true, menungguFoto = null, pesan = null)

        viewModelScope.launch {
            val hasil = repo.majukan(
                ritId = rit.id,
                dari = rit.status,
                transisi = transisi,
                fotoPath = fotoPath,
                lokasi = lokasi,
            )
            _keadaan.value = when (hasil) {
                is HasilAksi.Terkirim -> _keadaan.value.copy(sedangKirim = false)
                HasilAksi.Diantrikan -> _keadaan.value.copy(
                    sedangKirim = false,
                    pesan = "Tersimpan di HP. Terkirim otomatis saat ada sinyal — " +
                        "tidak perlu menekan dua kali.",
                    pesanOffline = true,
                )

                is HasilAksi.Ditolak -> {
                    if (hasil.perluSegarkan) segarkan()
                    _keadaan.value.copy(sedangKirim = false, pesan = hasil.pesan, pesanOffline = false)
                }
            }
        }
    }
}

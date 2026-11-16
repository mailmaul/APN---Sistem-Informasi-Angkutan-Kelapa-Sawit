package id.apn.supir.ui.layar.rit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.repo.HasilAksi
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.domain.JenisKendala
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.TitikGps
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanKendala(
    val rit: RitAktif? = null,
    val jenis: JenisKendala = JenisKendala.MOGOK,
    val catatan: String = "",
    val fotoPath: String? = null,
    val sedangMemotret: Boolean = false,
    val sedangKirim: Boolean = false,
    val galat: String? = null,
    val offline: Boolean = false,
    val selesai: Boolean = false,
) {
    val catatanCukup: Boolean get() = catatan.trim().length >= 5
}

@HiltViewModel
class VmKendala @Inject constructor(private val repo: RepoRit) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanKendala())
    val keadaan = _keadaan.asStateFlow()

    init {
        viewModelScope.launch {
            repo.ritAktif.collect { rit -> _keadaan.value = _keadaan.value.copy(rit = rit) }
        }
    }

    fun pilihJenis(jenis: JenisKendala) {
        _keadaan.value = _keadaan.value.copy(jenis = jenis)
    }

    fun ubahCatatan(teks: String) {
        _keadaan.value = _keadaan.value.copy(catatan = teks, galat = null)
    }

    fun bukaKamera() {
        _keadaan.value = _keadaan.value.copy(sedangMemotret = true)
    }

    fun batalKamera() {
        _keadaan.value = _keadaan.value.copy(sedangMemotret = false)
    }

    fun simpanFoto(path: String) {
        _keadaan.value = _keadaan.value.copy(fotoPath = path, sedangMemotret = false)
    }

    fun kirim(lokasi: TitikGps?) {
        val k = _keadaan.value
        val rit = k.rit ?: return
        if (!k.catatanCukup) {
            _keadaan.value = k.copy(galat = "Ceritakan kendalanya minimal 5 huruf")
            return
        }

        _keadaan.value = k.copy(sedangKirim = true, galat = null, offline = false)
        viewModelScope.launch {
            val hasil = repo.laporKendala(
                ritId = rit.id,
                jenis = k.jenis,
                catatan = k.catatan.trim(),
                fotoPath = k.fotoPath,
                lokasi = lokasi,
            )
            _keadaan.value = when (hasil) {
                is HasilAksi.Terkirim -> _keadaan.value.copy(sedangKirim = false, selesai = true)
                // Kendala yang tersimpan offline tetap dianggap selesai dilaporkan:
                // supir sedang mogok, menahannya di layar ini tidak membantu.
                HasilAksi.Diantrikan -> _keadaan.value.copy(
                    sedangKirim = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Laporan tersimpan dan terkirim otomatis.",
                    selesai = true,
                )

                is HasilAksi.Ditolak -> _keadaan.value.copy(sedangKirim = false, galat = hasil.pesan)
            }
        }
    }
}

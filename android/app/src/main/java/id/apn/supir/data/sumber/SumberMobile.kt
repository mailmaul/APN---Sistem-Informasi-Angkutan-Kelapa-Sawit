package id.apn.supir.data.sumber

import id.apn.supir.data.jaringan.ApiApn
import id.apn.supir.data.jaringan.DaftarReq
import id.apn.supir.data.jaringan.DaftarRes
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.jaringan.KendalaReq
import id.apn.supir.data.jaringan.KendalaRes
import id.apn.supir.data.jaringan.PengajuanDto
import id.apn.supir.data.jaringan.PoAktifRes
import id.apn.supir.data.jaringan.RitAktifRes
import id.apn.supir.data.jaringan.RiwayatRes
import id.apn.supir.data.jaringan.StatusReq
import id.apn.supir.data.jaringan.StatusRes
import id.apn.supir.data.jaringan.TrackReq
import id.apn.supir.data.jaringan.TrackRes
import id.apn.supir.data.jaringan.UnggahRes
import id.apn.supir.data.jaringan.panggil
import id.apn.supir.domain.FormPengajuan
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import javax.inject.Inject

/**
 * Seluruh percakapan aplikasi supir dengan backend.
 *
 * Dipisah di balik antarmuka karena `api/mobile/…` belum ada di server:
 * selama itu [SumberMobilePalsu] yang melayani, tanpa menyentuh repository,
 * ViewModel, maupun layar. Login tetap memakai server sungguhan.
 */
interface SumberMobile {
    suspend fun daftar(req: DaftarReq): Hasil<DaftarRes>
    suspend fun poAktif(): Hasil<PoAktifRes>
    suspend fun ajukanDo(form: FormPengajuan): Hasil<PengajuanDto>
    suspend fun pengajuan(id: String): Hasil<PengajuanDto>
    suspend fun ritAktif(): Hasil<RitAktifRes>
    suspend fun riwayat(): Hasil<RiwayatRes>

    suspend fun majukanStatus(ritId: String, req: StatusReq): Hasil<StatusRes>
    suspend fun laporKendala(ritId: String, req: KendalaReq): Hasil<KendalaRes>
    suspend fun kirimTitik(ritId: String, req: TrackReq): Hasil<TrackRes>
    suspend fun unggahFoto(berkas: File): Hasil<UnggahRes>
}

class SumberMobileJaringan @Inject constructor(private val api: ApiApn) : SumberMobile {

    override suspend fun daftar(req: DaftarReq) = panggil { api.daftar(req) }

    override suspend fun poAktif() = panggil { api.poAktif() }

    override suspend fun ajukanDo(form: FormPengajuan): Hasil<PengajuanDto> {
        val teks = "text/plain".toMediaType()
        val berkas = File(form.fotoSelfiePath)
        val bagian = MultipartBody.Part.createFormData(
            "selfie",
            berkas.name,
            berkas.asRequestBody("image/jpeg".toMediaType()),
        )
        return panggil {
            api.ajukanDo(
                kontrakId = form.kontrakId.toRequestBody(teks),
                nama = form.nama.toRequestBody(teks),
                nopol = form.nopol.toRequestBody(teks),
                noSim = form.noSim.toRequestBody(teks),
                noHp = form.noHp.toRequestBody(teks),
                selfie = bagian,
            )
        }
    }

    override suspend fun pengajuan(id: String) = panggil { api.pengajuan(id) }

    override suspend fun ritAktif() = panggil { api.ritAktif() }

    override suspend fun riwayat() = panggil { api.riwayat() }

    override suspend fun majukanStatus(ritId: String, req: StatusReq) =
        panggil { api.majukanStatus(ritId, req) }

    override suspend fun laporKendala(ritId: String, req: KendalaReq) =
        panggil { api.laporKendala(ritId, req) }

    override suspend fun kirimTitik(ritId: String, req: TrackReq) =
        panggil { api.kirimTitik(ritId, req) }

    override suspend fun unggahFoto(berkas: File): Hasil<UnggahRes> {
        val bagian = MultipartBody.Part.createFormData(
            "file",
            berkas.name,
            berkas.asRequestBody("image/jpeg".toMediaType()),
        )
        return panggil { api.unggahFoto(bagian) }
    }
}

package id.apn.supir.data.jaringan

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

/**
 * Endpoint yang sudah hidup di backend web dipakai apa adanya; endpoint
 * `api/mobile/…` adalah kontrak khusus aplikasi yang sedang dibangun server.
 *
 * Semua pemanggilan memakai `Response<T>` supaya badan galat `{ "error": ... }`
 * bisa dibaca dan ditampilkan apa adanya ke supir.
 */
interface ApiApn {

    @POST("api/auth/login")
    suspend fun masuk(@Body body: MasukReq): Response<MasukRes>

    @POST("api/auth/logout")
    suspend fun keluar(): Response<Unit>

    @POST("api/rit/{id}/status")
    suspend fun majukanStatus(@Path("id") ritId: String, @Body body: StatusReq): Response<StatusRes>

    @POST("api/rit/{id}/track")
    suspend fun kirimTitik(@Path("id") ritId: String, @Body body: TrackReq): Response<TrackRes>

    @POST("api/rit/{id}/kendala")
    suspend fun laporKendala(@Path("id") ritId: String, @Body body: KendalaReq): Response<KendalaRes>

    @Multipart
    @POST("api/upload")
    suspend fun unggahFoto(@Part file: MultipartBody.Part): Response<UnggahRes>

    // ── Kontrak mobile (menyusul di server) ──

    @POST("api/mobile/daftar")
    suspend fun daftar(@Body body: DaftarReq): Response<DaftarRes>

    @GET("api/mobile/po-aktif")
    suspend fun poAktif(): Response<PoAktifRes>

    @Multipart
    @POST("api/mobile/pengajuan")
    suspend fun ajukanDo(
        @Part("kontrakId") kontrakId: okhttp3.RequestBody,
        @Part("nama") nama: okhttp3.RequestBody,
        @Part("nopol") nopol: okhttp3.RequestBody,
        @Part("noSim") noSim: okhttp3.RequestBody,
        @Part("noHp") noHp: okhttp3.RequestBody,
        @Part selfie: MultipartBody.Part,
    ): Response<PengajuanDto>

    @GET("api/mobile/pengajuan/{id}")
    suspend fun pengajuan(@Path("id") id: String): Response<PengajuanDto>

    @GET("api/mobile/rit-aktif")
    suspend fun ritAktif(): Response<RitAktifRes>

    @GET("api/mobile/riwayat")
    suspend fun riwayat(): Response<RiwayatRes>
}

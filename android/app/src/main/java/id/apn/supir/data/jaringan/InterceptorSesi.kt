package id.apn.supir.data.jaringan

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Memasang sesi pada setiap permintaan dan menangkap cookie `apn_session` dari
 * balasan login. Jembatan sementara sampai backend mengirim token di badan —
 * lihat docs/PERMINTAAN-BACKEND.md.
 */
@Singleton
class InterceptorSesi @Inject constructor(private val sesi: SesiStore) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val asli = chain.request()
        val pembangun = asli.newBuilder()
        sesi.cookieSesi?.let { pembangun.header("Cookie", "$NAMA_COOKIE=$it") }
        sesi.tokenBearer?.let { pembangun.header("Authorization", "Bearer $it") }

        val respons = chain.proceed(pembangun.build())

        respons.headers("Set-Cookie")
            .firstOrNull { it.startsWith("$NAMA_COOKIE=") }
            ?.substringAfter("$NAMA_COOKIE=")
            ?.substringBefore(';')
            ?.takeIf { it.isNotBlank() }
            ?.let { sesi.simpanCookieDariBalasan(it) }

        return respons
    }

    private companion object {
        const val NAMA_COOKIE = "apn_session"
    }
}

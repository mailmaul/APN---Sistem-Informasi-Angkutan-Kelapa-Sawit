# Aturan R8 untuk rilis.
#
# Sebagian besar pustaka (Retrofit, OkHttp, Room, Hilt) sudah membawa aturannya
# sendiri lewat consumer rules; yang ditulis di sini hanya yang tidak bisa
# disimpulkan R8 dari kode.

# kotlinx.serialization: serializer dihasilkan sebagai anggota statis dan hanya
# dirujuk lewat refleksi saat tipe dipakai sebagai generic.
-keepattributes *Annotation*, InnerClasses, Signature, RuntimeVisible*Annotations
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
    static **$* *;
}
-keepclassmembers class **$* implements kotlinx.serialization.internal.GeneratedSerializer {
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}

# Antarmuka Retrofit dibaca lewat proxy dinamis, jadi tanda tangan generiknya
# harus utuh. Dipersempit ke paket jaringan aplikasi.
-keep,allowobfuscation interface id.apn.supir.data.jaringan.ApiApn { *; }

# Nama kelas Worker dipakai WorkManager untuk membuat instance dari antrian
# yang tersimpan di basis data — nama yang berubah membuat aksi lama gagal.
-keep class id.apn.supir.data.antrian.PengirimAksiWorker { *; }

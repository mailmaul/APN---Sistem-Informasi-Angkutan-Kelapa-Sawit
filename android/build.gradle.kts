// AGP 9.5.1 membawa KGP 2.2.10. Pustaka AndroidX (Compose 1.12) sudah dikompilasi
// dengan Kotlin 2.4 (metadata 2.4.0) sehingga compiler 2.2 menolaknya; KGP dinaikkan
// ke 2.3.20 — versi Kotlin yang dipakai KSP 2.3.14 — lewat jalur resmi buildscript.
// Angka di bawah WAJIB sama dengan `kotlin` dan `ksp` di gradle/libs.versions.toml.
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.20")
        classpath("com.google.devtools.ksp:symbol-processing-gradle-plugin:2.3.14")
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}

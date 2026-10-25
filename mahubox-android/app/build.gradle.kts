plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "cards.mahu.box"
    compileSdk = 34

    defaultConfig {
        applicationId = "cards.mahu.box"
        // Box TV Android : souvent Android 7 a 11.
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "SITE", "\"https://call.mahu.cards\"")
    }

    signingConfigs {
        // Meme cle que MyFocus (myfocus-release.jks, hors git, uniquement sur le PC).
        create("release") {
            storeFile = file(System.getenv("MYFOCUS_KEYSTORE") ?: "../../myfocus-android/myfocus-release.jks")
            storePassword = System.getenv("MYFOCUS_KEYSTORE_PASSWORD") ?: ""
            keyAlias = System.getenv("MYFOCUS_KEY_ALIAS") ?: "myfocus"
            keyPassword = System.getenv("MYFOCUS_KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

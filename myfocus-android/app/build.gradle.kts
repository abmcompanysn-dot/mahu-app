plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "cards.mahu.myfocus"
    compileSdk = 34

    defaultConfig {
        applicationId = "cards.mahu.myfocus"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "API_BASE", "\"https://ai-api.mahu.cards/api/myfocus\"")
    }

    signingConfigs {
        // Cle de signature locale (myfocus-release.jks, hors git) : garder la
        // MEME cle pour toutes les versions, sinon les mises a jour echouent.
        create("release") {
            storeFile = file(System.getenv("MYFOCUS_KEYSTORE") ?: "../myfocus-release.jks")
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

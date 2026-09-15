import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasReleaseKeystore =
    keystorePropertiesFile.isFile && run {
        keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
        keystoreProperties.getProperty("storeFile")?.isNotBlank() == true
    }

android {
    namespace = "com.learnsphere.learnsphere_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.learnsphere.learnsphere_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // livekit_client (flutter_webrtc) requires API 23.
        minSdk = maxOf(flutter.minSdkVersion, 23)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile")!!)
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

flutter {
    source = "../.."
}

afterEvaluate {
    // flutter run uses assembleDebug (not installDebug). Set up adb reverse so
    // API_BASE_URL=http://127.0.0.1:3000 works on a USB phone without a wrapper script.
    tasks.named("assembleDebug").configure {
        doLast {
            val tunnel =
                rootProject.projectDir.parentFile.resolve("scripts/ensure_android_api_tunnel.sh")
            if (!tunnel.isFile) return@doLast
            try {
                val result =
                    exec {
                        commandLine(tunnel.absolutePath)
                        isIgnoreExitValue = true
                    }
                if (result.exitValue != 0) {
                    logger.lifecycle(
                        "Android API tunnel skipped (no device or adb unavailable). " +
                            "Run ./scripts/ensure_android_api_tunnel.sh after connecting a phone.",
                    )
                }
            } catch (error: Exception) {
                logger.lifecycle("Android API tunnel skipped: ${error.message}")
            }
        }
    }

    tasks.named("assembleRelease").configure {
        doLast {
            val versionName = android.defaultConfig.versionName ?: "unknown"
            val apkDir = layout.buildDirectory.get().asFile.resolve("outputs/flutter-apk")
            val defaultApk = apkDir.resolve("app-release.apk")
            val brandedApk = apkDir.resolve("learn-sphere-$versionName.apk")
            if (defaultApk.isFile) {
                defaultApk.copyTo(brandedApk, overwrite = true)
            }
        }
    }
}

#!/usr/bin/env bash
# Minimal Android SDK build: Java + aapt2 + D8. No Gradle, npm or Google services.
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_SDK_ROOT:?Set ANDROID_SDK_ROOT to your Android SDK directory}"
bt="$ANDROID_SDK_ROOT/build-tools/35.0.0"
platform="$ANDROID_SDK_ROOT/platforms/android-35/android.jar"
mkdir -p build/classes build/dex
"$bt/aapt2" compile --dir app/src/main/res -o build/resources.zip
"$bt/aapt2" link -o build/base.apk -I "$platform" --manifest app/src/main/AndroidManifest.xml -A app/src/main/assets --min-sdk-version 26 --target-sdk-version 35 --version-code 160 --version-name 1.6.0 build/resources.zip
find app/src/main/java -name '*.java' > build/sources.txt
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$bt/core-lambda-stubs.jar:$platform" -d build/classes @build/sources.txt
jar cf build/classes.jar -C build/classes .
"$bt/d8" --min-api 26 --lib "$platform" --output build/dex build/classes.jar
cp build/base.apk build/unsigned.apk
(cd build/dex && zip -q ../unsigned.apk classes*.dex)
"$bt/zipalign" -f 4 build/unsigned.apk build/aligned.apk
# Use a persistent personal release key for distribution. The default is a test key.
keystore="${CREWLINE_KEYSTORE:-build/test.keystore}"
if [ "$keystore" = build/test.keystore ] && [ ! -f "$keystore" ]; then
 keytool -genkeypair -keystore "$keystore" -alias crewline -keyalg RSA -keysize 3072 -validity 10000 -storepass android -keypass android -dname 'CN=Crewline Test Build'
fi
export CREWLINE_STORE_PASSWORD="${CREWLINE_STORE_PASSWORD:-android}"
"$bt/apksigner" sign --ks "$keystore" --ks-key-alias "${CREWLINE_KEY_ALIAS:-crewline}" --ks-pass env:CREWLINE_STORE_PASSWORD --out build/crewline-android.apk build/aligned.apk
"$bt/apksigner" verify --verbose build/crewline-android.apk
printf 'APK: %s/build/crewline-android.apk\n' "$PWD"

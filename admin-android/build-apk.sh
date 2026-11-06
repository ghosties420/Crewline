#!/usr/bin/env bash
# Build the separate Crewline Admin Android app using the same SDK as Crewline.
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_SDK_ROOT:?Set ANDROID_SDK_ROOT to your Android SDK directory}"
bt="$ANDROID_SDK_ROOT/build-tools/35.0.0"
platform="$ANDROID_SDK_ROOT/platforms/android-35/android.jar"
mkdir -p build/classes build/dex
# Maintained JSch SSH2 library, pinned to an exact Maven Central release.
# It runs entirely inside this Android app/profile; no external SSH app is needed.
jsch="build/jsch-2.28.8.jar"
if [ ! -f "$jsch" ]; then
 curl --fail --location --silent --show-error \
  'https://repo.maven.apache.org/maven2/com/github/mwiede/jsch/2.28.8/jsch-2.28.8.jar' -o "$jsch"
fi
"$bt/aapt2" compile --dir app/src/main/res -o build/resources.zip
"$bt/aapt2" link -o build/base.apk -I "$platform" --manifest app/src/main/AndroidManifest.xml -A app/src/main/assets --min-sdk-version 26 --target-sdk-version 35 --version-code 1 --version-name 0.1.0 build/resources.zip
find app/src/main/java -name '*.java' > build/sources.txt
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$bt/core-lambda-stubs.jar:$platform" -classpath "$jsch" -d build/classes @build/sources.txt
jar cf build/classes.jar -C build/classes .
"$bt/d8" --min-api 26 --lib "$platform" --output build/dex build/classes.jar "$jsch"
cp build/base.apk build/unsigned.apk
(cd build/dex && zip -q ../unsigned.apk classes*.dex)
"$bt/zipalign" -f 4 build/unsigned.apk build/aligned.apk
# Separate local test identity. Never commit or distribute this key as production signing.
keystore="${CREWLINE_ADMIN_KEYSTORE:-build/test.keystore}"
if [ "$keystore" = build/test.keystore ] && [ ! -f "$keystore" ]; then
 keytool -genkeypair -keystore "$keystore" -alias crewline-admin -keyalg RSA -keysize 3072 -validity 10000 -storepass android -keypass android -dname 'CN=Crewline Admin Development'
fi
export CREWLINE_ADMIN_STORE_PASSWORD="${CREWLINE_ADMIN_STORE_PASSWORD:-android}"
"$bt/apksigner" sign --ks "$keystore" --ks-key-alias "${CREWLINE_ADMIN_KEY_ALIAS:-crewline-admin}" --ks-pass env:CREWLINE_ADMIN_STORE_PASSWORD --out build/crewline-admin.apk build/aligned.apk
"$bt/apksigner" verify --verbose build/crewline-admin.apk
printf 'APK: %s/build/crewline-admin.apk\n' "$PWD"

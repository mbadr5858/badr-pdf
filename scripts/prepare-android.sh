#!/usr/bin/env bash
# Copy the web build into the Android app, skipping pre-compressed files
# and the large Office-conversion engine to keep the APK small.
set -e
rm -rf dist-android
cp -r dist dist-android
rm -rf dist-android/libreoffice-wasm
find dist-android \( -name '*.br' -o -name '*.gz' \) -delete
du -sh dist-android

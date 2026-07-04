#!/bin/sh
# Minimal Maven Wrapper (only-script type): downloads and caches the pinned
# Maven distribution from .mvn/wrapper/maven-wrapper.properties, then execs it.
set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
WRAPPER_PROPERTIES="$BASE_DIR/.mvn/wrapper/maven-wrapper.properties"

DISTRIBUTION_URL=$(grep '^distributionUrl=' "$WRAPPER_PROPERTIES" | cut -d'=' -f2-)
ARCHIVE_NAME=$(basename "$DISTRIBUTION_URL")
DIST_DIR_NAME=$(echo "$ARCHIVE_NAME" | sed -E 's/-bin\.(zip|tar\.gz)$//')

CACHE_DIR="$HOME/.m2/wrapper/dists/$DIST_DIR_NAME"
MAVEN_HOME="$CACHE_DIR/$DIST_DIR_NAME"

if [ ! -x "$MAVEN_HOME/bin/mvn" ]; then
  mkdir -p "$CACHE_DIR"
  ARCHIVE_PATH="$CACHE_DIR/$ARCHIVE_NAME"
  echo "Downloading Maven distribution from $DISTRIBUTION_URL" >&2
  curl -fsSL -o "$ARCHIVE_PATH" "$DISTRIBUTION_URL"
  case "$ARCHIVE_NAME" in
    *.zip) unzip -q -o "$ARCHIVE_PATH" -d "$CACHE_DIR" ;;
    *.tar.gz) tar -xzf "$ARCHIVE_PATH" -C "$CACHE_DIR" ;;
    *) echo "Unsupported distribution archive: $ARCHIVE_NAME" >&2; exit 1 ;;
  esac
  rm -f "$ARCHIVE_PATH"
fi

exec "$MAVEN_HOME/bin/mvn" "$@"

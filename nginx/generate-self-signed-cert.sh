#!/usr/bin/env bash
# Generates a self-signed cert for local HTTPS testing.
# Swap this out for certbot-managed certs later (see nginx.conf comments).
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
  -addext "basicConstraints=critical,CA:FALSE" \
  -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth"

echo "Wrote nginx/certs/fullchain.pem and nginx/certs/privkey.pem"

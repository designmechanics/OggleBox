#!/bin/bash
# Generate a self-signed SSL/TLS certificate for OggleBox LAN access

CERT_DIR="$(pwd)/certs"
KEY_FILE="$CERT_DIR/server.key"
CRT_FILE="$CERT_DIR/server.crt"

mkdir -p "$CERT_DIR"

if [ -f "$KEY_FILE" ] && [ -f "$CRT_FILE" ]; then
    echo "[OK] SSL certificates already exist in $CERT_DIR"
    exit 0
fi

echo "Generating self-signed SSL certificate for LAN access..."

# Gather local IP addresses
LAN_IPS=()
if command -v ip &> /dev/null; then
    for ip in $(ip -4 addr | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1'); do
        LAN_IPS+=("IP:$ip")
    done
elif command -v hostname &> /dev/null; then
    for ip in $(hostname -I 2>/dev/null); do
        if [ "$ip" != "127.0.0.1" ]; then
            LAN_IPS+=("IP:$ip")
        fi
    done
fi

SAN="DNS:localhost,IP:127.0.0.1"
for ip_entry in "${LAN_IPS[@]}"; do
    SAN="$SAN,$ip_entry"
done

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CRT_FILE" \
  -subj "/CN=OggleBox LAN Server" \
  -addext "subjectAltName=$SAN" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[OK] Self-signed certificate generated successfully!"
    echo "  Private Key: $KEY_FILE"
    echo "  Certificate: $CRT_FILE"
    echo "  SANs: $SAN"
else
    # Fallback without -addext if older openssl
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout "$KEY_FILE" \
      -out "$CRT_FILE" \
      -subj "/CN=OggleBox LAN Server"
    echo "[OK] Self-signed certificate generated successfully (fallback)."
fi

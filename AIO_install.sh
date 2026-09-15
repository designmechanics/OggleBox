#!/bin/bash
echo "======================================================="
echo " OggleBox Server - AIO Install (macOS / Linux)"
echo "======================================================="
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not found."
    echo "Attempting to install Node.js via NVM (Node Version Manager)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
    echo "[OK] Node.js installed."
else
    echo "[OK] Node.js is installed: $(node -v)"
fi

# 2. Check Firewall (Linux ufw)
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "[!] Active ufw firewall detected. Allowing TCP port 3000..."
        sudo ufw allow 3000/tcp || echo "[!] Could not automatically allow port 3000 on ufw. Please ensure port 3000/tcp is open."
    fi
fi

# 3. Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "[!] FFmpeg not found. Attempting to install via package manager..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ffmpeg
        else
            echo "[ERROR] Homebrew not found! Please install Homebrew (https://brew.sh/) or install FFmpeg manually."
            exit 1
        fi
    elif command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command -v dnf &> /dev/null; then
        # Fedora/RHEL
        sudo dnf install -y ffmpeg
    elif command -v pacman &> /dev/null; then
        # Arch
        sudo pacman -S --noconfirm ffmpeg
    else
        echo "[ERROR] Unsupported package manager. Please install FFmpeg manually."
        exit 1
    fi
else
    echo "[OK] FFmpeg is installed."
fi

echo ""
echo "======================================================="
echo " Installing Node Dependencies (npm install)"
echo "======================================================="
npm install

echo ""
echo "======================================================="
echo " Building OggleBox (npm run build)"
echo "======================================================="
npm run build

# Create a quick start script
cat << 'EOF' > start_ogglebox.sh
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm start
EOF
chmod +x start_ogglebox.sh

echo ""
echo "======================================================="
echo " INSTALLATION COMPLETE!"
echo "======================================================="
echo "To start the server, run: ./start_ogglebox.sh"
echo ""
echo "Once started, open http://<LAN_IP>:3000 from any device on your network."
echo "No SSL certificates or trust setup required!"
echo ""

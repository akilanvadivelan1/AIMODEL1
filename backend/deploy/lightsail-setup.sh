#!/usr/bin/env bash
#
# OmniDesk backend installer for a Linux server (made for AWS Lightsail).
#
# It installs Node.js and Caddy, builds the app, and runs it as a service that
# starts on boot and restarts if it crashes. Caddy gives the server free HTTPS.
#
# Safe to run again. Running it again updates the app and keeps your data and secrets.
#
# Optional settings, passed in front of bash:
#   OMNIDESK_HOST      your own domain name (default: a free <ip>.sslip.io name)
#   GOOGLE_CLIENT_ID   turns on Continue with Google
#   RESEND_API_KEY     turns on emailed sign-in codes
#   MAIL_FROM          the "from" address on those emails
#   OMNIDESK_ORIGINS   extra web addresses allowed to call the API, comma separated
#
set -euo pipefail

REPO_URL="${OMNIDESK_REPO:-https://github.com/akilanvadivelan1/AIMODEL1.git}"
BRANCH="${OMNIDESK_BRANCH:-main}"
APP_DIR="/opt/omnidesk"
DATA_DIR="/var/lib/omnidesk"
CONF_DIR="/etc/omnidesk"
ENV_FILE="$CONF_DIR/env"
APP_PORT=8787

say()  { printf '\n==> %s\n' "$*"; }
note() { printf '    %s\n' "$*"; }
die()  { printf '\nERROR: %s\n\n' "$*" >&2; exit 1; }

random_hex() { head -c 32 /dev/urandom | od -An -vtx1 | tr -d ' \n'; }

[ "$(id -u)" -eq 0 ] || die "Please run this with sudo."
command -v systemctl >/dev/null 2>&1 || die "This server does not use systemd, and the installer needs it."

# ---------------------------------------------------------------- which Linux
# shellcheck disable=SC1091
. /etc/os-release
FAMILY=""
case "${ID:-}" in
  ubuntu|debian) FAMILY=apt ;;
  amzn)
    if [ "${VERSION_ID:-}" = "2" ]; then
      die "Amazon Linux 2 is too old for Node.js 22. Create a new Lightsail instance with Ubuntu 24.04 and run this again."
    fi
    FAMILY=dnf
    ;;
  rhel|centos|rocky|almalinux|fedora) FAMILY=dnf ;;
  *) die "This Linux (${ID:-unknown}) is not supported. Use Ubuntu 22.04 or 24.04." ;;
esac

case "$(uname -m)" in
  x86_64) CADDY_ARCH=amd64 ;;
  aarch64|arm64) CADDY_ARCH=arm64 ;;
  *) die "Unsupported CPU type: $(uname -m)" ;;
esac

# ------------------------------------------------- ports 80 and 443 must be free
if command -v ss >/dev/null 2>&1; then
  for p in 80 443; do
    owner="$(ss -ltnp "( sport = :$p )" 2>/dev/null | tail -n +2 | head -1 || true)"
    if [ -n "$owner" ] && ! printf '%s' "$owner" | grep -q caddy; then
      die $'Something else is already using port '"$p"$' on this server:\n'"$owner"$'\n\nHTTPS needs ports 80 and 443. Use a fresh Lightsail instance (Ubuntu 24.04 works well), or stop that service first.'
    fi
  done
fi

# ----------------------------------------- small servers need swap to build the app
mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
if [ "${mem_kb:-0}" -lt 900000 ] && ! swapon --show 2>/dev/null | grep -q .; then
  say "Adding 1 GB of swap (this server has little memory)"
  fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ------------------------------------------------------------------ basic tools
say "Installing basic tools"
if [ "$FAMILY" = apt ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y curl git ca-certificates
else
  dnf install -y git ca-certificates
  command -v curl >/dev/null 2>&1 || dnf install -y --allowerasing curl
fi

# ---------------------------------------------------------------------- Node.js
node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'
}
if ! node_ok; then
  say "Installing Node.js 22"
  if [ "$FAMILY" = apt ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi
fi
node_ok || die "Could not install Node.js 22.13 or newer."
NODE_BIN="$(command -v node)"
note "Node.js $(node --version)"

# ------------------------------------------------------------------------ Caddy
if [ ! -x /usr/local/bin/caddy ]; then
  say "Installing Caddy (free HTTPS)"
  curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=${CADDY_ARCH}" -o /usr/local/bin/caddy.tmp
  chmod 755 /usr/local/bin/caddy.tmp
  mv /usr/local/bin/caddy.tmp /usr/local/bin/caddy
fi
/usr/local/bin/caddy version >/dev/null 2>&1 || die "Caddy did not install correctly."

# -------------------------------------------------------------- users and folders
NOLOGIN="$(command -v nologin || echo /sbin/nologin)"
id omnidesk >/dev/null 2>&1 || useradd --system --home-dir "$DATA_DIR" --shell "$NOLOGIN" omnidesk
id caddy >/dev/null 2>&1 || useradd --system --home-dir /var/lib/caddy --shell "$NOLOGIN" caddy
mkdir -p "$DATA_DIR" "$CONF_DIR" /var/lib/caddy/.config /etc/caddy
chown omnidesk:omnidesk "$DATA_DIR"
chmod 700 "$DATA_DIR"
chown -R caddy:caddy /var/lib/caddy

# --------------------------------------------------------------------- the code
say "Getting the latest code"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard FETCH_HEAD
else
  rm -rf "$APP_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

say "Building the app (this takes a minute or two)"
cd "$APP_DIR/backend"
npm ci --no-audit --no-fund
npm run build
chmod -R a+rX "$APP_DIR"

# -------------------------------------------------------------------- the settings
set_var() { # set_var NAME VALUE  -> writes NAME="VALUE" in the private settings file
  local name="$1" value="$2" tmp
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  tmp="$(mktemp)"
  grep -v "^${name}=" "$ENV_FILE" > "$tmp" || true
  printf '%s="%s"\n' "$name" "$value" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
}

if [ ! -f "$ENV_FILE" ]; then
  say "Creating your private settings (the secrets are generated for you)"
  (umask 077; : > "$ENV_FILE")
  chmod 600 "$ENV_FILE"
  set_var NODE_ENV production
  set_var PORT "$APP_PORT"
  set_var DATA_DIR "$DATA_DIR"
  set_var TRUST_PROXY 1
  set_var SERVER_SECRET "$(random_hex)"
  set_var ENCRYPTION_KEY "$(random_hex)"
else
  say "Keeping your existing settings and secrets"
fi
if [ -n "${GOOGLE_CLIENT_ID:-}" ];   then set_var GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"; fi
if [ -n "${RESEND_API_KEY:-}" ];     then set_var RESEND_API_KEY "$RESEND_API_KEY"; fi
if [ -n "${MAIL_FROM:-}" ];          then set_var MAIL_FROM "$MAIL_FROM"; fi
if [ -n "${OMNIDESK_ORIGINS:-}" ];   then set_var ALLOWED_ORIGINS "$OMNIDESK_ORIGINS"; fi
if [ -n "${OMNIDESK_HOST:-}" ];      then set_var OMNIDESK_HOST "$OMNIDESK_HOST"; fi

# ----------------------------------------------------------- the public web address
HOST="${OMNIDESK_HOST:-}"
if [ -z "$HOST" ]; then
  HOST="$(grep '^OMNIDESK_HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
if [ -z "$HOST" ]; then
  IP="$(curl -fsS --max-time 8 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
  printf '%s' "$IP" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' ||
    die "Could not work out this server's public IP address. Run again with your own domain, like: curl ... | sudo OMNIDESK_HOST=api.example.com bash"
  HOST="$(printf '%s' "$IP" | tr '.' '-').sslip.io"
fi

# ----------------------------------------------------------------- the services
say "Setting up the services"
cat > /etc/systemd/system/omnidesk.service <<EOF
[Unit]
Description=OmniDesk API
After=network-online.target
Wants=network-online.target

[Service]
User=omnidesk
Group=omnidesk
EnvironmentFile=$ENV_FILE
WorkingDirectory=$APP_DIR/backend
ExecStart=$NODE_BIN --disable-warning=ExperimentalWarning $APP_DIR/backend/dist/server.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/caddy/Caddyfile <<EOF
$HOST {
	reverse_proxy 127.0.0.1:$APP_PORT
}
EOF

cat > /etc/systemd/system/caddy.service <<'EOF'
[Unit]
Description=Caddy web server (HTTPS for OmniDesk)
After=network-online.target
Wants=network-online.target

[Service]
User=caddy
Group=caddy
Environment="XDG_DATA_HOME=/var/lib/caddy" "XDG_CONFIG_HOME=/var/lib/caddy/.config"
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
Restart=on-failure
TimeoutStopSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

# A short command for later updates.
cat > /usr/local/bin/omnidesk-update <<EOF
#!/usr/bin/env bash
exec sudo bash $APP_DIR/backend/deploy/lightsail-setup.sh
EOF
chmod 755 /usr/local/bin/omnidesk-update

systemctl daemon-reload
systemctl enable omnidesk caddy >/dev/null 2>&1
systemctl restart omnidesk
systemctl restart caddy

# ------------------------------------------------------------------- check it works
say "Checking that it started"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$APP_PORT/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  journalctl -u omnidesk -n 30 --no-pager || true
  die "The app did not start. The last log lines are shown above."
fi
note "The app is running."

note "Getting an HTTPS certificate (can take up to two minutes)..."
https_ok=0
for _ in $(seq 1 40); do
  if curl -fsS --max-time 10 "https://$HOST/health" >/dev/null 2>&1; then https_ok=1; break; fi
  sleep 3
done

echo
echo "============================================================"
if [ "$https_ok" -eq 1 ]; then
  echo "  OmniDesk API is live:   https://$HOST"
else
  echo "  The app is installed, but HTTPS is not ready yet."
  echo "  Address it will use:    https://$HOST"
  echo
  echo "  Most likely cause: ports 80 and 443 are closed. In the Lightsail"
  echo "  console open your instance, then Networking, and under IPv4 Firewall"
  echo "  add the rules HTTP (80) and HTTPS (443). Then run:"
  echo "      sudo systemctl restart caddy"
  echo "  To see what Caddy says:  sudo journalctl -u caddy -n 40 --no-pager"
fi
echo "============================================================"
echo
echo "Next steps"
echo "  1. In GitHub, set the repository variable API_URL to:  https://$HOST"
echo "  2. Re-run the 'Deploy to GitHub Pages' and 'Build Mac App' workflows."
echo
echo "Handy commands"
echo "  See the logs:        sudo journalctl -u omnidesk -f"
echo "  Update to latest:    omnidesk-update"
echo "  Edit settings:       sudo nano $ENV_FILE   (then: sudo systemctl restart omnidesk)"
echo
if ! grep -q '^GOOGLE_CLIENT_ID=".' "$ENV_FILE"; then
  echo "Note: Google sign-in is off until you add GOOGLE_CLIENT_ID to the settings."
fi
if ! grep -q '^RESEND_API_KEY=".' "$ENV_FILE"; then
  echo "Note: emailed codes are off until you add RESEND_API_KEY to the settings."
fi
echo "Tip: attach a Static IP to this instance in the Lightsail console, so the"
echo "address above never changes when the server restarts."

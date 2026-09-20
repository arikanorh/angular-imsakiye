#!/usr/bin/env bash
# Uzak geliştirme: bu makinedeki `ng serve` (hot reload dahil) Tailscale
# üzerinden kendi bilgisayarınızdan erişilebilir hale gelir.
#
# Neden Tailscale? Claude Code on the web sandbox'ından dışarıya yalnızca
# proxy üzerinden 443/HTTPS çıkılır. Tailscale hem kontrol düzlemi hem DERP
# relay için HTTPS_PROXY'yi kullanır; Cloudflare Tunnel (7844/TCP+UDP) ve
# ssh tabanlı tüneller bu ortamda çalışmaz.
#
# Kullanım:
#   bash scripts/dev-remote.sh            # etkileşimli giriş (URL basılır, tarayıcıda onaylanır)
#   TS_AUTHKEY=tskey-auth-... bash scripts/dev-remote.sh   # anahtarla sessiz giriş
#   PUBLIC=1 bash scripts/dev-remote.sh   # tailnet yerine herkese açık Funnel URL'i
#
# Tailscale kurulu olmayan bir bilgisayardan erişmek için PUBLIC=1 (Funnel)
# kullanın; Funnel'ın tailnet ACL'inde açık olması gerekir:
# https://tailscale.com/kb/1223/funnel
set -euo pipefail

PORT="${PORT:-4300}"
HOSTNAME_TS="${HOSTNAME_TS:-imsakiye-dev}"
TS_DIR="${TS_DIR:-/opt/tailscale}"
STATE_DIR="${STATE_DIR:-$HOME/.tailscale-dev}"
SOCK="$STATE_DIR/tailscaled.sock"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$STATE_DIR"

# --- Node sürümü (CLAUDE.md'deki not: sistem node bir patch geride olabilir)
if [ -s /opt/nvm/nvm.sh ]; then
  export NVM_DIR=/opt/nvm/.nvm
  # shellcheck disable=SC1091
  source /opt/nvm/nvm.sh >/dev/null
  nvm use 22.22.3 >/dev/null 2>&1 || true
fi

# --- Tailscale ikilileri yoksa indir (statik tgz, ~50 MB)
if [ ! -x "$TS_DIR/tailscaled" ]; then
  echo "Tailscale indiriliyor..."
  mkdir -p "$TS_DIR"
  tmp="$(mktemp -d)"
  curl -sSL -o "$tmp/ts.tgz" https://pkgs.tailscale.com/stable/tailscale_latest_amd64.tgz
  tar -xzf "$tmp/ts.tgz" -C "$tmp"
  cp "$tmp"/tailscale_*_amd64/tailscale "$tmp"/tailscale_*_amd64/tailscaled "$TS_DIR/"
  rm -rf "$tmp"
fi

# --- ng serve (--allowed-hosts şart: Vite yabancı host adını yoksa reddeder;
#     --no-hmr: bileşen HMR'ı tünel üzerinden güvenilmez, her değişiklikte tam
#     sayfa yenilemesi (live reload) daha kararlı)
if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  echo "ng serve başlatılıyor (port $PORT)..."
  # setsid: bu kabuk kapansa da süreç yaşasın (Claude Code arka plan çağrıları
  # bitince alt süreçleri sonlandırabiliyor).
  (cd "$ROOT" && setsid nohup npx ng serve --port "$PORT" --allowed-hosts --no-hmr > "$STATE_DIR/ngserve.log" 2>&1 < /dev/null &)
  for _ in $(seq 1 90); do
    curl -s -o /dev/null "http://localhost:$PORT/" && break
    sleep 1
  done
fi

# --- tailscaled (kullanıcı alanı ağı: TUN aygıtı gerekmez)
if ! "$TS_DIR/tailscale" --socket="$SOCK" status >/dev/null 2>&1; then
  echo "tailscaled başlatılıyor..."
  # --statedir: kimlik ve HTTPS sertifikaları (serve/funnel) burada saklanır;
  # yalnızca --state verilirse sertifika üretilemez ("no TailscaleVarRoot").
  (setsid nohup "$TS_DIR/tailscaled" --tun=userspace-networking \
      --statedir="$STATE_DIR" --socket="$SOCK" --port=0 \
      > "$STATE_DIR/tailscaled.log" 2>&1 < /dev/null &)
  sleep 3
fi

# --- tailnet'e katıl
UP_ARGS=(--hostname="$HOSTNAME_TS" --accept-dns=false --accept-routes=false)
if [ -n "${TS_AUTHKEY:-}" ]; then
  "$TS_DIR/tailscale" --socket="$SOCK" up "${UP_ARGS[@]}" --authkey="$TS_AUTHKEY"
else
  echo
  echo "Aşağıdaki bağlantıyı tarayıcınızda açıp bu makineyi tailnet'inize ekleyin:"
  "$TS_DIR/tailscale" --socket="$SOCK" up "${UP_ARGS[@]}"
fi

# --- adresler
IP="$("$TS_DIR/tailscale" --socket="$SOCK" ip -4 2>/dev/null || true)"
DNS="$("$TS_DIR/tailscale" --socket="$SOCK" status --json 2>/dev/null | sed -n 's/.*"DNSName": "\([^"]*\)\.".*/\1/p' | head -1)"

echo
echo "Hazır. Tailscale kurulu bir cihazdan doğrudan (HTTP):"
[ -n "$IP" ]  && echo "  http://$IP:$PORT"
[ -n "$DNS" ] && echo "  http://$DNS:$PORT"

# --- HTTPS: tailscale serve (tailnet) ya da funnel (herkese açık).
# Tailnet'te "Serve" kapalıysa komut bir etkinleştirme bağlantısı basar ve
# bekler; burada takılmamak için zaman aşımıyla çalıştırılır.
"$TS_DIR/tailscale" --socket="$SOCK" serve reset >/dev/null 2>&1 || true
if [ "${PUBLIC:-0}" = "1" ]; then
  timeout 20 "$TS_DIR/tailscale" --socket="$SOCK" funnel --bg "$PORT" 2>&1 | sed 's/^/  /' || true
else
  timeout 20 "$TS_DIR/tailscale" --socket="$SOCK" serve --bg "$PORT" 2>&1 | sed 's/^/  /' || true
fi
echo
echo "  HTTPS adresi yukarıda 'Available within your tailnet' altında görünür (https://$DNS)."
echo "  'Serve is not enabled' diyorsa basılan bağlantıdan bir kez etkinleştirip scripti tekrar çalıştırın."
echo "  Hot reload: Vite HMR websocket'i aynı adres üzerinden çalışır."
echo "  Durdurmak için: $TS_DIR/tailscale --socket=$SOCK serve reset; pkill -f tailscaled"

#!/usr/bin/env bash
# Install only ORBIT's dedicated runtime/service; existing web services are untouched.
set -euo pipefail
umask 077
release_tag=${1:?Usage: deploy-server.sh server-COMMIT PORT PUBLIC_ORIGIN}
app_port=${2:?Port required}
public_origin=${3:?Public origin required, e.g. http://47.106.176.71:3210}
[[ $release_tag =~ ^server-[a-f0-9]{12}$ ]] || { echo 'Invalid release tag'; exit 1; }
[[ $app_port =~ ^[0-9]+$ ]] && ((app_port > 1024 && app_port < 65536)) || { echo 'Invalid port'; exit 1; }
[[ $public_origin =~ ^https?://[a-zA-Z0-9.:-]+$ ]] || { echo 'Invalid public origin'; exit 1; }
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
[[ $(uname -m) == x86_64 ]] || { echo 'This release supports Linux x86_64'; exit 1; }
for dependency in curl tar xz sha256sum systemctl ss; do command -v "$dependency" > /dev/null; done
base=/opt/orbit-quote-desk
data_dir=/var/lib/orbit-quote-desk
env_file=/etc/orbit-quote-desk.env
url="https://github.com/tjt740/orbit-quote-desk/releases/download/$release_tag"
if ! systemctl is-active --quiet orbit-quote-desk.service && ss -lntH | awk '{print $4}' | grep -Eq ":${app_port}$"; then
  echo "Port $app_port is occupied; no existing service was changed"; exit 1
fi
install -d -m 755 "$base/releases" "$base/runtime"
stage=$(mktemp -d "$base/releases/.staging.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
curl --fail --location --retry 3 --connect-timeout 15 --max-time 300 "$url/orbit-quote-desk-linux-x64.tar.gz" -o "$stage/orbit-quote-desk-linux-x64.tar.gz"
curl --fail --location --retry 3 --max-time 60 "$url/SHA256SUMS" -o "$stage/SHA256SUMS"
(cd "$stage"; grep '  orbit-quote-desk-linux-x64.tar.gz$' SHA256SUMS | sha256sum -c -)
node_version=v24.21.0
node_archive="node-$node_version-linux-x64.tar.xz"
node_sha=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6
if [[ ! -x "$base/runtime/node-$node_version-linux-x64/bin/node" ]]; then
  curl --fail --location --retry 3 --connect-timeout 15 --max-time 300 "https://nodejs.org/dist/$node_version/$node_archive" -o "$stage/$node_archive"
  (cd "$stage"; printf '%s  %s\n' "$node_sha" "$node_archive" | sha256sum -c -)
  tar -xJf "$stage/$node_archive" -C "$base/runtime"
fi
if ! id orbitquote > /dev/null 2>&1; then useradd --system --no-create-home --shell /sbin/nologin orbitquote; fi
install -d -o orbitquote -g orbitquote -m 700 "$data_dir"
release_path="$base/releases/$release_tag"
if [[ ! -d $release_path ]]; then
  install -d -m 755 "$stage/app"
  tar -xzf "$stage/orbit-quote-desk-linux-x64.tar.gz" -C "$stage/app"
  chmod -R go+rX "$stage/app"
  mv "$stage/app" "$release_path"
fi
install -d -o orbitquote -g orbitquote -m 700 "$release_path/.next/cache"
if [[ ! -f $env_file ]]; then
  printf 'NODE_ENV=production\nHOSTNAME=0.0.0.0\nPORT=%s\nORBIT_PUBLIC_ORIGIN=%s\nORBIT_DATA_DIR=%s\nNODE_OPTIONS=--max-old-space-size=192\n' "$app_port" "$public_origin" "$data_dir" > "$env_file"
  chmod 600 "$env_file"
  echo 'Administrator sign-in is disabled until existing credentials are added to /etc/orbit-quote-desk.env.'
else
  # Preserve administrator credentials and the operator's existing settings.
  echo 'Preserving existing environment file.'
fi
old_release=$(readlink -f "$base/current" 2>/dev/null || true)
ln -s "$release_path" "$base/current.new"
mv -Tf "$base/current.new" "$base/current"
cat > /etc/systemd/system/orbit-quote-desk.service <<EOF
[Unit]
Description=ORBIT Product Pricing Workspace
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=orbitquote
Group=orbitquote
WorkingDirectory=$base/current
EnvironmentFile=$env_file
ExecStart=$base/runtime/node-$node_version-linux-x64/bin/node $base/current/server.js
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=$data_dir $release_path/.next/cache
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable orbit-quote-desk.service
systemctl restart orbit-quote-desk.service
healthy=false
for attempt in {1..30}; do
  if curl --fail --silent --max-time 3 "http://127.0.0.1:$app_port/api/auth" > /dev/null; then healthy=true; break; fi
  sleep 1
done
if [[ $healthy != true ]]; then
  if [[ -n $old_release ]]; then
    ln -s "$old_release" "$base/current.rollback"
    mv -Tf "$base/current.rollback" "$base/current"
    sed -i "s|^ReadWritePaths=.*|ReadWritePaths=$data_dir $old_release/.next/cache|" /etc/systemd/system/orbit-quote-desk.service
    systemctl daemon-reload
    systemctl restart orbit-quote-desk.service
  else
    systemctl stop orbit-quote-desk.service
  fi
  echo 'Health check failed; inspect journalctl -u orbit-quote-desk.service'; exit 1
fi
echo "ORBIT local health check passed. Configured origin: $public_origin"
echo 'Verify the external URL separately; this installer does not modify firewall rules.'

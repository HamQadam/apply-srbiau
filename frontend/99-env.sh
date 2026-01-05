#!/bin/sh
set -eu

cat >/usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID:-}"
};
EOF

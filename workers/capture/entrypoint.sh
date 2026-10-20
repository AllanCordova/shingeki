#!/bin/sh
set -eu

export DISPLAY="${DISPLAY:-:99}"

Xvfb "$DISPLAY" -screen 0 1280x800x24 -ac +extension GLX +render -noreset >/tmp/xvfb.log 2>&1 &
sleep 0.4
websockify --web=/usr/share/novnc "${CAPTURE_NOVNC_BIND:-0.0.0.0:6080}" localhost:5900 >/tmp/novnc.log 2>&1 &

exec node server.mjs

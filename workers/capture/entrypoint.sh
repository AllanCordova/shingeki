#!/bin/sh
set -eu

export DISPLAY="${DISPLAY:-:99}"
display_num="${DISPLAY#:}"
display_num="${display_num%%.*}"

if [ -f "/tmp/.X${display_num}-lock" ]; then
  old_pid="$(tr -cd '0-9' < "/tmp/.X${display_num}-lock")"
  if [ -z "$old_pid" ] || ! kill -0 "$old_pid" 2>/dev/null; then
    rm -f "/tmp/.X${display_num}-lock" "/tmp/.X11-unix/X${display_num}"
  fi
fi

mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

if ! [ -S "/tmp/.X11-unix/X${display_num}" ]; then
  # nohup keeps Xvfb alive after this shell is replaced by node.
  nohup Xvfb "$DISPLAY" -screen 0 1280x800x24 -ac +extension GLX +render -noreset >/tmp/xvfb.log 2>&1 &
fi

ready=0
i=0
while [ "$i" -lt 25 ]; do
  if [ -S "/tmp/.X11-unix/X${display_num}" ]; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 0.2
done

if [ "$ready" -ne 1 ]; then
  echo "Xvfb did not start." >&2
  cat /tmp/xvfb.log >&2 || true
  exit 1
fi

nohup websockify --web=/usr/share/novnc "${CAPTURE_NOVNC_BIND:-0.0.0.0:6080}" localhost:5900 >/tmp/novnc.log 2>&1 &

exec node server.mjs

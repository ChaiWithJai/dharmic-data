#!/usr/bin/env bash
set -euo pipefail
systemctl --user start dharmic-team-api dharmic-team-worker dharmic-team-web
for attempt in {1..40}; do
  if curl --silent --fail http://127.0.0.1:8790/api/health >/dev/null; then
    exec xdg-open http://127.0.0.1:8790
  fi
  sleep 0.25
done
printf '%s\n' 'Check journalctl --user -u dharmic-team-api -u dharmic-team-worker -u dharmic-team-web'
exit 1

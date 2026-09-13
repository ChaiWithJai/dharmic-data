#!/usr/bin/env bash
set -euo pipefail
systemctl --user start dharmic-studio-api.service dharmic-studio-web.service
for attempt in {1..40}; do
  if curl --fail --silent http://127.0.0.1:8780/api/health >/dev/null; then
    exec xdg-open http://127.0.0.1:8780
  fi
  sleep 0.25
done
printf '%s\n' 'Studio did not start. Check: journalctl --user -u dharmic-studio-api -u dharmic-studio-web -n 50'
exit 1

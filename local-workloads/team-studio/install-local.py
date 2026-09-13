"""Install launchers for this checkout; no system-wide changes or login autostart."""
from pathlib import Path
import shutil,subprocess
root=Path(__file__).resolve().parent
web=root.parent/'studio-web';python=root/'.venv/bin/python';node=shutil.which('node')
if not python.exists() or not (web/'node_modules/vite/bin/vite.js').exists() or not node:
    raise SystemExit('Run uv sync --locked here and npm ci in ../studio-web first; Node must be on PATH.')
units=Path.home()/'.config/systemd/user';units.mkdir(parents=True,exist_ok=True)
commands={
    'api':(root,f'"{python}" -m uvicorn api:app --host 127.0.0.1 --port 8791'),
    'worker':(root,f'"{python}" worker.py'),
    'web':(web,f'"{node}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8790 --strictPort'),
}
for name,(cwd,command) in commands.items():
    (units/f'dharmic-team-{name}.service').write_text(f'''[Unit]
Description=Imagine Together local pilot {name}

[Service]
Type=simple
WorkingDirectory={cwd}
EnvironmentFile=-{root}/.env
ExecStart={command}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
''')
launcher=root/'launch.sh'
launcher.write_text('''#!/usr/bin/env bash
set -euo pipefail
systemctl --user start dharmic-team-api dharmic-team-worker dharmic-team-web
for attempt in {1..40}; do
  if curl --silent --fail http://127.0.0.1:8790/api/health >/dev/null; then
    exec xdg-open http://127.0.0.1:8790
  fi
  sleep 0.25
done
printf '%s\\n' 'Check journalctl --user -u dharmic-team-api -u dharmic-team-worker -u dharmic-team-web'
exit 1
''');launcher.chmod(0o755)
apps=Path.home()/'.local/share/applications';apps.mkdir(parents=True,exist_ok=True)
(apps/'dharmic-imagine-together.desktop').write_text(f'''[Desktop Entry]
Type=Application
Name=Imagine Together (local pilot)
Comment=Capture unfinished thoughts and align a grant project
Exec="{launcher}"
Icon=accessories-text-editor
Terminal=false
Categories=Education;Office;
''')
subprocess.run(['systemctl','--user','daemon-reload'],check=True)
print('Installed local app launcher and three user services. Services are not enabled at login.')

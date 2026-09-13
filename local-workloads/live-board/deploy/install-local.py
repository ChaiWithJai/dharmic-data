#!/usr/bin/env python3
"""Install and start user services. Does not enable boot startup or expose ports."""
from pathlib import Path
import shutil, subprocess
root=Path(__file__).resolve().parents[1]
node=shutil.which('node')
if not node or not (root/'.env').exists():
    raise SystemExit('Install Node 24 and configure the protected .env first.')
units=Path.home()/'.config/systemd/user'
units.mkdir(parents=True,exist_ok=True)
commands={
'imagine-live-board-api':f'{node} --env-file={root}/.env {root}/server.mjs',
'imagine-live-board-web':f'{node} {root}/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8892 --strictPort',
}
if (root/'buzz-local/bridge.json').exists():
    commands['imagine-live-board-buzz']=f'{node} {root}/buzz-bridge.mjs'
for name,command in commands.items():
    (units/(name+'.service')).write_text(f'''[Unit]
Description=Imagine Together local live board {name.rsplit('-',1)[-1]}
[Service]
WorkingDirectory={root}
ExecStart={command}
Restart=on-failure
RestartSec=5
UMask=0077
[Install]
WantedBy=default.target
''')
subprocess.run(['systemctl','--user','daemon-reload'],check=True)
subprocess.run(['systemctl','--user','start',*commands],check=True)
print('Open http://127.0.0.1:8892 — local-only live board. Boot startup is not enabled.')

"""Reconnect the existing beta site after its temporary tunnel URL changes."""
from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parent
matches=re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com',(root/'data/tunnel.log').read_text())
if not matches: raise SystemExit('No tunnel URL found. Start imagine-beta-tunnel and inspect its service log.')
origin=matches[-1]
web=root.parent/'studio-web'
site='f810eb79-cbe3-49fa-afbf-c010e0cdb47e'
r=subprocess.run(['npx','netlify-cli','env:set','STUDIO_API_ORIGIN',origin,'--scope','functions','--context','production','--site',site,'--force'],cwd=web,capture_output=True,text=True)
if r.returncode: raise SystemExit('Netlify configuration failed. Check netlify login/status; no secrets are printed here.')
subprocess.run(['npm','run','build'],cwd=web,check=True)
subprocess.run(['npx','netlify-cli','deploy','--prod','--no-build','--dir','dist','--functions','netlify/functions','--site',site,'--message','Refresh private beta GB10 connection'],cwd=web,check=True)
print('Verify the published /api/session endpoint and sign-in before inviting users.')

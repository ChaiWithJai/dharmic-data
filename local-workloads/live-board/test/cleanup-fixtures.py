#!/usr/bin/env python3
"""Remove only this harness's synthetic accounts/workspaces, never real app data."""
import json, os, sqlite3
from pathlib import Path
root=Path(__file__).resolve().parents[1]
auth_path=os.environ.get('LIVE_AUTH_DB','/home/chaiwithjai/Documents/code/dharmic-imagine-together/local-workloads/team-studio/data/team.sqlite3')
auth=sqlite3.connect(auth_path)
accounts=auth.execute("SELECT id FROM users WHERE name GLOB 'livefixture_*_[0-9]*'").fetchall()
ids=[x[0] for x in accounts]
wids=[]
for user_id in ids:
    wids.extend(x[0] for x in auth.execute("SELECT workspace_id FROM members JOIN workspaces ON workspaces.id=members.workspace_id WHERE user_id=? AND role='owner' AND workspaces.name='Live board verification fixture'",(user_id,)))
wids=list(set(wids))
tables=[r[0] for r in auth.execute("SELECT name FROM sqlite_master WHERE type='table'")]
with auth:
    for table in tables:
        columns={r[1] for r in auth.execute('PRAGMA table_info("'+table+'")')}
        if 'workspace_id' in columns:
            for wid in wids:auth.execute('DELETE FROM "'+table+'" WHERE workspace_id=?',(wid,))
    for wid in wids:auth.execute('DELETE FROM workspaces WHERE id=?',(wid,))
    for user_id in ids:
        auth.execute('DELETE FROM sessions WHERE user_id=?',(user_id,))
        auth.execute('DELETE FROM users WHERE id=?',(user_id,))
auth.close()
live=sqlite3.connect(root/'data/live.sqlite3')
with live:
    for wid in wids:
        live.execute('DELETE FROM proposals WHERE workspace=?',(wid,))
        live.execute('DELETE FROM events WHERE workspace=?',(wid,))
        for (table,) in live.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?",('r_'+wid+'_%',)).fetchall():
            live.execute('DROP TABLE "'+table+'"')
live.close()
(root/'data/test-fixture.json').unlink(missing_ok=True)
print(json.dumps({'synthetic_accounts_removed':len(ids),'synthetic_workspaces_removed':len(wids)}))

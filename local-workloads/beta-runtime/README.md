# Live grants beta — operator handoff

Site: https://imagine-together-dharmic-beta.netlify.app
Netlify site ID: f810eb79-cbe3-49fa-afbf-c010e0cdb47e
Edition: invited, presenter-operated grants trial. No custom DNS changed.

## Start using it

Jai can sign in as `chaiwithjai` using the existing local Imagine Together password. Only that account's ID/name/password hash was copied into this separate beta database; no original projects, documents or sessions were copied. Subsequent password changes are not synchronized between the two editions.

Two unused learner invitation codes are in this checkout's private `data/TEAM-INVITATIONS.md`. Share each with its intended teammate through your own private channel. Codes expire seven days after issuance and work once. They choose a name/password at “Have an invitation? Create an account.” Both learner invitations join “First grant — team working room” as editors. Jai owns that room and chooses its required reviewers. Personal workspaces remain separate. No email was sent automatically.

Each admitted learner can create private workspaces and reserve one guest invitation through People & workspaces. A new guest uses that invitation during account creation and joins that workspace. Guests can create their own private work but cannot issue onward invitations. An existing beta member can redeem a workspace invitation from the workspace selector. Beta admission uses bearer invitations and named accounts; verified email, automated account recovery and class enrollment integration are not implemented.

For a first real grant: create a workspace, capture the opportunity's canonical requirements, add your unfinished project thoughts, invite the collaborator, select sources for an optional Bonsai suggestion, then draft and review the brief in Alignment & decisions. Publication means the required reviewers approved that workspace's exact brief revision; it does not publish to the internet or submit a grant. Community showcase/discovery and Buzz are still future work.

## What is deployed

Netlify hosts the production frontend and a narrow same-origin function. Production-only function environment holds the upstream origin and gateway credential. The function validates request methods/path/body/origin, forwards cookies and the workspace header, and adds a server-only credential. It returns private/no-store responses. The GB10 API checks that credential before application routing, then applies named-user sessions and workspace membership. Direct tunnel requests without the gateway credential were verified to return 403.

The GB10 API listens on loopback 8891 with isolated SQLite data under this directory. The separate beta worker uses the existing Bonsai endpoint on 8001. MLflow traces contain job/source IDs, revisions, model/usage and completion status; full source text/model prose are not copied into traces or response artifacts. The app's private job database still stores inputs/results so authorized collaborators can use them. Operators can access backend data; no end-to-end-encryption claim is made.

The production web build provides sources, suggestions, decisions and reviewed briefs. It does not mount tldraw without a valid production key. The original local canvas app is unchanged. Configure VITE_TLDRAW_LICENSE_KEY for the intended host and reverify the board before enabling it online.

## Availability and restart

Running user services: `imagine-beta-api`, `imagine-beta-worker`, `imagine-beta-tunnel`. This is a supervised trial while the GB10 is online; unattended reboot recovery is not established. The frontend remains online when the machine is off, but application data access and inference are unavailable. This differs from the future hosted-database architecture.

Cloudflare Quick Tunnel provides the temporary HTTPS connection. It is a testing facility without a production availability guarantee; its hostname can change when the tunnel process restarts. See https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/ . Replace it with a stable authenticated ingress before an ongoing class or production service.

Recovery:

1. Start/check the existing Bonsai and private MLflow services.
2. `systemctl --user start imagine-beta-api imagine-beta-worker imagine-beta-tunnel`
3. If the tunnel restarted, run `python3 refresh-connection.py` here. This updates only this beta site's upstream environment and rebuilds/redeploys it; it requires the existing Netlify login.
4. Verify sign-in, source reload and a bounded model request. Expired running job leases become interrupted; do not assume an interrupted request completed. Export and review before retrying an edit.

Inspect `journalctl --user -u imagine-beta-api -u imagine-beta-worker -u imagine-beta-tunnel`. Never share environment files, invitation codes or full runtime logs publicly. No UPS/power-cut or off-device disaster recovery test has been performed. A consistent initial local SQLite backup was created in data/backups/initial-beta.sqlite3. Before real team material, take a fresh consistent SQLite backup and keep an encrypted off-device copy under the chosen retention policy.

The runtime `.env`, database, gateway credential, invitation file and tunnel log are ignored by Git. The local cloudflared binary is version 2026.9.1, ARM64, SHA256 `3d97437c71848bd8df68041e12436b484a661d95073ea1937f01a845ce88faa3`; download it from the official Cloudflare GitHub release when reproducing this setup. The Python environment and frontend dependencies are reused locally from the development checkout; a fresh installation must install the repository's dependencies.

## Verification

Nine existing API tests and four beta boundary tests passed. Real hosted browser checks passed for invited registration, secure session, source persistence, collaborator joining, exact-revision reviews/publication and a real Bonsai suggestion. Additional real HTTP checks covered cross-origin denial, signed-in cross-workspace denial, unauthenticated denial, export and logout. Two metadata-only trace spans were verified; no HUMAN model feedback was synthesized. The fixture accounts/workspaces were removed.

Real hosted inference run: `add43b6d994b4b899248640d6325860c`; trace `tr-16768b1a65fae3bba7f0027e31500e44`. This proves integration, not useful grant advice. Have your actual teammates assess it.

The current release was deployed manually with the Netlify CLI. Source lives on `studio/grants-beta`; existing branded-site Git deployment settings were not changed. Class scaling still requires stable hosting, account recovery, private sharing/discovery, load testing, backups and the daily reporting implementation described in the deployment plan.

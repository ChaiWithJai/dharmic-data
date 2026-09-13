The Compose file is derived from `block/buzz/deploy/compose/compose.yml` at commit `4cd82f513214aad11c2b742ce7cc7c681e8e32a0`, under Apache-2.0 (see UPSTREAM-LICENSE).

Local modifications: distinct project/volume namespace `imagine-buzz-local`, loopback port 18900, and restart disabled pending operator qualification. The actual relay image is pinned by digest in protected `.env` and includes a verified Linux ARM64 manifest. Existing databases and the Netlify deployment are not connected to this relay.

Canonical source: https://github.com/block/buzz/blob/4cd82f513214aad11c2b742ce7cc7c681e8e32a0/deploy/compose/compose.yml

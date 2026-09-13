# Private grants beta deployment handoff

Netlify authentication was checked with `npx netlify-cli status`: this machine is not logged in. No new site was created. Run `npx netlify-cli login` to connect the intended account; do not paste a token into chat.

The accepted local app is runnable, but its backend deliberately rejects public deployment. A Netlify upload alone would not make sign-in or saving work: the Vite proxy exists only during local development. The public API and invite-only hardening must be implemented/deployed before the team-facing site.

`prepare-netlify.mjs` prepares a beta-specific Netlify config, preserving the repository's existing root site configuration. It fails when a backend, proxy-signing secret or production canvas key is absent. Its readiness route is a **required backend contract, not an implemented endpoint**:

```json
{"mode":"private-beta","invite_only":true,"secure_sessions":true,"proxy_signature_verified":true,"metadata_only_tracing":true}
```

A readiness declaration alone is not a security test. Before live use, test direct backend requests without a signature, forged identity, expired/replayed signatures, cross-site mutation, private-response caching, guest enrollment and workspace access. The API must verify Netlify's signed proxy request and separately authenticate each person. Proxy origin authentication never substitutes for membership checks.

Proposed deployment steps after those gates pass:

1. From this app directory, connect the selected Netlify account/site; use a separate beta site, not the existing branded homepage.
2. Configure STUDIO_API_ORIGIN and the service's STUDIO_PROXY_SIGNING_SECRET in appropriate Netlify runtime/build contexts; never VITE-prefix a secret. Configure a valid VITE_TLDRAW_LICENSE_KEY scoped to the site domain.
3. Run `node deploy/prepare-netlify.mjs`, then build and deploy a draft using the generated `netlify.beta.toml` (`--config`), publish directory dist.
4. Verify sign-in, two-account private collaboration, real Bonsai response, metadata-only MLflow trace, reload/export, access denial and a canvas that remains visible after its license check. Keep preview data separate.
5. Promote the verified beta URL. Do not change community.dharmicdata.org.

Netlify proxy requests time out after 26 seconds: inference must use POST job / short polling, not a blocking generation request. The origin must itself return no-store on private responses; static header configuration is not sufficient proof of proxy response behavior.

Canonical sources: [Netlify proxy behavior](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), [Netlify authentication](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/), [tldraw production key](https://tldraw.dev/sdk-features/license-key).

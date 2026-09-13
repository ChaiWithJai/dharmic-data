# ADR 003 — Workspace identity and owner/editor/viewer permissions

Status: proposed. Date: 2026-09-13.

## Context

The original loopback-only app assumes one operator. Collaboration needs both a trustworthy identity and a decision about what that identity can access. Hiding a button or adding a workspace ID to a URL does not provide isolation.

## Decision

All workspace-owned objects include a non-null `workspace_id`: cards, revisions, boards, assets, documents, comments, decisions, approvals, jobs, exports, and evidence references. Derive the actor from the authenticated session. For every operation, load the object's workspace server-side and check active membership and permission. A request body cannot choose its author or grant itself a role. This follows OWASP's recommendations for default denial and checking authorization on each request. [Authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

| Operation | Viewer | Editor | Owner |
|---|---:|---:|---:|
| Read workspace content and canonical history | Yes | Yes | Yes |
| Create/edit cards, draft documents, and board content | No | Yes | Yes |
| Request bounded AI assistance | No | Yes | Yes |
| Export ordinary workspace content | Yes | Yes | Yes |
| Submit canonical review when explicitly designated | No | Yes | Yes |
| Invite/remove members; change roles/review policy | No | No | Yes |
| Accept/publish canonical version after required approvals | No | No | Yes |
| Restore/replace workspace; delete workspace | No | No | Yes |

Viewer is read-only in the first release, including comments. A future comment-only permission can be introduced explicitly; it should not emerge accidentally through a canvas library's defaults. Owners cannot manufacture other people's approvals. Prevent removal of the last owner without an explicit ownership transfer.

For a local two-person pilot, use distinct named accounts with server-managed sessions. An operator provisions accounts explicitly; no open registration is necessary. Use reviewed password/session components, expiring opaque session IDs, HttpOnly cookies, and CSRF protections for browser writes. Use Secure cookies and protected transport for any network-accessible pilot. Session invalidation and access revocation must affect both HTTP requests and existing WebSocket connections. The design follows the session lifecycle and cookie controls in [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

For a production proposal, integrate an established OIDC provider and retain application-owned workspace memberships. Provider authentication does not decide access to a particular project. Use the provider's verified subject identifier rather than treating an email string sent by the browser as proof of identity. [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

Keep two-person testing on this machine distinct from remote deployment. A development role switcher may exercise screen states but cannot satisfy the named-account acceptance gate.

## Data-boundary consequences

Search, source fetch, asset download, job polling, backups, and MLflow evidence are all access paths. Guessing a job or asset ID must not bypass the workspace check. Scope fetch tools to the selected source; do not give a model general access to the application's data directory or another workspace's search index. Workspace exports contain only authorized content. Import never trusts embedded membership or author identifiers to create authority.

## Verification

Use separate browser sessions for an owner, editor, viewer, and outsider. Exercise read/write/approve/export/job/asset routes directly, not only through UI controls. Attempt cross-workspace IDs, forged `created_by`, role escalation, membership revocation during an open session, and a removed user's queued job. Confirm that unauthorized requests cannot observe the content or mutate it. Recheck authorization before a queued job reads sources or exposes its result.

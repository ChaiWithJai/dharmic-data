import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import { api, workspaceScope } from "./api";
export type Role = "owner" | "editor" | "viewer";
export interface Workspace {
  id: string;
  name: string;
  role: Role;
}
export interface Member {
  user_id: string;
  name: string;
  role: Role;
}
interface Session {
  user: { id: string; name: string } | null;
  workspaces: Workspace[];
}
interface ContextValue {
  user: { id: string; name: string };
  workspace: Workspace;
  workspaces: Workspace[];
  members: Member[];
  refreshMembers: () => Promise<void>;
}
const CollaborationContext = createContext<ContextValue | null>(null);
export function useCollaboration() {
  const value = useContext(CollaborationContext);
  if (!value) throw new Error("Workspace session unavailable");
  return value;
}
export function MavenLink() {
  return (
    <a
      className="maven-link"
      href="https://maven.com/a-plus"
      target="_blank"
      rel="noreferrer"
    >
      Learn with Jai on Maven ↗
    </a>
  );
}
function switchWorkspace(id: string) {
  localStorage.setItem("imagine-together.workspace", id);
  location.reload();
}
export function SessionGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState(""),
    [members, setMembers] = useState<Member[]>([]);
  const refresh = useCallback(
    async () => setSession(await api<Session>("/session")),
    [],
  );
  const workspace = session?.workspaces.find((w) => w.id === workspaceScope);
  const refreshMembers = useCallback(async () => {
    if (workspaceScope) {
      const value = await api<{ members: Member[] }>(
        "/workspaces/" + workspaceScope + "/members",
      );
      setMembers(value.members);
    }
  }, []);
  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
  }, [refresh]);
  useEffect(() => {
    if (workspace) void refreshMembers().catch((e) => setError(String(e)));
  }, [workspace, refreshMembers]);
  if (error)
    return (
      <div className="welcome">
        <h1>Let’s reconnect to your studio.</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    );
  if (!session)
    return (
      <div className="welcome">
        <h1>Opening your shared studio…</h1>
      </div>
    );
  if (!session.user) return <AccountForm onAuthenticated={refresh} />;
  if (!workspace)
    return (
      <div className="welcome">
        <span className="eyebrow">IMAGINE TOGETHER</span>
        <h1>A space for your next shared idea.</h1>
        <p>
          Welcome, {session.user.name}. Open a workspace, make a new one, or
          join with an invitation.
        </p>
        {session.workspaces.length ? (
          <div className="workspace-choices">
            {session.workspaces.map((w) => (
              <button key={w.id} onClick={() => switchWorkspace(w.id)}>
                {w.name}
                <small>{w.role}</small>
              </button>
            ))}
          </div>
        ) : null}
        <WorkspaceForms />
        <MavenLink />
      </div>
    );
  return (
    <CollaborationContext.Provider
      value={{
        user: session.user,
        workspace,
        workspaces: session.workspaces,
        members,
        refreshMembers,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}
function AccountForm({
  onAuthenticated,
}: {
  onAuthenticated: () => Promise<void>;
}) {
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(register ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      await onAuthenticated();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="welcome">
      <span className="brand-symbol" aria-hidden="true">
        ✳
      </span>
      <span className="eyebrow">DHARMIC STUDIO · IMAGINE TOGETHER</span>
      <h1>Good ideas need somewhere to begin.</h1>
      <p>
        Collect your sources. Leave thoughts unfinished. Find the words
        together.
      </p>
      <form className="account-form" onSubmit={submit}>
        <h2>{register ? "Create your local account" : "Welcome back"}</h2>
        <label>
          Name
          <input
            required
            minLength={3}
            autoComplete="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 12 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary" disabled={busy}>
          {busy ? "Opening…" : register ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          className="quiet"
          onClick={() => {
            setRegister((v) => !v);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "New here? Create a local account"}
        </button>
      </form>
      <p className="pilot-caption">
        Local collaboration pilot. Accounts and workspaces live on this machine.
      </p>
      <MavenLink />
    </main>
  );
}
function WorkspaceForms({
  beforeLeave,
}: {
  beforeLeave?: () => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent, kind: "create" | "join") {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await beforeLeave?.();
      const result = await api<Workspace>(
        kind === "create" ? "/workspaces" : "/invites/redeem",
        {
          method: "POST",
          body: JSON.stringify(kind === "create" ? { name } : { token }),
        },
      );
      switchWorkspace(result.id);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  return (
    <div className="workspace-forms">
      <form onSubmit={(e) => submit(e, "create")}>
        <label>
          New workspace name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The project we’re trying to understand"
          />
        </label>
        <button disabled={busy} className="primary">
          Create workspace
        </button>
      </form>
      <form onSubmit={(e) => submit(e, "join")}>
        <label>
          Invitation token
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste a collaborator’s invitation"
          />
        </label>
        <button disabled={busy}>Join workspace</button>
      </form>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
export function WorkspaceBar({
  beforeLeave,
}: {
  beforeLeave: () => Promise<void>;
}) {
  const { user, workspace, workspaces, members, refreshMembers } =
    useCollaboration();
  const [manage, setManage] = useState(false),
    [error, setError] = useState("");
  async function change(id: string) {
    try {
      await beforeLeave();
      switchWorkspace(id);
    } catch (e) {
      setError(String(e));
    }
  }
  async function logout() {
    try {
      await beforeLeave();
      await api("/logout", { method: "POST", body: "{}" });
      location.reload();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <div className="workspace-bar">
        <div className="workspace-picker">
          <label htmlFor="workspace-picker">Workspace</label>
          <select
            id="workspace-picker"
            value={workspace.id}
            onChange={(e) => void change(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <span className="role-badge">{workspace.role}</span>
        </div>
        <span className="async-caption">
          Shared work · refresh to see others’ changes
        </span>
        <div className="identity-actions">
          <button
            className="quiet"
            onClick={() => {
              void refreshMembers().catch((e) => setError(String(e)));
              setManage(true);
            }}
          >
            People & workspaces
          </button>
          <span>{user.name}</span>
          <button className="quiet" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
      {error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : null}
      {manage ? (
        <TeamDialog
          beforeLeave={beforeLeave}
          workspace={workspace}
          members={members}
          onClose={() => setManage(false)}
        />
      ) : null}
    </>
  );
}
function TeamDialog({
  workspace,
  members,
  onClose,
  beforeLeave,
}: {
  workspace: Workspace;
  members: Member[];
  onClose: () => void;
  beforeLeave: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [role, setRole] = useState<"editor" | "viewer">("editor"),
    [invite, setInvite] = useState<{
      token: string;
      expires_at: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function createInvite() {
    try {
      setInvite(
        await api("/workspaces/" + workspace.id + "/invites", {
          method: "POST",
          body: JSON.stringify({ role }),
        }),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <dialog className="card-dialog team-dialog" ref={dialog} onCancel={onClose}>
      <div className="modal-heading">
        <div>
          <span className="eyebrow">PEOPLE MAKE THE PROJECT</span>
          <h2>{workspace.name}</h2>
        </div>
        <button
          className="quiet"
          onClick={onClose}
          aria-label="Close people dialog"
        >
          ×
        </button>
      </div>
      <ul className="member-list">
        {members.map((m) => (
          <li key={m.user_id}>
            <strong>{m.name}</strong>
            <span>{m.role}</span>
          </li>
        ))}
      </ul>
      {workspace.role === "owner" ? (
        <div className="invite-form">
          <label>
            Invite as
            <select
              aria-label="Invite role"
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            >
              <option value="editor">Editor — contribute and review</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </label>
          <button onClick={createInvite}>Create invitation</button>
          {invite ? (
            <div>
              <label>
                Invitation token
                <textarea readOnly value={invite.token} />
              </label>
              <p className="field-help">
                Share this token privately. Expires {invite.expires_at}. The
                recipient signs in and chooses Join workspace.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p>Workspace owners manage invitations and review policy.</p>
      )}
      <h3>Start or join another workspace</h3>
      <WorkspaceForms beforeLeave={beforeLeave} />
      {error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : null}
      <button className="quiet" onClick={onClose}>
        Done
      </button>
    </dialog>
  );
}

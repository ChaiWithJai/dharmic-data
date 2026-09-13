import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Tldraw, atom, useValue, getDefaultUserPresence } from "tldraw";
import { useSync } from "@tldraw/sync";
import { getAssetUrlsByImport } from "@tldraw/assets/imports.vite";
import "tldraw/tldraw.css";
import "./style.css";
const assetUrls = getAssetUrlsByImport();
const overrides = {
  actions(_editor, actions) {
    const result = { ...actions };
    delete result["open-cursor-chat"];
    return result;
  },
};
const components = { CursorChatBubble: null };
const assets = {
  upload: async () => {
    throw Error("Image uploads are not enabled in this live-board proof.");
  },
  resolve: () => null,
};
async function request(path, body) {
  const r = await fetch("/live/" + path, {
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.detail || "Request failed");
  return data;
}
function Presence({ editor }) {
  const peers = useValue("people", () => editor.getCollaborators(), [editor]);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const byUser = new Map();
  for (const p of peers)
    if (
      !byUser.has(p.userId) ||
      p.lastActivityTimestamp > byUser.get(p.userId).lastActivityTimestamp
    )
      byUser.set(p.userId, p);
  const unique = [...byUser.values()];
  return (
    <div aria-label="People on this board" className="people">
      {unique.length
        ? unique.map((p) => (
            <span key={p.userId}>
              {p.userName} ·{" "}
              {clock - p.lastActivityTimestamp > 120000 ? "idle" : "active"}
            </span>
          ))
        : "You are the only connected collaborator."}
    </div>
  );
}
function Board({ user, workspace }) {
  const [editor, setEditor] = useState(null),
    [proposals, setProposals] = useState([]),
    [error, setError] = useState(""),
    [text, setText] = useState("");
  const users = useMemo(() => {
    const current = atom("authenticated user", {
      id: "user:" + user.id,
      typeName: "user",
      name: user.name,
      color: ["#7664c4", "#156f68", "#b34d31", "#3268a6"][
        parseInt(user.id.slice(0, 2), 16) % 4
      ],
      imageUrl: "",
      meta: {},
    });
    return { currentUser: current };
  }, [user.id, user.name]);
  const hidden = useMemo(() => atom("page hidden", document.hidden), []);
  useEffect(() => {
    const update = () => hidden.set(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [hidden]);
  const presence = useMemo(
    () => (store, user) => {
      const p = getDefaultUserPresence(store, user);
      return p
        ? {
            ...p,
            lastActivityTimestamp: hidden.get() ? 0 : p.lastActivityTimestamp,
          }
        : null;
    },
    [hidden],
  );
  const store = useSync({
    getUserPresence: presence,
    uri: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/live/connect/${workspace.id}`,
    assets,
    users,
  });
  async function refresh() {
    try {
      setProposals(
        (await request(`rooms/${workspace.id}/proposals`)).proposals,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [workspace.id]);
  async function decide(id, decision) {
    try {
      await request(`rooms/${workspace.id}/proposals/${id}/${decision}`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  const editable = ["owner", "editor"].includes(workspace.role);
  return (
    <>
      <header>
        <a href="/">Imagine Together</a>
        <strong>{workspace.name} · live board</strong>
        <span>
          {store.status === "synced-remote"
            ? store.connectionStatus
            : store.status}
        </span>
      </header>
      <div className="notice">
        Separate live board · Existing sources and canvas are preserved · Buzz
        is not connected yet
      </div>
      {editor && <Presence editor={editor} />}
      <main>
        <section className="canvas" aria-label="Live shared whiteboard">
          <Tldraw
            store={store}
            overrides={overrides}
            components={components}
            assetUrls={assetUrls}
            licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
            onMount={(ed) => {
              setEditor(ed);
              if (import.meta.env.DEV) window.__liveEditor = ed;
            }}
          />
        </section>
        <aside>
          <h2>Propose a thought</h2>
          <p>
            Agents can propose a note here. A collaborator decides whether it
            belongs on the board.
          </p>
          {editable && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await request(`rooms/${workspace.id}/proposals`, {
                    event_id: crypto.randomUUID(),
                    text,
                    x: 100,
                    y: 100,
                  });
                  setText("");
                  await refresh();
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <label htmlFor="thought">Unfinished thought</label>
              <textarea
                id="thought"
                required
                maxLength={3000}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button>Propose note</button>
            </form>
          )}
          {error && <p role="alert">{error}</p>}
          <h2>Review proposals</h2>
          {proposals.length === 0 && <p>No proposals yet.</p>}
          {proposals.map((p) => (
            <article key={p.id}>
              <strong>
                {p.body.author_kind === "agent"
                  ? "AI proposal · needs your judgment"
                  : "Collaborator proposal"}
              </strong>
              <p>{p.body.text}</p>
              <small>{p.state}</small>
              {p.state === "pending" && editable && (
                <div>
                  <button onClick={() => decide(p.id, "accept")}>
                    Add to board
                  </button>
                  <button onClick={() => decide(p.id, "reject")}>
                    Decline
                  </button>
                </div>
              )}
            </article>
          ))}
          <p>
            Comments and mentions will use Buzz once its server connection is
            qualified. These proposal records remain local.
          </p>
          <a href="https://maven.com/a-plus" target="_blank" rel="noreferrer">
            Imagine together in Jai’s workshops
          </a>
        </aside>
      </main>
    </>
  );
}
function App() {
  const [session, setSession] = useState(null),
    [error, setError] = useState(""),
    [workspace, setWorkspace] = useState(null);
  useEffect(() => {
    request("session")
      .then(setSession)
      .catch(() => {});
  }, []);
  if (session && workspace)
    return <Board user={session.user} workspace={workspace} />;
  return (
    <div className="entry">
      <h1>Imagine Together</h1>
      <h2>Capture an unfinished thought. See it take shape together.</h2>
      <p>
        This local live-board lab uses your existing Imagine Together account.
        It creates a separate live board for each workspace.
      </p>
      {error && <p role="alert">{error}</p>}
      {!session ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await request("login", {
                name: f.get("name"),
                password: f.get("password"),
              });
              setSession(await request("session"));
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <label>
            Account name
            <input name="name" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button>Sign in</button>
        </form>
      ) : (
        <>
          <p>Signed in as {session.user.name}</p>
          {session.workspaces.map((w) => (
            <button
              className="workspace"
              key={w.id}
              onClick={() => setWorkspace(w)}
            >
              {w.name} · {w.role}
            </button>
          ))}
          {!session.workspaces.length && (
            <p>
              Create or join a workspace in the{" "}
              <a href="http://127.0.0.1:8790">local app</a> first.
            </p>
          )}
        </>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

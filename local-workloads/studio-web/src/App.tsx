import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Board from "./Board";
import { createTLStore, defaultShapeUtils, loadSnapshot } from "tldraw";
import type { BoardHandle } from "./Board";
import { api, safeLink } from "./api";
import type { Card } from "./api";
import { MavenLink, WorkspaceBar, useCollaboration } from "./Collaboration";
import Alignment from "./Alignment";
import { workspaceScope } from "./api";

const themes = [
  "Courage",
  "Passion",
  "Creative Imagination",
  "Grant research",
  "Unsorted",
];
const empty = {
  title: "",
  source_url: "",
  quote: "",
  note: "",
  theme: "Unsorted",
};
type Draft = typeof empty;
type Job = {
  job_id?: string;
  id?: string;
  state: string;
  result?: string | { text?: string };
  trace_url?: string;
  evidence_url?: string;
  error?: string;
  instruction?: string;
  card_ids?: string[];
  card_revisions?: Record<string, number>;
  created_at?: string;
};
export default function App() {
  const { workspace, members } = useCollaboration();
  const canWrite = workspace.role !== "viewer",
    canOwn = workspace.role === "owner";
  const [tab, setTab] = useState<"canvas" | "alignment">("canvas"),
    [alignmentVisited, setAlignmentVisited] = useState(false);
  const jobStorageKey = "imagine-together.active-job." + workspaceScope;
  const [cards, setCards] = useState<Card[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState("All"),
    [selected, setSelected] = useState<string[]>([]),
    [edit, setEdit] = useState<Card | "new" | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [showAI, setShowAI] = useState(false),
    [instruction, setInstruction] = useState(""),
    [job, setJob] = useState<Job | null>(null),
    [busy, setBusy] = useState(false),
    [applyTargets, setApplyTargets] = useState<Card[]>([]),
    [activeJobId, setActiveJobId] = useState(""),
    [feedbackReason, setFeedbackReason] = useState(""),
    [feedbackSaved, setFeedbackSaved] = useState<boolean | null>(null),
    [feedbackBusy, setFeedbackBusy] = useState(false),
    [importingResearch, setImportingResearch] = useState(false),
    [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const board = useRef<BoardHandle>(null),
    importFile = useRef<HTMLInputElement>(null),
    poll = useRef<ReturnType<typeof setTimeout> | null>(null),
    cardsRef = useRef<Card[]>(cards),
    pollGeneration = useRef(0);
  cardsRef.current = cards;
  const notify = useCallback((text: string) => setMessage(text), []);
  const refresh = useCallback(async () => {
    const result = await api<{ cards: Card[] }>("/cards");
    cardsRef.current = result.cards;
    setCards(result.cards);
    setLoading(false);
  }, []);
  const refreshRecent = useCallback(async () => {
    const result = await api<{ jobs: Job[] }>("/jobs");
    setRecentJobs(result.jobs);
    return result.jobs;
  }, []);
  const openJob = useCallback(
    (jobId: string, fallback: Card[] = []) => {
      if (poll.current) clearTimeout(poll.current);
      const generation = ++pollGeneration.current;
      setActiveJobId(jobId);
      setJob(null);
      setBusy(true);
      setFeedbackSaved(null);
      setFeedbackReason("");
      setApplyTargets(fallback);
      setShowAI(true);
      try {
        localStorage.setItem(jobStorageKey, jobId);
      } catch {}
      let first = true;
      const check = async () => {
        try {
          const result = await api<Job>("/jobs/" + jobId);
          if (generation !== pollGeneration.current) return;
          setJob(result);
          if (first) {
            first = false;
            if (result.instruction) setInstruction(result.instruction);
            if (result.card_ids)
              setSelected(
                result.card_ids.filter((id) =>
                  cardsRef.current.some((card) => card.id === id),
                ),
              );
            if (result.card_revisions)
              setApplyTargets(
                cardsRef.current.filter(
                  (card) => result.card_revisions?.[card.id] === card.revision,
                ),
              );
          }
          if (
            [
              "completed",
              "succeeded",
              "finished",
              "done",
              "failed",
              "error",
              "canceled",
              "cancelled",
              "interrupted",
            ].includes(result.state.toLowerCase())
          ) {
            setBusy(false);
            void refreshRecent().catch(() => {});
          } else poll.current = setTimeout(() => void check(), 1500);
        } catch (e) {
          if (generation === pollGeneration.current) {
            setError(String(e));
            setBusy(false);
          }
        }
      };
      void check();
    },
    [refreshRecent, jobStorageKey],
  );
  useEffect(() => {
    let active = true;
    void Promise.all([refresh(), refreshRecent().catch(() => [])])
      .then(([, jobs]) => {
        if (!active || !jobs.length) return;
        let saved = "";
        try {
          saved = localStorage.getItem(jobStorageKey) || "";
        } catch {}
        const target =
          jobs.find((j) => (j.job_id || j.id) === saved) || jobs[0];
        const id = target.job_id || target.id;
        if (id) openJob(id);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    return () => {
      active = false;
      pollGeneration.current++;
      if (poll.current) clearTimeout(poll.current);
    };
  }, [refresh, refreshRecent, openJob, jobStorageKey]);
  const filtered = cards.filter(
    (card) =>
      (theme === "All" || card.theme === theme) &&
      [card.title, card.quote, card.note, card.source_url]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const resultText =
    typeof job?.result === "string" ? job.result : job?.result?.text || "";
  async function changeTab(next: "canvas" | "alignment") {
    try {
      await board.current?.flush();
      if (next === "alignment") setAlignmentVisited(true);
      setTab(next);
    } catch (e) {
      setError(String(e));
    }
  }
  async function beforeLeave() {
    if (
      document.querySelector('[data-brief-dirty="true"]') &&
      !confirm("Your brief has unsaved changes. Leave without saving?")
    )
      throw new Error("Stay on Alignment to save or copy your draft.");
    await board.current?.flush();
  }
  async function downloadEvidence() {
    try {
      if (!job?.evidence_url?.startsWith("/api/jobs/")) return;
      const data = await api(job.evidence_url.slice(4));
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "request-evidence.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    }
  }
  async function saveCard(draft: Draft, original?: Card) {
    const value = await api<Card>(
      original ? "/cards/" + original.id : "/cards",
      {
        method: original ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft,
          ...(original ? { revision: original.revision } : {}),
        }),
      },
    );
    setCards((old) =>
      original
        ? old.map((c) => (c.id === value.id ? value : c))
        : [value, ...old],
    );
    setEdit(null);
    notify(
      original
        ? "Source card updated. Canvas copies stay as you arranged them."
        : "Saved to your swipe file. Add it to the canvas whenever you’re ready.",
    );
  }
  async function remove(card: Card) {
    if (
      !confirm(
        "Delete “" +
          card.title +
          "” from your swipe file? Existing canvas copies will stay.",
      )
    )
      return;
    try {
      await api("/cards/" + card.id, { method: "DELETE" });
      setCards((old) => old.filter((c) => c.id !== card.id));
      setSelected((old) => old.filter((id) => id !== card.id));
      notify("Card deleted.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function ask() {
    if (!instruction.trim() || !selected.length) return;
    setBusy(true);
    setJob(null);
    setError("");
    const originals = cards.filter((c) => selected.includes(c.id));
    try {
      const { job_id } = await api<{ job_id: string }>("/ai", {
        method: "POST",
        body: JSON.stringify({
          card_ids: selected,
          instruction: instruction.trim(),
        }),
      });
      openJob(job_id, originals);
      void refreshRecent().catch(() => {});
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  async function feedback(value: boolean) {
    setFeedbackBusy(true);
    try {
      await api("/jobs/" + activeJobId + "/feedback", {
        method: "POST",
        body: JSON.stringify({ value, reason: feedbackReason }),
      });
      setFeedbackSaved(value);
      notify("Your feedback is recorded with this request in MLflow.");
    } catch (e) {
      setError(String(e));
    } finally {
      setFeedbackBusy(false);
    }
  }
  async function apply(card: Card) {
    try {
      const updated = await api<Card>("/cards/" + card.id, {
        method: "PUT",
        body: JSON.stringify({
          ...card,
          note: [card.note, resultText].filter(Boolean).join("\n\n"),
          applied_suggestion_id: activeJobId,
          revision: card.revision,
        }),
      });
      setCards((old) => old.map((c) => (c.id === updated.id ? updated : c)));
      setApplyTargets((old) => old.filter((c) => c.id !== card.id));
      notify(
        "Suggestion appended to your note. The source quotation is unchanged.",
      );
    } catch (e) {
      setError(
        "Suggestion was not applied. The card may have changed since this request. " +
          String(e),
      );
    }
  }
  async function addResearch() {
    setImportingResearch(true);
    try {
      const result = await api<{ added: number; skipped: number }>(
        "/research/import",
        { method: "POST", body: "{}" },
      );
      await refresh();
      notify(
        `Added ${result.added} grant research cards; ${result.skipped} already in your library. Your canvas is unchanged.`,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setImportingResearch(false);
    }
  }
  async function exportAll() {
    try {
      await board.current?.flush();
      const data = await api("/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "dharmic-studio-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      notify("Workspace backup downloaded.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function importAll(file: File) {
    try {
      const backup = JSON.parse(await file.text());
      if (backup.board?.snapshot) {
        const validationStore = createTLStore({
          shapeUtils: defaultShapeUtils,
        });
        loadSnapshot(validationStore, { document: backup.board.snapshot });
      }
      if (
        !confirm(
          "Restore this backup? It will replace your current cards and canvas. A pre-restore backup is kept on this machine.",
        )
      )
        return;
      await board.current?.flush();
      await api("/import", { method: "POST", body: JSON.stringify(backup) });
      location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      if (importFile.current) importFile.current.value = "";
    }
  }
  return (
    <>
      <a className="skip" href="#library">
        Skip to swipe file
      </a>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-symbol" aria-hidden="true">
            ✳
          </span>
          <span>
            Imagine <strong>together</strong>
            <small>A shared place for unfinished thoughts</small>
          </span>
        </a>
        <div className="top-actions">
          <span className="local-badge">
            <i /> Local collaboration pilot
          </span>
          <button className="quiet" onClick={exportAll}>
            Export backup
          </button>
          <button
            className="quiet"
            disabled={!canOwn}
            onClick={() => importFile.current?.click()}
          >
            Restore backup
          </button>
          <input
            ref={importFile}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importAll(file);
            }}
          />
          <MavenLink />
          <button
            className={showAI ? "ai-toggle active" : "ai-toggle"}
            aria-expanded={showAI}
            onClick={() => {
              if (tab === "alignment") { void changeTab("canvas"); setShowAI(true); }
              else setShowAI((v) => !v);
            }}
          >
            ✧ Ask Bonsai
          </button>
        </div>
      </header>
      <WorkspaceBar beforeLeave={beforeLeave} />
      <nav className="studio-tabs" aria-label="Workspace views">
        <button
          aria-current={tab === "canvas" ? "page" : undefined}
          onClick={() => void changeTab("canvas")}
        >
          Canvas & sources
        </button>
        <button
          aria-current={tab === "alignment" ? "page" : undefined}
          onClick={() => void changeTab("alignment")}
        >
          Alignment & decisions
        </button>
        <span>
          {workspace.name} ·{" "}
          {workspace.role === "viewer"
            ? "Read-only"
            : "Your team's working space"}
        </span>
      </nav>
      <div
        className="workspace collaboration-workspace"
        style={{ display: tab === "canvas" ? "flex" : "none" }}
      >
        <aside className="library" id="library">
          <div className="library-head">
            <div className="eyebrow">COLLECT WHAT MOVES YOU</div>
            <div className="title-row">
              <h1>Our swipe file</h1>
              <span className="count">{cards.length}</span>
            </div>
            <p>Words, examples, and ideas worth returning to.</p>
            <button
              className="primary new-card"
              disabled={!canWrite}
              onClick={() => setEdit("new")}
            >
              ＋ Capture something
            </button>
            <button
              className="research-import quiet"
              disabled={importingResearch || !canWrite}
              onClick={addResearch}
            >
              {importingResearch
                ? "Adding research…"
                : "＋ Add 30 grant examples"}
            </button>
            <label className="search">
              <span className="sr-only">Search your swipe file</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search words, notes, or sources…"
              />
            </label>
            <div className="filters" aria-label="Filter by theme">
              {["All", ...themes].map((t) => (
                <button
                  key={t}
                  className={theme === t ? "selected" : ""}
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="card-list">
            {loading ? (
              <p>Opening your library…</p>
            ) : filtered.length === 0 ? (
              <div className="empty-library">
                <span aria-hidden="true">↗</span>
                <h2>
                  {cards.length ? "Nothing here yet." : "Begin with one thing."}
                </h2>
                <p>
                  {cards.length
                    ? "Try a different search or theme."
                    : "A sentence you underlined. A question that stayed with you. A story you want to teach."}
                </p>
                {!cards.length ? (
                  <button onClick={() => setEdit("new")}>
                    Capture your first card
                  </button>
                ) : null}
                <MavenLink />
              </div>
            ) : (
              filtered.map((card) => (
                <article
                  key={card.id}
                  className={
                    "source-card " +
                    (selected.includes(card.id) ? "is-selected" : "")
                  }
                >
                  <div className="card-meta">
                    <span
                      className={
                        "theme-chip " +
                        card.theme.toLowerCase().replaceAll(" ", "-")
                      }
                    >
                      {card.theme}
                    </span>
                    <label className="select-card">
                      <input
                        type="checkbox"
                        disabled={!canWrite}
                        checked={selected.includes(card.id)}
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...old, card.id]
                              : old.filter((id) => id !== card.id),
                          )
                        }
                      />
                      <span className="sr-only">
                        Select {card.title} for Bonsai
                      </span>
                    </label>
                  </div>
                  <button className="card-title" onClick={() => setEdit(card)}>
                    {card.title}
                  </button>
                  {card.created_by ? (
                    <p className="card-author">
                      Added by{" "}
                      {members.find((m) => m.user_id === card.created_by)
                        ?.name ||
                        card.author_name ||
                        card.created_by}
                    </p>
                  ) : null}
                  {card.quote ? <blockquote>{card.quote}</blockquote> : null}
                  {card.note ? <p className="card-note">{card.note}</p> : null}
                  {safeLink(card.source_url) ? (
                    <a
                      className="source-link"
                      href={safeLink(card.source_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source ↗
                    </a>
                  ) : card.source_url ? (
                    <span className="source-link">{card.source_url}</span>
                  ) : null}
                  <div className="card-actions">
                    <button
                      disabled={!canWrite}
                      onClick={() => board.current?.addCard(card)}
                    >
                      ＋ Add to canvas
                    </button>
                    <button className="quiet" onClick={() => setEdit(card)}>
                      {canWrite ? "Edit" : "Read"}
                    </button>
                    <button
                      className="quiet delete"
                      disabled={!canWrite}
                      aria-label={"Delete " + card.title}
                      onClick={() => remove(card)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="library-foot">
            {selected.length
              ? `${selected.length} selected for Bonsai`
              : "Your source material stays yours."}
          </div>
        </aside>
        <main className="main-canvas">
          <Board ref={board} onMessage={notify} readOnly={!canWrite} />
        </main>
        {showAI ? (
          <aside className="ai-panel" aria-label="Bonsai suggestions">
            <div className="eyebrow">A THINKING PARTNER</div>
            <h2>Ask Bonsai</h2>
            <label htmlFor="recent-jobs">Recent suggestions</label>
            <div className="recent-jobs">
              <select
                id="recent-jobs"
                value={activeJobId}
                onChange={(e) => {
                  if (e.target.value) openJob(e.target.value);
                }}
              >
                <option value="">Open an earlier request…</option>
                {recentJobs.map((item) => (
                  <option
                    key={item.job_id || item.id}
                    value={item.job_id || item.id}
                  >
                    {(item.instruction || "Untitled request").slice(0, 58)} ·{" "}
                    {item.state}
                  </option>
                ))}
              </select>
              <button
                className="quiet"
                onClick={() =>
                  void refreshRecent().catch((e) => setError(String(e)))
                }
                aria-label="Refresh recent suggestions"
              >
                ↻
              </button>
            </div>
            <p>
              Select cards in your swipe file, then ask a question or explore
              another way to say it.
            </p>
            <div className="selected-summary">
              {selected.length
                ? `${selected.length} source ${selected.length === 1 ? "card" : "cards"} selected`
                : "Select at least one card to begin"}
            </div>
            <label htmlFor="instruction">What would help you think?</label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="What connects these ideas about courage?"
              rows={5}
            />
            <div className="prompt-chips">
              <button
                onClick={() =>
                  setInstruction(
                    "Ask me three thoughtful questions that help me connect these sources to my own experience. Do not invent experiences for me.",
                  )
                }
              >
                Ask me questions
              </button>
              <button
                onClick={() =>
                  setInstruction(
                    "Suggest a clearer version of my notes, preserving my meaning and distinguishing source quotations from your suggestions.",
                  )
                }
              >
                Clarify my notes
              </button>
            </div>
            <button
              className="primary"
              disabled={
                !canWrite || busy || !selected.length || !instruction.trim()
              }
              onClick={ask}
            >
              {busy ? "Bonsai is thinking…" : "Make a suggestion"}
            </button>
            <p className="small-note">
              Suggestions wait for you. Nothing is applied automatically.
            </p>
            {job?.error ? (
              <div className="inline-error" role="alert">
                {job.error}
              </div>
            ) : null}
            {resultText ? (
              <div className="suggestion">
                <span className="eyebrow">BONSAI SUGGESTION</span>
                <div className="suggestion-text">{resultText}</div>
                {job?.evidence_url ? (
                  <button onClick={downloadEvidence}>
                    Download scoped request evidence
                  </button>
                ) : null}
                <h3>Did this help?</h3>
                <label htmlFor="feedback-reason">
                  What would make it better? (optional)
                </label>
                <textarea
                  id="feedback-reason"
                  rows={2}
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  placeholder="One specific correction or useful part…"
                />
                <div className="feedback-buttons">
                  <button
                    disabled={feedbackBusy || !canWrite}
                    aria-pressed={feedbackSaved === true}
                    onClick={() => feedback(true)}
                  >
                    Useful
                  </button>
                  <button
                    disabled={feedbackBusy || !canWrite}
                    aria-pressed={feedbackSaved === false}
                    onClick={() => feedback(false)}
                  >
                    Not useful
                  </button>
                </div>
                {feedbackSaved !== null ? (
                  <p className="small-note">
                    Feedback saved to this request’s trace.
                  </p>
                ) : null}
                <h3>Keep what’s useful</h3>
                {applyTargets.map((card) => (
                  <button
                    key={card.id}
                    disabled={
                      !canWrite ||
                      !cards.some(
                        (current) =>
                          current.id === card.id &&
                          current.revision === card.revision,
                      )
                    }
                    onClick={() => apply(card)}
                  >
                    Append to “{card.title}” note
                    {cards.some(
                      (current) =>
                        current.id === card.id &&
                        current.revision === card.revision,
                    )
                      ? ""
                      : " — card changed"}
                  </button>
                ))}
                {!applyTargets.length ? (
                  <p className="small-note">
                    No unchanged source card is available for automatic append.
                    You can copy the suggestion and edit a note manually.
                  </p>
                ) : null}
                <button
                  className="quiet"
                  onClick={() => {
                    pollGeneration.current++;
                    if (poll.current) clearTimeout(poll.current);
                    setJob(null);
                    setApplyTargets([]);
                    setActiveJobId("");
                    try {
                      localStorage.removeItem(jobStorageKey);
                    } catch {}
                  }}
                >
                  Discard suggestion
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
      {alignmentVisited ? (
        <div hidden={tab !== "alignment"}>
          <Alignment />
        </div>
      ) : null}
      <div className="announcements" aria-live="polite">
        {message ? (
          <div className="toast">
            {message}
            <button aria-label="Dismiss message" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="error-toast" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      ) : null}
      {edit ? (
        <CardEditor
          original={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
          onSave={saveCard}
          readOnly={!canWrite}
        />
      ) : null}
    </>
  );
}

function CardEditor({
  original,
  onClose,
  onSave,
  readOnly = false,
}: {
  original?: Card;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (draft: Draft, original?: Card) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(
      original
        ? {
            title: original.title,
            source_url: original.source_url,
            quote: original.quote,
            note: original.note,
            theme: original.theme,
          }
        : empty,
    ),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function field(key: keyof Draft, value: string) {
    setDraft((old) => ({ ...old, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draft, original);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }
  return (
    <dialog ref={dialog} className="card-dialog" onCancel={onClose}>
      <form onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">YOUR WORDS. YOUR CONNECTIONS.</span>
            <h2>
              {original
                ? readOnly
                  ? "Read source card"
                  : "Edit source card"
                : "Capture something worth keeping"}
            </h2>
          </div>
          <button
            type="button"
            className="quiet"
            onClick={onClose}
            aria-label="Close card editor"
          >
            ×
          </button>
        </div>
        <label>
          Title
          <input
            aria-label="Title"
            autoFocus
            readOnly={readOnly}
            required
            maxLength={300}
            value={draft.title}
            onChange={(e) => field("title", e.target.value)}
            placeholder="Give this thought a name"
          />
        </label>
        <div className="form-row">
          <label>
            Source URL or reference
            <input
              aria-label="Source URL or reference"
              readOnly={readOnly}
              value={draft.source_url}
              onChange={(e) => field("source_url", e.target.value)}
              placeholder="https://… or book, page 42"
            />
          </label>
          <label>
            Theme
            <select
              aria-label="Theme"
              disabled={readOnly}
              value={draft.theme}
              onChange={(e) => field("theme", e.target.value)}
            >
              {themes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Original passage
          <textarea
            aria-label="Original passage"
            readOnly={readOnly}
            rows={4}
            value={draft.quote}
            onChange={(e) => field("quote", e.target.value)}
            placeholder="Paste the source’s exact words here."
          />
        </label>
        <p className="field-help">
          Kept separate from your interpretation. Bonsai never rewrites this
          field.
        </p>
        <label>
          Team note · human interpretation
          <textarea
            aria-label="Team note"
            readOnly={readOnly}
            rows={4}
            value={draft.note}
            onChange={(e) => field("note", e.target.value)}
            placeholder="Why did this catch your attention? Where might you use it?"
          />
        </label>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="quiet" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={saving || readOnly}
          >
            {saving ? "Saving…" : "Save to swipe file"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

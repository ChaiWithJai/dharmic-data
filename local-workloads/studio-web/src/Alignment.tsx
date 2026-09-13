import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, apiText } from "./api";
import type { Card } from "./api";
import { MavenLink, useCollaboration } from "./Collaboration";
interface Canonical {
  revision: number;
  title: string;
  body: string;
  source_card_ids: string[];
  source_refs: { id: string; revision: number }[];
  required_reviewers: string[];
  content_hash: string;
  approvals: {
    user_id: string;
    name: string;
    decision: string;
    reason: string;
    revision: number;
  }[];
  aligned: boolean;
  sources_current: boolean;
  last_published_revision: number | null;
}
interface Decision {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  created_by: string;
  created_at: string;
  source_card_ids: string[];
}
const template = `## What we are trying to do\n\n[In our own words.]\n\n## Who this is for\n\n[The people and recurring problem.]\n\n## What we have actually observed\n\n[Source-backed facts. Keep hopes separate.]\n\n## What we imagine doing\n\n[Our proposal, not a past achievement.]\n\n## What is unresolved\n\n[Questions, disagreements, and missing evidence.]\n\n## One next step\n\n[Owner, action, and what we will learn.]\n`;
export default function Alignment() {
  const { user, workspace, members } = useCollaboration(),
    canEdit = workspace.role !== "viewer",
    owner = workspace.role === "owner";
  const [canonical, setCanonical] = useState<Canonical | null>(null),
    [cards, setCards] = useState<Card[]>([]),
    [decisions, setDecisions] = useState<Decision[]>([]),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [sources, setSources] = useState<string[]>([]),
    [reviewers, setReviewers] = useState<string[]>([]),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [decisionTitle, setDecisionTitle] = useState(""),
    [decisionText, setDecisionText] = useState(""),
    [rationale, setRationale] = useState("");
  const load = useCallback(async () => {
    const [doc, library, ledger] = await Promise.all([
      api<Canonical>("/canonical"),
      api<{ cards: Card[] }>("/cards"),
      api<{ decisions: Decision[] }>("/decisions"),
    ]);
    setCanonical(doc);
    setTitle(doc.title);
    setBody(doc.body);
    setSources(doc.source_card_ids);
    setReviewers(doc.required_reviewers);
    setCards(library.cards);
    setDecisions(ledger.decisions);
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, [load]);
  const dirty =
    !!canonical &&
    (title !== canonical.title ||
      body !== canonical.body ||
      JSON.stringify(sources) !== JSON.stringify(canonical.source_card_ids) ||
      JSON.stringify(reviewers) !==
        JSON.stringify(canonical.required_reviewers));
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function toggle(values: string[], id: string) {
    return values.includes(id)
      ? values.filter((v) => v !== id)
      : [...values, id];
  }
  async function save() {
    if (!canonical) return;
    setBusy(true);
    setError("");
    try {
      await api("/canonical", {
        method: "PUT",
        body: JSON.stringify({
          revision: canonical.revision,
          title,
          body,
          source_card_ids: sources,
          required_reviewers: reviewers,
        }),
      });
      await load();
      setMessage(
        "Saved a new revision. Reviewers approve this version explicitly.",
      );
    } catch (e) {
      setError(
        String(e) +
          " Your unsaved text remains in the editor. Copy it before refreshing.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function review(decision: "approve" | "changes_requested") {
    if (!canonical) return;
    setBusy(true);
    setError("");
    try {
      await api("/canonical/review", {
        method: "POST",
        body: JSON.stringify({
          revision: canonical.revision,
          content_hash: canonical.content_hash,
          decision,
          reason,
        }),
      });
      await load();
      setReason("");
      setMessage(
        decision === "approve"
          ? "Your approval is recorded for this exact revision."
          : "Your request for changes is recorded.",
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!canonical) return;
    setBusy(true);
    setError("");
    try {
      await api("/canonical/publish", {
        method: "POST",
        body: JSON.stringify({
          revision: canonical.revision,
          content_hash: canonical.content_hash,
        }),
      });
      await load();
      setMessage("This exact revision is now the published canonical brief.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function exportBrief() {
    try {
      const text = await apiText("/canonical/export"),
        url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "canonical-brief.md";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Saved canonical brief exported with its review status.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function addDecision(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/decisions", {
        method: "POST",
        body: JSON.stringify({
          title: decisionTitle,
          decision: decisionText,
          rationale,
          source_card_ids: sources,
        }),
      });
      setDecisionTitle("");
      setDecisionText("");
      setRationale("");
      const updated = await api<{ decisions: Decision[] }>("/decisions");
      setDecisions(updated.decisions);
      setMessage("Decision added to the workspace ledger.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    if (
      dirty &&
      !confirm(
        "Refresh the saved brief? Your unsaved editor changes will be replaced. Copy them first if you need to keep them.",
      )
    )
      return;
    try {
      await load();
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  if (!canonical)
    return (
      <main className="alignment">
        <h1>Opening the shared brief…</h1>
        {error ? (
          <p role="alert" className="inline-error">
            {error}
          </p>
        ) : null}
      </main>
    );
  const canReview =
    canEdit &&
    canonical.required_reviewers.includes(user.id) &&
    !dirty &&
    canonical.sources_current;
  const allApproved =
    canonical.aligned &&
    canonical.sources_current &&
    canonical.required_reviewers.length > 0;
  return (
    <main className="alignment" data-brief-dirty={dirty}>
      <header className="alignment-heading">
        <div>
          <span className="eyebrow">
            MAKE YOUR SHARED UNDERSTANDING VISIBLE
          </span>
          <h1>What we mean. What we agree to.</h1>
          <p>
            A working brief, named reviewers, and the reasons behind your
            decisions.
          </p>
        </div>
        <button onClick={refresh}>Refresh shared state</button>
      </header>
      {message ? (
        <p className="alignment-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : null}
      <div className="alignment-grid">
        <section className="brief-editor">
          <div className="brief-toolbar">
            <h2>Canonical project brief</h2>
            <span className="revision-badge">
              Revision {canonical.revision}
            </span>
          </div>
          <p className="small-note">
            Write in your own words. Sources, proposals, and uncertainties can
            sit beside each other.
          </p>
          <label htmlFor="brief-title">Working title</label>
          <input
            id="brief-title"
            readOnly={!canEdit}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are we trying to make possible?"
          />
          <label htmlFor="brief-body">Project brief · Markdown</label>
          <textarea
            id="brief-body"
            readOnly={!canEdit}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            placeholder={template}
          />
          {canEdit && !body ? (
            <button className="quiet" onClick={() => setBody(template)}>
              Start with open questions
            </button>
          ) : null}
          <details className="source-picker">
            <summary>Supporting source cards ({sources.length})</summary>
            <p>
              Saving captures these cards’ current revisions. Later source edits
              make review stale.
            </p>
            {cards.length ? (
              cards.map((card) => (
                <label key={card.id} className="check-row">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={sources.includes(card.id)}
                    onChange={() => setSources((old) => toggle(old, card.id))}
                  />
                  <span>
                    {card.title}
                    <small>
                      Current revision {card.revision} · {card.theme}
                      {canonical.source_refs.find(ref => ref.id === card.id) ? ` · Brief cites revision ${canonical.source_refs.find(ref => ref.id === card.id)?.revision}` : ""}
                    </small>
                  </span>
                </label>
              ))
            ) : (
              <p>Capture source material on the Canvas tab first.</p>
            )}
          </details>
          <div className="brief-actions">
            {canEdit ? (
              <button
                className="primary"
                disabled={busy || !title.trim()}
                onClick={save}
              >
                Save brief revision
              </button>
            ) : null}
            <span role="status">
              {dirty
                ? "Unsaved draft · existing approvals apply only to the saved version"
                : "Showing the saved revision"}
            </span>
          </div>
          <div className="export-row">
            <button onClick={exportBrief}>Export saved brief</button>
            <MavenLink />
          </div>
        </section>
        <aside className="alignment-review">
          <div
            className={
              "alignment-status " +
              (allApproved && !dirty ? "agreed" : "pending")
            }
          >
            <span className="eyebrow">CURRENT SAVED REVISION</span>
            <h2>
              {dirty
                ? "Draft changes need review"
                : !canonical.sources_current
                  ? "Source changes need review"
                  : allApproved
                    ? "Reviewers have approved"
                    : "Still finding agreement"}
            </h2>
            <p>
              {canonical.last_published_revision
                ? `Last published: revision ${canonical.last_published_revision}.`
                : "No published canonical version yet."}
            </p>
            <p>AI suggestions never count as someone’s agreement.</p>
          </div>
          <h3>Required reviewers</h3>
          <p className="small-note">
            {owner
              ? "Changing this list requires saving a new revision and fresh approval."
              : "Only the owner can change the review policy."}
          </p>
          {members
            .filter((m) => m.role !== "viewer")
            .map((m) => (
              <label key={m.user_id} className="check-row">
                <input
                  type="checkbox"
                  disabled={!owner}
                  checked={reviewers.includes(m.user_id)}
                  onChange={() => setReviewers((old) => toggle(old, m.user_id))}
                />
                <span>
                  {m.name}
                  <small>{m.role}</small>
                </span>
              </label>
            ))}
          {!reviewers.length ? (
            <p className="inline-error">
              Choose at least one required reviewer before claiming alignment.
            </p>
          ) : null}
          <h3>Recorded reviews</h3>
          {canonical.approvals.length ? (
            canonical.approvals.map((a, index) => (
              <article className="approval-card" key={a.user_id + "-" + index}>
                <strong>{a.name}</strong>
                <span>
                  {a.decision === "approve" ? "Approved" : "Changes requested"}{" "}
                  · revision {a.revision}
                </span>
                {a.reason ? <p>{a.reason}</p> : null}
              </article>
            ))
          ) : (
            <p className="small-note">Nobody has approved this revision yet.</p>
          )}
          {canEdit && canonical.required_reviewers.includes(user.id) ? (
            <div className="review-action">
              <label htmlFor="review-reason">Your review note</label>
              <textarea
                id="review-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What feels right, or what still needs to change?"
              />
              <button
                disabled={busy || !canReview}
                onClick={() => review("approve")}
              >
                Approve revision {canonical.revision}
              </button>
              <button
                disabled={busy || !canReview || !reason.trim()}
                onClick={() => review("changes_requested")}
              >
                Request changes
              </button>
            </div>
          ) : (
            <p className="small-note">
              {canEdit
                ? "You are not a required reviewer for this revision."
                : "You have read-only workspace access."}
            </p>
          )}
          {owner ? (
            <button
              className="primary publish"
              disabled={busy || !allApproved || dirty}
              onClick={publish}
            >
              Publish approved revision
            </button>
          ) : null}
          <p className="small-note">
            Content fingerprint:{" "}
            <code>{canonical.content_hash.slice(0, 16)}</code>
          </p>
        </aside>
      </div>
      <section className="decision-section">
        <div>
          <span className="eyebrow">REMEMBER WHY, NOT JUST WHAT</span>
          <h2>Our decision ledger</h2>
          <p>
            Record a choice and its rationale. A ledger entry does not replace
            required approval.
          </p>
        </div>
        <div className="decision-layout">
          <div className="decision-list">
            {decisions.length ? (
              decisions.map((d) => (
                <article className="decision-card" key={d.id}>
                  <h3>{d.title}</h3>
                  <p>{d.decision}</p>
                  <p className="decision-rationale">{d.rationale}</p>
                  <small>
                    {members.find((m) => m.user_id === d.created_by)?.name ||
                      d.created_by}{" "}
                    · {new Date(d.created_at).toLocaleString()}
                  </small>
                </article>
              ))
            ) : (
              <p className="empty-decision">
                Your first decision can be a small one. Leave a reason your
                future selves can understand.
              </p>
            )}
          </div>
          {canEdit ? (
            <form className="decision-form" onSubmit={addDecision}>
              <label>
                Decision title
                <input
                  required
                  value={decisionTitle}
                  onChange={(e) => setDecisionTitle(e.target.value)}
                />
              </label>
              <label>
                What we decided
                <textarea
                  required
                  rows={3}
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                />
              </label>
              <label>
                Why, including remaining uncertainty
                <textarea
                  required
                  rows={3}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              </label>
              <p className="small-note">
                Links the source cards currently selected above.
              </p>
              <button className="primary" disabled={busy}>
                Record decision
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Tldraw,
  createShapeId,
  getSnapshot,
  loadSnapshot,
  toRichText,
} from "tldraw";
import type { Editor, TLStoreSnapshot } from "tldraw";
import { getAssetUrlsByImport } from "@tldraw/assets/imports.vite";
import { api, ApiError } from "./api";
import type { Card } from "./api";
import "tldraw/tldraw.css";

const assets = getAssetUrlsByImport();
const canvasAvailable = import.meta.env.DEV || Boolean(import.meta.env.VITE_TLDRAW_LICENSE_KEY);
export interface BoardHandle {
  addCard: (card: Card) => void;
  flush: () => Promise<void>;
}
export default forwardRef<BoardHandle, functionProps>(function Board(
  { onMessage, readOnly = false },
  ref,
) {
  const editor = useRef<Editor | null>(null),
    revision = useRef(0),
    pending = useRef<TLStoreSnapshot | null>(null),
    saving = useRef<Promise<void> | null>(null),
    blocked = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initial, setInitial] = useState<{
      snapshot: TLStoreSnapshot | null;
      revision: number;
    } | null>(null),
    [status, setStatus] = useState("Opening board…"),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<{ snapshot: TLStoreSnapshot | null; revision: number }>("/board")
      .then((value) => {
        if (active) {
          revision.current = value.revision;
          setInitial(value);
          setStatus("Saved to workspace");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (saving.current) await saving.current;
    if (blocked.current)
      throw new Error(
        "Board has an unresolved save conflict. Download it before reloading.",
      );
    if (!pending.current) return;
    const work = (async () => {
      while (pending.current) {
        const snapshot = pending.current;
        pending.current = null;
        setStatus("Saving…");
        try {
          const result = await api<{ revision: number }>("/board", {
            method: "PUT",
            body: JSON.stringify({ snapshot, revision: revision.current }),
          });
          revision.current = result.revision;
          setStatus(pending.current ? "Saving…" : "Saved to workspace");
        } catch (e) {
          pending.current = pending.current || snapshot;
          blocked.current = true;
          setStatus("Not saved");
          setError(
            e instanceof ApiError && e.status === 409
              ? "The board changed in another tab. Download your board below, then reload to open the saved version."
              : String(e),
          );
          throw e;
        }
      }
    })();
    saving.current = work;
    try {
      await work;
    } finally {
      saving.current = null;
    }
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      flush,
      addCard(card) {
        if (readOnly) return;
        if (!canvasAvailable) { onMessage("Your source is saved. Open Alignment & decisions to cite it in your grant brief. The visual canvas is available in Jai’s local app."); return; }
        const ed = editor.current;
        if (!ed) {
          onMessage("The canvas is still opening.");
          return;
        }
        const point = ed.getViewportPageBounds().center,
          id = createShapeId();
        ed.createShape({
          id,
          type: "note",
          x: point.x - 120,
          y: point.y - 120,
          props: {
            richText: toRichText(
              [
                card.title,
                card.quote ? "“" + card.quote + "”" : "",
                card.note,
                card.source_url,
              ]
                .filter(Boolean)
                .join("\n\n"),
            ),
            color:
              card.theme === "Courage"
                ? "yellow"
                : card.theme === "Passion"
                  ? "light-red"
                  : "light-violet",
            font: "sans",
            size: "s",
          },
          meta: { sourceCardId: card.id, sourceCardRevision: card.revision },
        });
        ed.select(id);
        onMessage(
          "Added a copy to your canvas. Your original source card is unchanged.",
        );
      },
    }),
    [flush, onMessage, readOnly],
  );
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (pending.current || saving.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const mount = useCallback(
    (ed: Editor) => {
      editor.current = ed;
      if (initial?.snapshot)
        loadSnapshot(ed.store, { document: initial.snapshot });
      ed.updateInstanceState({ isReadonly: readOnly });
      if (readOnly)
        return () => {
          editor.current = null;
        };
      const stop = ed.store.listen(
        () => {
          pending.current = getSnapshot(ed.store).document;
          setStatus("Unsaved changes");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void flush().catch(() => {});
          }, 650);
        },
        { scope: "document" },
      );
      return () => {
        stop();
        editor.current = null;
      };
    },
    [initial, flush, readOnly],
  );
  function downloadBoard() {
    if (!editor.current) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            snapshot: getSnapshot(editor.current.store).document,
            revision: revision.current,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "dharmic-unsaved-board.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="board-section" aria-label="Shared working canvas">
      <div className="canvas-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR CONNECTIONS</span>
          <h2>{canvasAvailable ? "Our thinking canvas" : "Build a grant brief together"}</h2>
        </div>
        <span className={"save-state " + (error ? "danger" : "")} role="status">
          {status}
        </span>
      </div>
      {error ? (
        <div className="inline-error" role="alert">
          {error}
          <button onClick={downloadBoard}>Download current board</button>
          <button onClick={() => location.reload()}>Reload saved board</button>
        </div>
      ) : null}
      <div className="canvas-body">
        {!canvasAvailable ? (
          <div style={{padding: "2.5rem", maxWidth: "48rem", lineHeight: 1.7}}>
            <h3>Start with what you want to make possible.</h3>
            <p>Capture the grant requirements and the words that matter in your source library. Keep quotations separate from your unfinished thoughts.</p>
            <ol><li>Bring a real grant opportunity and its source link.</li><li>Invite one collaborator from People & workspaces.</li><li>Open Alignment & decisions to draft your purpose, evidence and next step.</li><li>Ask each required reviewer to approve the exact revision—or preserve what still needs work.</li></ol>
            <p>Select sources and use Ask Bonsai for optional suggestions. Your team decides what to keep.</p>
            <p>This first web beta supports sources and reviewed briefs. The visual canvas remains available in Jai’s local app.</p>
          </div>
        ) : initial ? (
          <Tldraw assetUrls={assets} onMount={mount} licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY} />
        ) : (
          <div className="canvas-loading">
            {error
              ? "Your cards are still available in the library."
              : "Opening your canvas…"}
          </div>
        )}
      </div>
      <div className="canvas-foot">
        {canvasAvailable ? "Drag to arrange · Scroll to zoom · Double-click to edit · Refresh to see collaborators’ changes." : "Private work · Explicit reviews · Your sources and decisions stay connected"}
      </div>
    </section>
  );
});
interface functionProps {
  onMessage: (message: string) => void;
  readOnly?: boolean;
}

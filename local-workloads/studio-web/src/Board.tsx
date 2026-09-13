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
export interface BoardHandle {
  addCard: (card: Card) => void;
  flush: () => Promise<void>;
}
export default forwardRef<BoardHandle, functionProps>(function Board(
  { onMessage },
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
          setStatus("Saved locally");
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
          setStatus(pending.current ? "Saving…" : "Saved locally");
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
    [flush, onMessage],
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
    [initial, flush],
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
    <section className="board-section" aria-label="Freeform lecture canvas">
      <div className="canvas-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR CONNECTIONS</span>
          <h2>Your thinking canvas</h2>
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
        {initial ? (
          <Tldraw assetUrls={assets} onMount={mount} />
        ) : (
          <div className="canvas-loading">
            {error
              ? "Your cards are still available in the library."
              : "Opening your canvas…"}
          </div>
        )}
      </div>
      <div className="canvas-foot">
        Drag to arrange · Scroll to zoom · Double-click to edit · Your canvas
        saves on this machine
      </div>
    </section>
  );
});
interface functionProps {
  onMessage: (message: string) => void;
}

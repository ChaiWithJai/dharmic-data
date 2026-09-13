#!/usr/bin/env python3
"""Local operator/adapter command: Bonsai proposes one note; it never applies it."""
import argparse, hashlib, json, os, time
from pathlib import Path
import requests
import mlflow

parser = argparse.ArgumentParser()
parser.add_argument("--instruction-file", type=Path, required=True)
parser.add_argument("--event-id", required=True, help="Stable application/Buzz event ID for replay")
args = parser.parse_args()
root = Path(__file__).resolve().parent
for line in (root / ".env").read_text().splitlines():
    if line and not line.startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k, v)
text = args.instruction_file.read_text()
if not 1 <= len(text) <= 6000:
    raise SystemExit("Instruction must contain 1–6000 characters.")
wid = os.environ["LIVE_AGENT_WORKSPACE"]
actor = os.environ["LIVE_AGENT_ACTOR"]
model = os.environ.get("BONSAI_MODEL", "bonsai-preview-27b-pq2")
model_url = os.environ.get("BONSAI_BASE_URL", "http://127.0.0.1:8001")
tracking = os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:5001")
mlflow.set_tracking_uri(tracking)
mlflow.set_experiment("my-experiment")
cache = root / "data" / ("proposal-" + hashlib.sha256((wid + args.event_id).encode()).hexdigest() + ".json")
request_hash = hashlib.sha256(text.encode()).hexdigest()
headers = {"Authorization": "Bearer " + os.environ["LIVE_AGENT_TOKEN"]}
endpoint = "http://127.0.0.1:8893/agent/rooms/" + wid + "/proposals"
if cache.exists():
    saved = json.loads(cache.read_text())
    if saved["request_hash"] != request_hash:
        raise SystemExit("This event ID already belongs to a different instruction.")
    response = requests.post(endpoint, json=saved["payload"], headers=headers, timeout=20)
    response.raise_for_status()
    print(json.dumps({"replayed": True, "proposal": response.json(), "run_id": saved["run_id"]}))
    raise SystemExit(0)
# Script-level spans deliberately record metadata only, matching this beta's privacy policy.
# requests is used directly; no OpenAI autolog integration or raw prompt capture is enabled.
with mlflow.start_run(run_name="Bonsai → live whiteboard proposal") as run:
    mlflow.set_tags({"project": "imagine-together", "workload": "whiteboard_note_proposal",
                     "human_review": "PENDING", "buzz_connection": "NOT_CONNECTED",
                     "trace_content": "METADATA_ONLY", "checkpoint_parent": "UNVERIFIED"})
    mlflow.log_params({"model": model, "model_endpoint": model_url, "max_tokens": 240,
                       "temperature": 0.3, "reasoning_effort": "none", "workspace_id": wid, "event_id": args.event_id})
    start = time.monotonic()
    with mlflow.start_span(name="propose_whiteboard_note", span_type="AGENT") as span:
        span.set_inputs({"workspace_id": wid, "event_id": args.event_id, "instruction_chars": len(text)})
        mlflow.update_current_trace(metadata={"mlflow.trace.user": actor, "mlflow.trace.session": wid},
                                    tags={"human_review": "PENDING", "content_policy": "METADATA_ONLY"})
        with mlflow.start_span(name="Bonsai local generation", span_type="CHAT_MODEL") as llm:
            llm.set_inputs({"model": model, "content_recorded": False})
            r = requests.post(model_url + "/v1/chat/completions", timeout=180, json={
                "model": model, "temperature": 0.3, "max_tokens": 240, "reasoning_effort": "none",
                "messages": [{"role": "system", "content": "Help collaborators imagine a grant project together. Write one concise sticky note, at most 100 words. Preserve humanity and uncertainty. Do not invent evidence, funding eligibility, or commitments. Return only the note text."}, {"role": "user", "content": text}]})
            r.raise_for_status()
            result = r.json()
            choice = result["choices"][0]
            note = choice["message"].get("content", "").strip()
            usage = result.get("usage", {})
            llm.set_outputs({"response_chars": len(note), "finish_reason": choice.get("finish_reason"), "usage": usage})
            llm.set_attributes({"mlflow.chat.model": model, "mlflow.chat.tokenUsage": {
                "input_tokens": usage.get("prompt_tokens", 0), "output_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0)}})
            if not note or len(note) > 3000 or choice.get("finish_reason") != "stop":
                raise RuntimeError("Model did not return a complete bounded note.")
        payload = {"text": note, "x": 100, "y": 100, "event_id": args.event_id, "trace_id": span.trace_id}
        # Save before delivery so an ambiguous network outcome can be retried without generating again.
        cache.write_text(json.dumps({"payload": payload, "run_id": run.info.run_id, "request_hash": request_hash}))
        cache.chmod(0o600)
        with mlflow.start_span(name="queue_board_proposal", span_type="TOOL") as tool:
            tool.set_inputs({"workspace_id": wid, "event_id": args.event_id, "operation": "propose_note"})
            response = requests.post(endpoint, json=payload, headers=headers, timeout=20)
            response.raise_for_status()
            receipt = response.json()
            tool.set_outputs(receipt)
        span.set_outputs({"proposal_id": receipt["id"], "applied": False, "human_review": "PENDING"})
    mlflow.log_metric("systems.duration_seconds", time.monotonic() - start)
    mlflow.log_dict({"proposal_id": receipt["id"], "trace_id": span.trace_id, "workspace_id": wid,
                     "applied": False, "human_review": "PENDING"}, "proposal-receipt.json")
    mlflow.flush_trace_async_logging()
    print(json.dumps({"proposal": receipt, "run_id": run.info.run_id, "trace_id": span.trace_id}))

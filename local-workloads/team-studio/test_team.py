"""Behavior tests use isolated fictional accounts; never submit real human MLflow feedback."""

import os, tempfile, unittest, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi.testclient import TestClient

TEMP = tempfile.TemporaryDirectory()
os.environ["TEAM_STUDIO_DATA_DIR"] = TEMP.name
if os.environ.get("STUDIO_TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["STUDIO_TEST_DATABASE_URL"]
else:
    os.environ.pop("DATABASE_URL", None)
import api
from db import engine, jobs
from sqlalchemy import select, update
import worker


class TeamTests(unittest.TestCase):
    def setUp(self):
        self.owner, self.editor, self.viewer, self.outsider = [
            TestClient(api.app) for _ in range(4)
        ]
        self.people = []
        for client, label in zip(
            [self.owner, self.editor, self.viewer, self.outsider],
            ["owner", "editor", "viewer", "outsider"],
        ):
            result = client.post(
                "/api/register",
                json={
                    "name": label + "-" + uuid.uuid4().hex[:8],
                    "password": "test-only-long-password",
                },
            )
            self.assertEqual(result.status_code, 201, result.text)
            self.people.append(result.json()["user"])
        self.wid = self.owner.post(
            "/api/workspaces", json={"name": "Fictional grant collaboration fixture"}
        ).json()["id"]
        self.owner.headers["X-Workspace-ID"] = self.wid
        for client, role in [(self.editor, "editor"), (self.viewer, "viewer")]:
            token = self.owner.post(
                f"/api/workspaces/{self.wid}/invites", json={"role": role}
            ).json()["token"]
            self.assertEqual(
                client.post("/api/invites/redeem", json={"token": token}).status_code,
                200,
            )
            self.assertEqual(
                client.post("/api/invites/redeem", json={"token": token}).status_code,
                404,
            )
            client.headers["X-Workspace-ID"] = self.wid
        self.outsider.headers["X-Workspace-ID"] = self.wid

    def source(self):
        return self.owner.post(
            "/api/cards",
            json={
                "title": "Fixture source",
                "quote": "Verbatim fixture words.",
                "note": "An interpretation.",
            },
        ).json()

    def brief(self, card=None):
        current = self.owner.get("/api/canonical").json()
        result = self.owner.put(
            "/api/canonical",
            json={
                "revision": current["revision"],
                "title": "Our fixture brief",
                "body": "A proposal with an unresolved question.",
                "source_card_ids": [card["id"]] if card else [],
                "required_reviewers": [p["id"] for p in self.people[:2]],
            },
        )
        self.assertEqual(result.status_code, 200, result.text)
        return result.json()

    def approve(self, client, doc, decision="approve"):
        return client.post(
            "/api/canonical/review",
            json={
                "revision": doc["revision"],
                "content_hash": doc["content_hash"],
                "decision": decision,
                "reason": "Explicit test fixture review",
            },
        )

    def test_isolation_and_viewer_permissions(self):
        card = self.source()
        for path in [
            "/cards",
            "/board",
            "/canonical",
            "/decisions",
            "/export",
            "/jobs",
            "/audit",
        ]:
            self.assertEqual(self.outsider.get("/api" + path).status_code, 403, path)
        self.assertEqual(self.viewer.get("/api/cards").status_code, 200)
        self.assertEqual(
            self.viewer.put("/api/cards/" + card["id"], json=card).status_code, 403
        )
        self.assertEqual(
            self.viewer.post(
                "/api/ai", json={"card_ids": [card["id"]], "instruction": "Fixture"}
            ).status_code,
            403,
        )
        second = self.outsider.post(
            "/api/workspaces", json={"name": "Other project"}
        ).json()["id"]
        self.outsider.headers["X-Workspace-ID"] = second
        self.assertEqual(self.outsider.get("/api/cards").json()["cards"], [])
        self.assertEqual(
            self.outsider.put("/api/cards/" + card["id"], json=card).status_code, 404
        )
        self.assertEqual(
            self.outsider.post(
                "/api/ai", json={"card_ids": [card["id"]], "instruction": "Fixture"}
            ).status_code,
            404,
        )

    def test_exact_revision_approval_and_source_staleness(self):
        card = self.source()
        doc = self.brief(card)
        self.assertFalse(self.approve(self.owner, doc).json()["aligned"])
        requested = self.approve(self.editor, doc, "changes_requested").json()
        self.assertFalse(requested["aligned"])
        approved = self.approve(self.editor, doc).json()
        self.assertTrue(approved["aligned"])
        published = self.owner.post(
            "/api/canonical/publish",
            json={"revision": doc["revision"], "content_hash": doc["content_hash"]},
        )
        self.assertEqual(published.status_code, 200)
        edited = self.editor.put(
            "/api/cards/" + card["id"],
            json={**card, "note": "A changed claim needs a new review."},
        )
        self.assertEqual(edited.status_code, 200)
        stale = self.owner.get("/api/canonical").json()
        self.assertFalse(stale["sources_current"])
        self.assertFalse(stale["aligned"])
        self.assertEqual(self.approve(self.editor, doc).status_code, 409)
        self.assertEqual(
            self.owner.post(
                "/api/canonical/publish",
                json={"revision": doc["revision"], "content_hash": doc["content_hash"]},
            ).status_code,
            409,
        )
        new = self.brief(edited.json())
        self.assertEqual(new["approvals"], [])
        self.assertEqual(self.approve(self.owner, doc).status_code, 409)

    def test_export_preserves_cited_source_snapshot(self):
        card = self.source()
        self.brief(card)
        self.owner.put("/api/cards/" + card["id"], json={**card, "quote": "Changed later."})
        exported = self.owner.get("/api/canonical/export").text
        self.assertIn("Verbatim fixture words.", exported)
        self.assertIn("Fixture source", exported)
        self.assertNotIn("Changed later.", exported)
        self.assertIn("Review incomplete or stale", exported)

    def test_policy_and_revocation(self):
        doc = self.brief()
        self.approve(self.owner, doc)
        self.approve(self.editor, doc)
        changed = {
            k: doc[k]
            for k in [
                "revision",
                "title",
                "body",
                "source_card_ids",
                "required_reviewers",
            ]
        }
        changed["required_reviewers"] = [self.people[1]["id"]]
        self.assertEqual(
            self.editor.put("/api/canonical", json=changed).status_code, 403
        )
        self.assertEqual(
            self.viewer.post(
                f"/api/workspaces/{self.wid}/invites", json={"role": "editor"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.owner.request(
                "DELETE",
                f"/api/workspaces/{self.wid}/members/" + self.people[1]["id"],
                json={},
            ).status_code,
            200,
        )
        self.assertEqual(self.editor.get("/api/cards").status_code, 403)
        token = self.owner.post(
            f"/api/workspaces/{self.wid}/invites", json={"role": "editor"}
        ).json()["token"]
        self.editor.post("/api/invites/redeem", json={"token": token})
        latest = self.owner.get("/api/canonical").json()
        self.assertFalse(latest["aligned"])
        self.assertGreater(latest["revision"], doc["revision"])
        self.assertEqual(latest["approvals"], [])

    def test_conflicts_and_restore_do_not_import_approvals(self):
        card = self.source()
        doc = self.brief(card)
        self.approve(self.owner, doc)
        self.approve(self.editor, doc)
        self.assertEqual(
            self.editor.put(
                "/api/cards/" + card["id"], json={**card, "note": "New"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.owner.put("/api/cards/" + card["id"], json=card).status_code, 409
        )
        board = self.owner.get("/api/board").json()
        self.owner.put("/api/board", json=board)
        self.assertEqual(self.editor.put("/api/board", json=board).status_code, 409)
        snapshot = self.owner.get("/api/export").json()
        self.assertEqual(
            self.viewer.post("/api/import", json=snapshot).status_code, 403
        )
        result = self.owner.post("/api/import", json=snapshot)
        self.assertEqual(result.status_code, 200, result.text)
        restored = self.owner.get("/api/canonical").json()
        self.assertFalse(restored["aligned"])
        self.assertEqual(restored["approvals"], [])
        newcard = self.owner.get("/api/cards").json()["cards"][0]
        self.assertNotEqual(newcard["id"], card["id"])
        self.assertEqual(newcard["quote"], card["quote"])
        self.assertEqual(restored["source_card_ids"], [newcard["id"]])
        before = self.owner.get("/api/cards").json()
        bad = {**snapshot, "cards": [{"id": "bad"}]}
        self.assertEqual(self.owner.post("/api/import", json=bad).status_code, 422)
        self.assertEqual(self.owner.get("/api/cards").json(), before)

    def test_durable_job_claim_and_scoped_evidence(self):
        card = self.source()
        jid = self.editor.post(
            "/api/ai",
            json={
                "card_ids": [card["id"]],
                "instruction": "Fixture; do not run a real model.",
            },
        ).json()["job_id"]
        self.assertEqual(
            self.outsider.get("/api/jobs/" + jid + "/evidence").status_code, 403
        )
        row = worker.claim()
        self.assertEqual(row["id"], jid)
        self.assertIsNone(worker.claim())
        self.assertEqual(self.owner.get("/api/jobs/" + jid).json()["state"], "running")
        with engine.begin() as conn:
            self.assertIsNotNone(
                conn.execute(select(jobs).where(jobs.c.id == jid)).first()
            )
        worker.complete(
            row,
            {
                **row["body"],
                "state": "interrupted",
                "error": "Test finished without inference.",
            },
        )

    def test_suggestion_application_provenance_and_quote_guard(self):
        card = self.source()
        jid = self.editor.post(
            "/api/ai", json={"card_ids": [card["id"]], "instruction": "Fixture only."}
        ).json()["job_id"]
        with engine.begin() as conn:
            row = conn.execute(select(jobs).where(jobs.c.id == jid)).mappings().one()
            conn.execute(
                update(jobs)
                .where(jobs.c.id == jid)
                .values(
                    state="succeeded",
                    body={
                        **row["body"],
                        "state": "succeeded",
                        "result": {"text": "Fixture suggestion."},
                    },
                )
            )
        wrong = {**card, "quote": "Invented source words", "applied_suggestion_id": jid}
        self.assertEqual(
            self.editor.put("/api/cards/" + card["id"], json=wrong).status_code, 422
        )
        good = {
            **card,
            "note": "Explicitly kept fixture suggestion.",
            "applied_suggestion_id": jid,
        }
        result = self.editor.put("/api/cards/" + card["id"], json=good)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["derived_from"][0]["job_id"], jid)
        self.assertEqual(result.json()["quote"], card["quote"])
        self.assertEqual(
            self.owner.put("/api/cards/" + card["id"], json=good).status_code, 409
        )

    def test_concurrent_board_writers_have_one_winner(self):
        board = self.owner.get("/api/board").json()
        with ThreadPoolExecutor(max_workers=2) as pool:
            calls = [
                pool.submit(c.put, "/api/board", json=board)
                for c in [self.owner, self.editor]
            ]
            statuses = sorted(f.result().status_code for f in calls)
        self.assertEqual(statuses, [200, 409])

    def test_origin_and_logout(self):
        self.assertEqual(
            self.owner.post(
                "/api/cards",
                json={"title": "blocked"},
                headers={"Origin": "https://unrelated.example"},
            ).status_code,
            403,
        )
        self.assertEqual(self.owner.post("/api/logout", json={}).status_code, 200)
        self.assertEqual(self.owner.get("/api/cards").status_code, 401)
        self.assertIsNone(self.owner.get("/api/session").json()["user"])


if __name__ == "__main__":
    unittest.main()

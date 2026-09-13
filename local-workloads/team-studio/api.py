"""Imagine Together: authenticated, asynchronous grant-team authoring pilot."""

from datetime import datetime, timezone
import hashlib, hmac, json, os, re, secrets, time, uuid
from typing import Literal
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, insert, update, delete, and_, func
from sqlalchemy.exc import IntegrityError
from db import *
import beta

app = FastAPI(title="Imagine Together — grant collaboration pilot")
ORIGINS = set(
    os.environ.get(
        "STUDIO_ALLOWED_ORIGINS",
        "http://127.0.0.1:8790,http://localhost:8790,http://127.0.0.1:8791,http://localhost:8791",
    ).split(",")
)
COOKIE = "imagine_session"
SECURE = os.environ.get("STUDIO_COOKIE_SECURE", "false").lower() == "true"
if os.environ.get("STUDIO_ENV", "local") not in ("local", "private-beta"):
    raise RuntimeError("Unknown application environment")
if beta.ENABLED:
    COOKIE = "__Host-imagine_session"
    SECURE = True
_auth_attempts = {}


def uid():
    return uuid.uuid4().hex


def stamp():
    return datetime.now(timezone.utc).isoformat()


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode(),
        salt=bytes.fromhex(salt),
        n=32768,
        r=8,
        p=1,
        maxmem=64 * 1024 * 1024,
    ).hex()
    return salt + ":" + digest


def account(conn, request, optional=False):
    token = request.cookies.get(COOKIE, "")
    row = (
        conn.execute(
            select(users.c.id, users.c.name)
            .join(sessions, sessions.c.user_id == users.c.id)
            .where(
                sessions.c.token_hash == sha(token), sessions.c.expires_at > time.time()
            )
        )
        .mappings()
        .first()
    )
    if not row and not optional:
        raise HTTPException(401, "Sign in to open your workspace.")
    return dict(row) if row else None


def workspace_list(conn, user_id):
    return [
        dict(r)
        for r in conn.execute(
            select(workspaces.c.id, workspaces.c.name, members.c.role)
            .join(members, members.c.workspace_id == workspaces.c.id)
            .where(members.c.user_id == user_id)
        ).mappings()
    ]


def context(request: Request):
    with engine.begin() as conn:
        user = account(conn, request)
        wid = request.headers.get("X-Workspace-ID", "")
        # Serialize writes to each workspace before checking membership/versions.
        q = select(workspaces).where(workspaces.c.id == wid)
        if request.method not in ("GET", "HEAD"):
            q = q.with_for_update()
        ws = conn.execute(q).mappings().first()
        member = (
            conn.execute(
                select(members).where(
                    members.c.workspace_id == wid, members.c.user_id == user["id"]
                )
            )
            .mappings()
            .first()
        )
        if not ws or not member:
            raise HTTPException(403, "You do not have access to this workspace.")
        yield {
            "db": conn,
            "user": user,
            "workspace": dict(ws),
            "role": member["role"],
            "wid": wid,
        }


def can_edit(ctx):
    if ctx["role"] not in ("owner", "editor"):
        raise HTTPException(403, "This workspace is read-only for your account.")


def owner(ctx):
    if ctx["role"] != "owner":
        raise HTTPException(403, "Only the workspace owner can do this.")


def event_log(ctx, event, body):
    ctx["db"].execute(
        insert(audit).values(
            id=uid(),
            workspace_id=ctx["wid"],
            actor_id=ctx["user"]["id"],
            event=event,
            body=body,
            created_at=stamp(),
        )
    )


def scope(table, ctx):
    return table.c.workspace_id == ctx["wid"]


def card_row(ctx, cid):
    row = (
        ctx["db"]
        .execute(select(cards).where(scope(cards, ctx), cards.c.id == cid))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Source card not found in this workspace.")
    return row


@app.middleware("http")
async def protect(request: Request, call_next):
    if beta.ENABLED:
        if not hmac.compare_digest(request.headers.get("authorization", ""), "Bearer " + beta.TOKEN):
            return JSONResponse({"detail": "Gateway authentication required."}, status_code=403)
        if request.url.path in ["/api/register", "/api/login"]:
            key = request.headers.get("x-studio-client-ip", "unknown")
            now = time.time()
            recent = [x for x in _auth_attempts.get(key, []) if x > now - 900]
            if len(recent) >= 20:
                return JSONResponse({"detail": "Too many sign-in attempts. Try again in 15 minutes."}, status_code=429)
            if len(_auth_attempts) > 10000:
                _auth_attempts.clear()
            _auth_attempts[key] = recent + [now]
    elif request.url.hostname not in ["127.0.0.1", "localhost", "testserver"]:
        return JSONResponse(
            {"detail": "This pilot is restricted to localhost."}, status_code=403
        )
    if request.method not in ["GET", "HEAD", "OPTIONS"]:
        origin = request.headers.get("origin")
        if (beta.ENABLED and origin not in ORIGINS) or (origin and origin not in ORIGINS):
            return JSONResponse(
                {"detail": "Unrecognized request origin."}, status_code=403
            )
        if "application/json" not in request.headers.get("content-type", ""):
            return JSONResponse({"detail": "Use a JSON request."}, status_code=415)
        try:
            length = int(request.headers.get("content-length", "0"))
        except ValueError:
            return JSONResponse({"detail": "Invalid request size."}, status_code=400)
        if length > 15_000_000:
            return JSONResponse(
                {"detail": "This request exceeds15 MB."}, status_code=413
            )
    response = await call_next(request)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


class Credentials(BaseModel):
    invitation: str = Field(default="", max_length=200)
    name: str = Field(min_length=3, max_length=60, pattern=r"^[A-Za-z0-9_. -]+$")
    password: str = Field(min_length=12, max_length=256)


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class InviteIn(BaseModel):
    role: Literal["editor", "viewer"] = "editor"


class RedeemIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class CardIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    source_url: str = Field(default="", max_length=2000)
    quote: str = Field(default="", max_length=20000)
    note: str = Field(default="", max_length=20000)
    theme: str = Field(default="Grant research", max_length=100)
    revision: int | None = None
    applied_suggestion_id: str | None = Field(default=None, max_length=80)


class BoardIn(BaseModel):
    snapshot: dict | None
    revision: int = Field(ge=0)


class CanonicalIn(BaseModel):
    revision: int = Field(ge=0)
    title: str = Field(min_length=1, max_length=300)
    body: str = Field(max_length=100000)
    source_card_ids: list[str] = Field(default_factory=list, max_length=100)
    required_reviewers: list[str] = Field(min_length=1, max_length=30)


class ReviewIn(BaseModel):
    revision: int
    content_hash: str
    decision: Literal["approve", "changes_requested"]
    reason: str = Field(default="", max_length=3000)


class PublishIn(BaseModel):
    revision: int
    content_hash: str


class DecisionIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    decision: str = Field(min_length=1, max_length=10000)
    rationale: str = Field(min_length=1, max_length=10000)
    source_card_ids: list[str] = Field(default_factory=list, max_length=100)


class AIIn(BaseModel):
    card_ids: list[str] = Field(min_length=1, max_length=8)
    instruction: str = Field(min_length=1, max_length=3000)


class FeedbackIn(BaseModel):
    value: bool
    reason: str = Field(default="", max_length=3000)


def set_session(conn, user_id, response):
    token = secrets.token_urlsafe(32)
    conn.execute(
        insert(sessions).values(
            token_hash=sha(token), user_id=user_id, expires_at=time.time() + 86400 * 7
        )
    )
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        secure=SECURE,
        samesite="strict",
        max_age=86400 * 7,
        path="/",
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "edition": "private grants beta" if beta.ENABLED else "local collaboration pilot",
        "database": "postgresql" if engine.dialect.name == "postgresql" else "sqlite",
        "maven_url": "https://maven.com/a-plus",
    }


@app.get("/api/session")
def session(request: Request):
    with engine.begin() as conn:
        user = account(conn, request, True)
        return {
            "user": user,
            "workspaces": workspace_list(conn, user["id"]) if user else [],
        }


@app.post("/api/register", status_code=201)
def register(body: Credentials, response: Response):
    name = body.name.strip()
    if len(name) < 3:
        raise HTTPException(422, "Use at least three characters for your account name.")
    try:
        with engine.begin() as conn:
            user_id = uid()
            conn.execute(
                insert(users).values(
                    id=user_id,
                    name=name.lower(),
                    password_hash=password_hash(body.password),
                )
            )
            if beta.ENABLED:
                beta.enroll(conn, body.invitation, user_id)
            set_session(conn, user_id, response)
            return {"user": {"id": user_id, "name": name.lower()}, "workspaces": workspace_list(conn, user_id)}
    except IntegrityError:
        raise HTTPException(409, "That account name is unavailable.")


@app.post("/api/login")
def login(body: Credentials, response: Response):
    with engine.begin() as conn:
        row = (
            conn.execute(select(users).where(users.c.name == body.name.strip().lower()))
            .mappings()
            .first()
        )
        stored = (
            row["password_hash"]
            if row
            else password_hash("not-a-real-account-password", salt="00" * 16)
        )
        match = hmac.compare_digest(
            stored, password_hash(body.password, stored.split(":")[0])
        )
        if not row or not match:
            raise HTTPException(401, "Account name or password did not match.")
        set_session(conn, row["id"], response)
        return {
            "user": {"id": row["id"], "name": row["name"]},
            "workspaces": workspace_list(conn, row["id"]),
        }


@app.post("/api/logout")
def logout(request: Request, response: Response):
    with engine.begin() as conn:
        conn.execute(
            delete(sessions).where(
                sessions.c.token_hash == sha(request.cookies.get(COOKIE, ""))
            )
        )
    response.delete_cookie(COOKIE, path="/")
    return {"signed_out": True}


@app.post("/api/workspaces", status_code=201)
def new_workspace(body: NameIn, request: Request):
    with engine.begin() as conn:
        user = account(conn, request)
        wid = uid()
        conn.execute(
            insert(workspaces).values(id=wid, name=body.name, created_at=stamp())
        )
        conn.execute(
            insert(members).values(workspace_id=wid, user_id=user["id"], role="owner")
        )
        conn.execute(insert(boards).values(workspace_id=wid, revision=0, snapshot=None))
        doc = {
            "title": "Our grant brief",
            "body": "# What we want to make possible\n\n# Who it serves\n\n# What we know and what is still uncertain\n\n# What we will do next\n\n# Support we need\n",
            "source_card_ids": [],
            "source_refs": [],
            "required_reviewers": [user["id"]],
            "updated_at": stamp(),
        }
        conn.execute(insert(canonical).values(workspace_id=wid, revision=0, body=doc))
        return {"id": wid, "name": body.name, "role": "owner"}


@app.get("/api/workspaces/{wid}/members")
def list_members(wid: str, ctx=Depends(context)):
    if wid != ctx["wid"]:
        raise HTTPException(403, "Workspace does not match your selected workspace.")
    return {
        "members": [
            dict(r)
            for r in ctx["db"]
            .execute(
                select(members.c.user_id, members.c.role, users.c.name)
                .join(users, users.c.id == members.c.user_id)
                .where(scope(members, ctx))
            )
            .mappings()
        ]
    }


@app.post("/api/workspaces/{wid}/invites")
def invite(wid: str, body: InviteIn, ctx=Depends(context)):
    owner(ctx)
    if wid != ctx["wid"]:
        raise HTTPException(403, "Workspace mismatch.")
    token = secrets.token_urlsafe(32)
    expiry = time.time() + 86400 * 7
    invite_id = uid()
    if beta.ENABLED:
        beta.reserve_guest(ctx, invite_id, expiry)
    ctx["db"].execute(
        insert(invites).values(
            id=invite_id,
            token_hash=sha(token),
            workspace_id=wid,
            role=body.role,
            expires_at=expiry,
        )
    )
    event_log(ctx, "invite_created", {"invite_id": invite_id, "role": body.role})
    return {"id": invite_id, "token": token, "expires_at": expiry}


@app.delete("/api/workspaces/{wid}/invites/{invite_id}")
def revoke_invite(wid: str, invite_id: str, ctx=Depends(context)):
    owner(ctx)
    if wid != ctx["wid"]:
        raise HTTPException(403, "Workspace mismatch.")
    ctx["db"].execute(
        delete(invites).where(scope(invites, ctx), invites.c.id == invite_id)
    )
    if beta.ENABLED:
        ctx["db"].execute(delete(beta.slots).where(beta.slots.c.invite_id == invite_id, beta.slots.c.used_by.is_(None)))
    event_log(ctx, "invite_revoked", {"id": invite_id})
    return {"revoked": True}


@app.post("/api/invites/redeem")
def redeem(body: RedeemIn, request: Request):
    with engine.begin() as conn:
        user = account(conn, request)
        row = (
            conn.execute(
                select(invites)
                .where(invites.c.token_hash == sha(body.token))
                .with_for_update()
            )
            .mappings()
            .first()
        )
        if not row or row["used_by"] or row["expires_at"] < time.time():
            raise HTTPException(404, "That invitation is expired, used or unavailable.")
        if conn.execute(
            select(members).where(
                members.c.workspace_id == row["workspace_id"],
                members.c.user_id == user["id"],
            )
        ).first():
            raise HTTPException(409, "You already belong to that workspace.")
        conn.execute(
            insert(members).values(
                workspace_id=row["workspace_id"], user_id=user["id"], role=row["role"]
            )
        )
        conn.execute(
            update(invites).where(invites.c.id == row["id"]).values(used_by=user["id"])
        )
        if beta.ENABLED:
            conn.execute(update(beta.slots).where(beta.slots.c.invite_id == row["id"]).values(used_by=user["id"]))
        ws = (
            conn.execute(
                select(workspaces).where(workspaces.c.id == row["workspace_id"])
            )
            .mappings()
            .one()
        )
        return {"id": ws["id"], "name": ws["name"], "role": row["role"]}


@app.delete("/api/workspaces/{wid}/members/{user_id}")
def revoke_member(wid: str, user_id: str, ctx=Depends(context)):
    owner(ctx)
    if wid != ctx["wid"] or user_id == ctx["user"]["id"]:
        raise HTTPException(409, "The owner cannot remove themselves.")
    ctx["db"].execute(
        delete(members).where(scope(members, ctx), members.c.user_id == user_id)
    )
    doc = (
        ctx["db"]
        .execute(select(canonical).where(scope(canonical, ctx)))
        .mappings()
        .one()
    )
    if user_id in doc["body"]["required_reviewers"]:
        revised = {
            **doc["body"],
            "updated_at": stamp(),
            "updated_by": ctx["user"]["name"],
        }
        revision = doc["revision"] + 1
        ctx["db"].execute(
            update(canonical)
            .where(scope(canonical, ctx))
            .values(revision=revision, body=revised)
        )
        ctx["db"].execute(
            insert(versions).values(
                workspace_id=ctx["wid"], revision=revision, body=revised
            )
        )
    event_log(ctx, "member_removed", {"user_id": user_id})
    return {"removed": True}


@app.get("/api/cards")
def list_cards(ctx=Depends(context)):
    return {
        "cards": [
            r.body
            for r in ctx["db"].execute(select(cards.c.body).where(scope(cards, ctx)))
        ]
    }


@app.post("/api/cards", status_code=201)
def add_card(body: CardIn, ctx=Depends(context)):
    can_edit(ctx)
    card = body.model_dump(exclude={"revision", "applied_suggestion_id"})
    card.update(
        id=uid(),
        revision=1,
        created_at=stamp(),
        updated_at=stamp(),
        created_by=ctx["user"]["name"],
    )
    ctx["db"].execute(
        insert(cards).values(
            id=card["id"], workspace_id=ctx["wid"], revision=1, body=card
        )
    )
    event_log(ctx, "source_created", card)
    return card


@app.put("/api/cards/{cid}")
def edit_card(cid: str, body: CardIn, ctx=Depends(context)):
    can_edit(ctx)
    old = card_row(ctx, cid)
    if old["revision"] != body.revision:
        raise HTTPException(409, "Someone edited this source. Reload before saving.")
    card = {
        **old["body"],
        **body.model_dump(exclude={"revision", "applied_suggestion_id"}),
        "revision": old["revision"] + 1,
        "updated_at": stamp(),
        "updated_by": ctx["user"]["name"],
    }
    if body.applied_suggestion_id:
        suggestion = job_row(ctx, body.applied_suggestion_id)["body"]
        if (
            suggestion["state"] != "succeeded"
            or suggestion["card_revisions"].get(cid) != old["revision"]
        ):
            raise HTTPException(
                409, "This suggestion does not apply to the current source revision."
            )
        if body.quote != old["body"]["quote"]:
            raise HTTPException(
                422, "Applying a suggestion cannot rewrite the source quotation."
            )
        card["derived_from"] = [
            *old["body"].get("derived_from", []),
            {
                "job_id": body.applied_suggestion_id,
                "source_revision": old["revision"],
                "applied_by": ctx["user"]["name"],
            },
        ]
    ctx["db"].execute(
        update(cards)
        .where(scope(cards, ctx), cards.c.id == cid)
        .values(revision=card["revision"], body=card)
    )
    event_log(ctx, "source_revised", {"previous": old["body"], "current": card})
    return card


@app.delete("/api/cards/{cid}")
def remove_card(cid: str, ctx=Depends(context)):
    can_edit(ctx)
    old = card_row(ctx, cid)
    ctx["db"].execute(delete(cards).where(scope(cards, ctx), cards.c.id == cid))
    event_log(ctx, "source_deleted", old["body"])
    return {"deleted": cid}


@app.get("/api/board")
def get_board(ctx=Depends(context)):
    r = ctx["db"].execute(select(boards).where(scope(boards, ctx))).mappings().one()
    return {"snapshot": r["snapshot"], "revision": r["revision"]}


@app.put("/api/board")
def put_board(body: BoardIn, ctx=Depends(context)):
    can_edit(ctx)
    changed = (
        ctx["db"]
        .execute(
            update(boards)
            .where(scope(boards, ctx), boards.c.revision == body.revision)
            .values(snapshot=body.snapshot, revision=body.revision + 1)
        )
        .rowcount
    )
    if not changed:
        raise HTTPException(
            409,
            "A collaborator saved a newer canvas. Export your changes before reloading.",
        )
    return {"snapshot": body.snapshot, "revision": body.revision + 1}


def source_refs(ctx, ids):
    refs = []
    for cid in dict.fromkeys(ids):
        row = card_row(ctx, cid)
        source = row["body"]
        refs.append({"id": cid, "revision": row["revision"], **{
            key: source.get(key, "") for key in ("title", "source_url", "quote", "note", "created_by")
        }})
    return refs


def canonical_state(ctx):
    row = (
        ctx["db"]
        .execute(select(canonical).where(scope(canonical, ctx)))
        .mappings()
        .one()
    )
    body = row["body"]
    current = True
    for ref in body["source_refs"]:
        found = (
            ctx["db"]
            .execute(
                select(cards.c.revision).where(
                    scope(cards, ctx), cards.c.id == ref["id"]
                )
            )
            .first()
        )
        if not found or found.revision != ref["revision"]:
            current = False
    members_now = {
        r.user_id: r.role
        for r in ctx["db"].execute(
            select(members.c.user_id, members.c.role).where(scope(members, ctx))
        )
    }
    policy_current = all(
        members_now.get(x) in ["owner", "editor"] for x in body["required_reviewers"]
    )
    digest = sha(
        json.dumps({"revision": row["revision"], "body": body}, sort_keys=True)
    )
    approvals = [
        r.body
        for r in ctx["db"].execute(
            select(reviews.c.body).where(
                scope(reviews, ctx), reviews.c.revision == row["revision"]
            )
        )
    ]
    agreed = {
        r["user_id"]
        for r in approvals
        if r["decision"] == "approve" and r["content_hash"] == digest
    }
    aligned = (
        row["revision"] > 0
        and current
        and policy_current
        and bool(body["required_reviewers"])
        and set(body["required_reviewers"]) <= agreed
    )
    return {
        **body,
        "revision": row["revision"],
        "content_hash": digest,
        "approvals": approvals,
        "sources_current": current,
        "reviewers_current": policy_current,
        "aligned": aligned,
        "last_published_revision": row["published_revision"],
    }


@app.get("/api/canonical")
def get_canonical(ctx=Depends(context)):
    return canonical_state(ctx)


@app.put("/api/canonical")
def save_canonical(body: CanonicalIn, ctx=Depends(context)):
    can_edit(ctx)
    old = canonical_state(ctx)
    if body.revision != old["revision"]:
        raise HTTPException(409, "The brief changed. Reload before saving.")
    if set(body.required_reviewers) != set(old["required_reviewers"]):
        owner(ctx)
    active = {
        r.user_id
        for r in ctx["db"].execute(
            select(members.c.user_id).where(
                scope(members, ctx), members.c.role.in_(["owner", "editor"])
            )
        )
    }
    if not set(body.required_reviewers) <= active:
        raise HTTPException(
            422, "Required reviewers must be current owners or editors."
        )
    doc = body.model_dump(exclude={"revision"})
    doc.update(
        source_refs=source_refs(ctx, body.source_card_ids),
        required_reviewers=sorted(set(body.required_reviewers)),
        updated_at=stamp(),
        updated_by=ctx["user"]["name"],
    )
    revision = old["revision"] + 1
    ctx["db"].execute(
        update(canonical)
        .where(scope(canonical, ctx))
        .values(revision=revision, body=doc)
    )
    ctx["db"].execute(
        insert(versions).values(workspace_id=ctx["wid"], revision=revision, body=doc)
    )
    event_log(ctx, "canonical_revised", {"revision": revision, "body": doc})
    return canonical_state(ctx)


def check_revision(ctx, body):
    doc = canonical_state(ctx)
    if (
        body.revision != doc["revision"]
        or body.content_hash != doc["content_hash"]
        or not doc["sources_current"]
        or not doc["reviewers_current"]
    ):
        raise HTTPException(
            409,
            "The brief, sources or reviewer membership changed. Save and review the current version.",
        )
    return doc


@app.post("/api/canonical/review")
def review(body: ReviewIn, ctx=Depends(context)):
    can_edit(ctx)
    doc = check_revision(ctx, body)
    if doc["revision"] == 0:
        raise HTTPException(409, "Save a first brief before asking for review.")
    if ctx["user"]["id"] not in doc["required_reviewers"]:
        raise HTTPException(403, "You are not a required reviewer of this version.")
    if body.decision == "changes_requested" and not body.reason.strip():
        raise HTTPException(422, "Explain the change you need.")
    item = {
        **body.model_dump(),
        "user_id": ctx["user"]["id"],
        "name": ctx["user"]["name"],
        "created_at": stamp(),
    }
    where = and_(
        scope(reviews, ctx),
        reviews.c.revision == doc["revision"],
        reviews.c.user_id == ctx["user"]["id"],
    )
    ctx["db"].execute(delete(reviews).where(where))
    ctx["db"].execute(
        insert(reviews).values(
            workspace_id=ctx["wid"],
            revision=doc["revision"],
            user_id=ctx["user"]["id"],
            body=item,
        )
    )
    event_log(ctx, "review_recorded", item)
    return canonical_state(ctx)


@app.post("/api/canonical/publish")
def publish(body: PublishIn, ctx=Depends(context)):
    owner(ctx)
    doc = check_revision(ctx, body)
    if not doc["aligned"]:
        raise HTTPException(
            409, "Every required reviewer must approve this exact version."
        )
    ctx["db"].execute(
        update(canonical)
        .where(scope(canonical, ctx))
        .values(published_revision=doc["revision"])
    )
    event_log(
        ctx,
        "canonical_published",
        {"revision": doc["revision"], "content_hash": doc["content_hash"]},
    )
    return canonical_state(ctx)


@app.get("/api/canonical/versions")
def canonical_versions(ctx=Depends(context)):
    return {
        "versions": [
            {"revision": r.revision, **r.body}
            for r in ctx["db"].execute(
                select(versions.c.revision, versions.c.body)
                .where(scope(versions, ctx))
                .order_by(versions.c.revision.desc())
            )
        ]
    }


@app.get("/api/canonical/export")
def export_brief(ctx=Depends(context)):
    doc = canonical_state(ctx)
    refs = "\n".join(
        "### " + r.get("title", r["id"]) + " (source revision " + str(r["revision"]) + ")\n\n"
        + r.get("source_url", "") + "\n\n"
        + "\n".join("> " + line for line in r.get("quote", "Snapshot unavailable for this older reference.").splitlines())
        + "\n\nCollaborator note at citation time: " + r.get("note", "")
        for r in doc["source_refs"]
    )
    content = f"# {doc['title']}\n\nRevision {doc['revision']} · {'Aligned' if doc['aligned'] else 'Review incomplete or stale'}\n\n{doc['body']}\n\n## Source references\n\n{refs}\n\n## Learning together\n\n[Learn with Jai on Maven](https://maven.com/a-plus)\n"
    return PlainTextResponse(
        content,
        headers={
            "Content-Disposition": 'attachment; filename="canonical-grant-brief.md"'
        },
    )


@app.get("/api/decisions")
def get_decisions(ctx=Depends(context)):
    return {
        "decisions": [
            r.body
            for r in ctx["db"].execute(
                select(decisions.c.body).where(scope(decisions, ctx))
            )
        ]
    }


@app.post("/api/decisions", status_code=201)
def add_decision(body: DecisionIn, ctx=Depends(context)):
    can_edit(ctx)
    item = body.model_dump()
    item.update(
        id=uid(),
        source_refs=source_refs(ctx, body.source_card_ids),
        created_by=ctx["user"]["name"],
        created_at=stamp(),
    )
    ctx["db"].execute(
        insert(decisions).values(id=item["id"], workspace_id=ctx["wid"], body=item)
    )
    event_log(ctx, "decision_recorded", item)
    return item


@app.get("/api/audit")
def get_audit(ctx=Depends(context)):
    return {
        "events": [
            dict(r)
            for r in ctx["db"]
            .execute(
                select(
                    audit.c.actor_id, audit.c.event, audit.c.body, audit.c.created_at
                )
                .where(scope(audit, ctx))
                .order_by(audit.c.created_at.desc())
                .limit(100)
            )
            .mappings()
        ]
    }


@app.get("/api/export")
def export_workspace(ctx=Depends(context)):
    data = {
        "version": 2,
        "exported_at": stamp(),
        "workspace": ctx["workspace"],
        "cards": list_cards(ctx)["cards"],
        "board": get_board(ctx),
        "canonical": canonical_state(ctx),
        "decisions": get_decisions(ctx)["decisions"],
    }
    return JSONResponse(
        data,
        headers={
            "Content-Disposition": 'attachment; filename="imagine-together-workspace.json"'
        },
    )


@app.post("/api/import")
def import_workspace(payload: dict, ctx=Depends(context)):
    owner(ctx)
    if payload.get("version") not in [1, 2] or not isinstance(
        payload.get("cards"), list
    ):
        raise HTTPException(422, "Expected a workspace backup.")
    try:
        board = BoardIn(**payload["board"])
        incoming = []
        seen = set()
        for card in payload["cards"]:
            clean = CardIn(**card)
            if not isinstance(card["id"], str) or card["id"] in seen:
                raise ValueError("Duplicate or invalid source IDs.")
            seen.add(card["id"])
            incoming.append((card, clean))
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(422, str(exc))
    # Restored sources always receive new IDs; canonical approvals are never imported.
    event_log(
        ctx,
        "before_restore",
        {
            "cards": list_cards(ctx)["cards"],
            "board": get_board(ctx),
            "canonical": canonical_state(ctx),
        },
    )
    ctx["db"].execute(delete(cards).where(scope(cards, ctx)))
    id_map = {old["id"]: add_card(clean, ctx)["id"] for old, clean in incoming}

    def remap_canvas(value):
        if isinstance(value, list):
            return [remap_canvas(x) for x in value]
        if not isinstance(value, dict):
            return value
        result = {k: remap_canvas(v) for k, v in value.items()}
        if "sourceCardId" in result and result["sourceCardId"] in id_map:
            result["sourceCardId"] = id_map[result["sourceCardId"]]
            result["sourceCardRevision"] = 1
        return result

    current = get_board(ctx)
    put_board(
        BoardIn(snapshot=remap_canvas(board.snapshot), revision=current["revision"]),
        ctx,
    )
    olddoc = canonical_state(ctx)
    if payload.get("version") == 2:
        imported = payload.get("canonical", {})
        save_canonical(
            CanonicalIn(
                revision=olddoc["revision"],
                title=str(imported.get("title", "Restored brief")),
                body=str(imported.get("body", "")),
                source_card_ids=[
                    id_map[x]
                    for x in imported.get("source_card_ids", [])
                    if x in id_map
                ],
                required_reviewers=[ctx["user"]["id"]],
            ),
            ctx,
        )
        event_log(ctx, "decisions_before_restore", get_decisions(ctx))
        ctx["db"].execute(delete(decisions).where(scope(decisions, ctx)))
        for item in payload.get("decisions", []):
            record = DecisionIn(
                title=item["title"],
                decision=item["decision"],
                rationale=item["rationale"],
                source_card_ids=[
                    id_map[x] for x in item.get("source_card_ids", []) if x in id_map
                ],
            )
            add_decision(record, ctx)
    return {
        "restored": len(incoming),
        "backup_saved": True,
        "warning": "Sources and canvas references were remapped into this workspace. Request new reviews: old approvals and membership are not imported.",
        "board": get_board(ctx),
    }


@app.post("/api/research/import")
def add_research(ctx=Depends(context)):
    can_edit(ctx)
    incoming = json.loads((ROOT.parent / "research/recipient-cards.json").read_text())[
        "cards"
    ]
    added = 0
    for card in incoming:
        cid = sha(ctx["wid"] + card["id"])[:32]
        if (
            ctx["db"]
            .execute(select(cards.c.id).where(scope(cards, ctx), cards.c.id == cid))
            .first()
        ):
            continue
        item = {**card, "id": cid, "created_by": "Published recipient research"}
        ctx["db"].execute(
            insert(cards).values(
                id=cid, workspace_id=ctx["wid"], revision=card["revision"], body=item
            )
        )
        added += 1
    return {"added": added, "skipped": len(incoming) - added}


@app.post("/api/ai", status_code=202)
def enqueue(body: AIIn, ctx=Depends(context)):
    can_edit(ctx)
    if (
        ctx["db"]
        .execute(
            select(func.count())
            .select_from(jobs)
            .where(scope(jobs, ctx), jobs.c.state.in_(["queued", "running"]))
        )
        .scalar_one()
        >= 2
    ):
        raise HTTPException(429, "Your workspace already has two pending suggestions.")
    selected = [card_row(ctx, cid)["body"] for cid in dict.fromkeys(body.card_ids)]
    if len(json.dumps(selected)) > 24000:
        raise HTTPException(422, "Select fewer or shorter sources.")
    job_id = uid()
    item = {
        "id": job_id,
        "state": "queued",
        "instruction": body.instruction,
        "card_ids": body.card_ids,
        "card_revisions": {x["id"]: x["revision"] for x in selected},
        "source_cards": selected,
        "created_at": stamp(),
        "result": None,
        "error": None,
        "trace_url": None,
        "evidence_url": "/api/jobs/" + job_id + "/evidence",
    }
    ctx["db"].execute(
        insert(jobs).values(
            id=job_id,
            workspace_id=ctx["wid"],
            user_id=ctx["user"]["id"],
            state="queued",
            created=time.time(),
            body=item,
        )
    )
    return {"job_id": job_id}


def job_row(ctx, job_id):
    row = (
        ctx["db"]
        .execute(select(jobs).where(scope(jobs, ctx), jobs.c.id == job_id))
        .mappings()
        .first()
    )
    if not row:
        raise HTTPException(404, "Suggestion not found in this workspace.")
    return row


@app.get("/api/jobs")
def recent_jobs(ctx=Depends(context)):
    return {
        "jobs": [
            r.body
            for r in ctx["db"].execute(
                select(jobs.c.body)
                .where(scope(jobs, ctx))
                .order_by(jobs.c.created.desc())
                .limit(20)
            )
        ]
    }


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, ctx=Depends(context)):
    return job_row(ctx, job_id)["body"]


@app.get("/api/jobs/{job_id}/evidence")
def job_evidence(job_id: str, ctx=Depends(context)):
    return JSONResponse(
        job_row(ctx, job_id)["body"],
        headers={
            "Content-Disposition": 'attachment; filename="suggestion-evidence.json"'
        },
    )


@app.post("/api/jobs/{job_id}/feedback")
def job_feedback(job_id: str, body: FeedbackIn, ctx=Depends(context)):
    can_edit(ctx)
    row = job_row(ctx, job_id)
    job = row["body"]
    if job["state"] != "succeeded" or not job.get("trace_id"):
        raise HTTPException(409, "Wait for a complete suggestion.")
    import mlflow
    from mlflow.entities import AssessmentSource

    mlflow.set_tracking_uri(
        os.environ.get("MLFLOW_TRACKING_URI", "http://127.0.0.1:5001")
    )
    mlflow.log_feedback(
        trace_id=job["trace_id"],
        name="useful_for_our_work",
        value=body.value,
        rationale=body.reason or "Explicit authenticated app feedback.",
        source=AssessmentSource(source_type="HUMAN", source_id=ctx["user"]["id"]),
        metadata={"workspace_id": ctx["wid"], "training_permission": "not_established"},
    )
    event_log(ctx, "suggestion_feedback", {"job_id": job_id, **body.model_dump()})
    return {"saved": True}

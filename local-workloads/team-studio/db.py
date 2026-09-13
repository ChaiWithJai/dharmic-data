"""Workspace-scoped storage. SQLite for the local pilot; PostgreSQL via DATABASE_URL."""

import os
from pathlib import Path
from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    String,
    Integer,
    Float,
    JSON,
    Text,
    ForeignKey,
    UniqueConstraint,
    event,
)

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("TEAM_STUDIO_DATA_DIR", str(ROOT / "data")))
DATA.mkdir(parents=True, exist_ok=True)
URL = os.environ.get("DATABASE_URL", "sqlite:///" + str(DATA / "team.sqlite3"))
engine = create_engine(
    URL,
    connect_args={"check_same_thread": False, "timeout": 20}
    if URL.startswith("sqlite")
    else {},
    pool_pre_ping=True,
)
if URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def configure_sqlite(conn, record):
        conn.isolation_level = None
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA journal_mode=WAL")

    @event.listens_for(engine, "begin")
    def begin_sqlite(conn):
        conn.exec_driver_sql("BEGIN IMMEDIATE")


meta = MetaData()
users = Table(
    "users",
    meta,
    Column("id", String, primary_key=True),
    Column("name", String, unique=True, nullable=False),
    Column("password_hash", Text, nullable=False),
)
sessions = Table(
    "sessions",
    meta,
    Column("token_hash", String, primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), nullable=False),
    Column("expires_at", Float, nullable=False),
)
workspaces = Table(
    "workspaces",
    meta,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("created_at", String, nullable=False),
)
members = Table(
    "members",
    meta,
    Column("workspace_id", String, ForeignKey("workspaces.id"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), primary_key=True),
    Column("role", String, nullable=False),
)
invites = Table(
    "invites",
    meta,
    Column("id", String, primary_key=True),
    Column("token_hash", String, unique=True, nullable=False),
    Column("workspace_id", String, ForeignKey("workspaces.id"), nullable=False),
    Column("role", String, nullable=False),
    Column("expires_at", Float, nullable=False),
    Column("used_by", String),
)
cards = Table(
    "cards",
    meta,
    Column("id", String, primary_key=True),
    Column(
        "workspace_id", String, ForeignKey("workspaces.id"), nullable=False, index=True
    ),
    Column("revision", Integer, nullable=False),
    Column("body", JSON, nullable=False),
)
boards = Table(
    "boards",
    meta,
    Column("workspace_id", String, ForeignKey("workspaces.id"), primary_key=True),
    Column("revision", Integer, nullable=False),
    Column("snapshot", JSON),
)
canonical = Table(
    "canonical",
    meta,
    Column("workspace_id", String, ForeignKey("workspaces.id"), primary_key=True),
    Column("revision", Integer, nullable=False),
    Column("body", JSON, nullable=False),
    Column("published_revision", Integer),
)
versions = Table(
    "canonical_versions",
    meta,
    Column("workspace_id", String, ForeignKey("workspaces.id"), primary_key=True),
    Column("revision", Integer, primary_key=True),
    Column("body", JSON, nullable=False),
)
reviews = Table(
    "reviews",
    meta,
    Column("workspace_id", String, ForeignKey("workspaces.id"), primary_key=True),
    Column("revision", Integer, primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), primary_key=True),
    Column("body", JSON, nullable=False),
)
decisions = Table(
    "decisions",
    meta,
    Column("id", String, primary_key=True),
    Column(
        "workspace_id", String, ForeignKey("workspaces.id"), nullable=False, index=True
    ),
    Column("body", JSON, nullable=False),
)
jobs = Table(
    "jobs",
    meta,
    Column("id", String, primary_key=True),
    Column(
        "workspace_id", String, ForeignKey("workspaces.id"), nullable=False, index=True
    ),
    Column("user_id", String, ForeignKey("users.id"), nullable=False),
    Column("state", String, nullable=False, index=True),
    Column("created", Float, nullable=False),
    Column("lease_until", Float),
    Column("body", JSON, nullable=False),
)
audit = Table(
    "audit",
    meta,
    Column("id", String, primary_key=True),
    Column(
        "workspace_id", String, ForeignKey("workspaces.id"), nullable=False, index=True
    ),
    Column("actor_id", String, nullable=False),
    Column("event", String, nullable=False),
    Column("body", JSON, nullable=False),
    Column("created_at", String, nullable=False),
)
# Initial pilot schema only. Production changes require reviewed migrations.
meta.create_all(engine)

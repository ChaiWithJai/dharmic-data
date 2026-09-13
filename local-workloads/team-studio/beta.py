"""Closed grants beta controls; credentials are checked before application routing."""
import hashlib, hmac, os, time
from fastapi import HTTPException
from sqlalchemy import Table, Column, String, Float, select, insert, update, delete
from db import meta, engine, invites, members

ENABLED = os.environ.get('STUDIO_ENV', 'local') == 'private-beta'
TOKEN = os.environ.get('STUDIO_GATEWAY_TOKEN', '')
if ENABLED and len(TOKEN) < 40:
    raise RuntimeError('Private beta requires a strong server-only gateway credential.')
roles = Table('beta_roles', meta, Column('user_id', String, primary_key=True), Column('role', String, nullable=False))
access = Table('beta_access', meta, Column('token_hash', String, primary_key=True), Column('expires_at', Float, nullable=False), Column('used_by', String), Column('workspace_id', String))
slots = Table('beta_guest_slots', meta, Column('learner_id', String, primary_key=True), Column('invite_id', String, nullable=False), Column('expires_at', Float, nullable=False), Column('used_by', String))
meta.create_all(engine)

def digest(value): return hashlib.sha256(value.encode()).hexdigest()

def enroll(conn, token, user_id):
    item = conn.execute(select(access).where(access.c.token_hash == digest(token)).with_for_update()).mappings().first()
    if item and not item['used_by'] and item['expires_at'] > time.time():
        conn.execute(update(access).where(access.c.token_hash == item['token_hash']).values(used_by=user_id))
        conn.execute(insert(roles).values(user_id=user_id, role='learner'))
        if item.get('workspace_id'):
            conn.execute(insert(members).values(workspace_id=item['workspace_id'], user_id=user_id, role='editor'))
        return
    invitation = conn.execute(select(invites).where(invites.c.token_hash == digest(token)).with_for_update()).mappings().first()
    if not invitation or invitation['used_by'] or invitation['expires_at'] < time.time():
        raise HTTPException(403, 'A valid, unused beta invitation is required.')
    conn.execute(insert(roles).values(user_id=user_id, role='guest'))
    conn.execute(insert(members).values(workspace_id=invitation['workspace_id'],user_id=user_id,role=invitation['role']))
    conn.execute(update(invites).where(invites.c.id == invitation['id']).values(used_by=user_id))
    conn.execute(update(slots).where(slots.c.invite_id == invitation['id']).values(used_by=user_id))

def reserve_guest(ctx, invite_id, expiry):
    conn=ctx['db'];user=ctx['user']['id']
    role=conn.execute(select(roles.c.role).where(roles.c.user_id==user)).scalar_one_or_none()
    if role != 'learner': raise HTTPException(403, 'Guest accounts do not include onward invitations. Ask Jai about beta access.')
    old=conn.execute(select(slots).where(slots.c.learner_id==user).with_for_update()).mappings().first()
    if old and (old['used_by'] or old['expires_at']>time.time()): raise HTTPException(409, 'Your one guest slot is already reserved or used.')
    if old: conn.execute(delete(slots).where(slots.c.learner_id==user))
    conn.execute(insert(slots).values(learner_id=user,invite_id=invite_id,expires_at=expiry))

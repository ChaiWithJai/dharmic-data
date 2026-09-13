"""Isolated closed-beta boundary tests; no production records or model requests."""
import os,tempfile,secrets,unittest,time
from pathlib import Path
os.environ['STUDIO_ENV']='private-beta'
os.environ['STUDIO_GATEWAY_TOKEN']=secrets.token_urlsafe(48)
os.environ['STUDIO_ALLOWED_ORIGINS']='https://beta.test'
tmp=tempfile.TemporaryDirectory();os.environ['TEAM_STUDIO_DATA_DIR']=tmp.name;os.environ.pop('DATABASE_URL',None)
from fastapi.testclient import TestClient
import api,beta
from sqlalchemy import insert,select

class BetaTests(unittest.TestCase):
 def client(self):
  return TestClient(api.app,base_url='https://beta.test',headers={'authorization':'Bearer '+beta.TOKEN,'origin':'https://beta.test','x-studio-client-ip':secrets.token_hex(8)})
 def admit(self,c):
  token=secrets.token_urlsafe(32)
  with api.engine.begin() as db:db.execute(insert(beta.access).values(token_hash=beta.digest(token),expires_at=time.time()+60))
  r=c.post('/api/register',json={'name':'person-'+secrets.token_hex(4),'password':'long-test-password','invitation':token});self.assertEqual(r.status_code,201,r.text);return r
 def test_gateway_and_origin(self):
  c=TestClient(api.app,base_url='https://beta.test');self.assertEqual(c.get('/api/session').status_code,403)
  c=self.client();self.assertEqual(c.post('/api/login',headers={'origin':'https://evil.test'},json={'name':'nobody','password':'long-test-password'}).status_code,403)
 def test_admission_cookie_and_replay(self):
  c=self.client();body={'name':'unknown-'+secrets.token_hex(4),'password':'long-test-password'}
  self.assertEqual(c.post('/api/register',json=body).status_code,403)
  r=self.admit(c);cookie=r.headers['set-cookie'];self.assertIn('Secure',cookie);self.assertIn('HttpOnly',cookie);self.assertIn('__Host-',cookie)
  self.assertIsNotNone(c.get('/api/session').json()['user'])
  with api.engine.begin() as db:used=db.execute(select(beta.access).where(beta.access.c.used_by==r.json()['user']['id'])).mappings().one()
  self.assertIsNotNone(used['used_by'])
 def test_learner_invitation_can_join_explicit_starter_room(self):
  owner=self.client();self.admit(owner);wid=owner.post('/api/workspaces',json={'name':'Explicit starter room'}).json()['id']
  token=secrets.token_urlsafe(32)
  with api.engine.begin() as db:db.execute(insert(beta.access).values(token_hash=beta.digest(token),expires_at=time.time()+60,workspace_id=wid))
  learner=self.client();r=learner.post('/api/register',json={'name':'starter-'+secrets.token_hex(4),'password':'long-test-password','invitation':token})
  self.assertEqual(r.status_code,201);self.assertEqual(r.json()['workspaces'],[{'id':wid,'name':'Explicit starter room','role':'editor'}])
 def test_one_guest_and_private_workspace(self):
  owner=self.client();self.admit(owner);wid=owner.post('/api/workspaces',json={'name':'Grant fixture'}).json()['id'];owner.headers['X-Workspace-ID']=wid
  r=owner.post('/api/workspaces/'+wid+'/invites',json={'role':'editor'});self.assertEqual(r.status_code,200,r.text);token=r.json()['token']
  self.assertEqual(owner.post('/api/workspaces/'+wid+'/invites',json={'role':'editor'}).status_code,409)
  guest=self.client();r=guest.post('/api/register',json={'name':'guest-'+secrets.token_hex(4),'password':'long-test-password','invitation':token});self.assertEqual(r.status_code,201,r.text)
  self.assertEqual(r.json()['workspaces'][0]['id'],wid)
  another=self.client();self.assertEqual(another.post('/api/register',json={'name':'replay-'+secrets.token_hex(4),'password':'long-test-password','invitation':token}).status_code,403)
  personal=guest.post('/api/workspaces',json={'name':'Guest private'}).json()['id'];guest.headers['X-Workspace-ID']=personal
  self.assertEqual(guest.post('/api/workspaces/'+personal+'/invites',json={'role':'editor'}).status_code,403)
  owner.headers['X-Workspace-ID']=personal;self.assertEqual(owner.get('/api/cards').status_code,403)
if __name__=='__main__':unittest.main()

import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from fastapi.testclient import TestClient

class StudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        os.environ['STUDIO_DATA_DIR']=cls.tmp.name
        spec=importlib.util.spec_from_file_location('studio_test_api',Path(__file__).with_name('api.py'))
        cls.module=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.module)
        cls.client=TestClient(cls.module.app)
    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()
    def test_persistence_conflict_and_restore(self):
        c=self.client
        card=c.post('/api/cards',json={'title':'Exact quotation','quote':'Preserve these words','note':'My interpretation'}).json()
        changed=c.put('/api/cards/'+card['id'],json={**card,'note':'Revised interpretation'})
        self.assertEqual(changed.status_code,200)
        self.assertEqual(c.put('/api/cards/'+card['id'],json=card).status_code,409)
        self.assertEqual(changed.json()['quote'],'Preserve these words')
        b=c.get('/api/board').json()
        saved=c.put('/api/board',json={'snapshot':{'store':{},'schema':{}},'revision':b['revision']})
        self.assertEqual(saved.status_code,200)
        self.assertEqual(c.put('/api/board',json=b).status_code,409)
        exported=c.get('/api/export').json()
        c.delete('/api/cards/'+card['id'])
        self.assertEqual(c.post('/api/import',json=exported).status_code,200)
        restored=next(x for x in c.get('/api/cards').json()['cards'] if x['id']==card['id'])
        self.assertEqual(restored['note'],'Revised interpretation')
        self.assertGreater(restored['revision'],changed.json()['revision'])
        self.assertEqual(c.put('/api/cards/'+card['id'],json=changed.json()).status_code,409)
        self.assertTrue(list(Path(self.tmp.name).glob('before-import-*.json')))
        # Independent connection proves the saved record is durable, not component memory.
        with self.module.connect() as db:self.assertIsNotNone(db.execute('SELECT id FROM cards WHERE id=?',(card['id'],)).fetchone())
    def test_invalid_import_is_atomic(self):
        before=self.client.get('/api/export').json()
        bad={**before,'cards':[{'id':'bad'}]}
        self.assertEqual(self.client.post('/api/import',json=bad).status_code,422)
        after=self.client.get('/api/export').json()
        self.assertEqual(before['cards'],after['cards']);self.assertEqual(before['board'],after['board'])
    def test_external_origin_and_missing_ai_card(self):
        self.assertEqual(self.client.post('/api/cards',json={'title':'bad'},headers={'Origin':'https://unrelated.example'}).status_code,403)
        self.assertEqual(self.client.post('/api/ai',json={'card_ids':['missing'],'instruction':'Help'}).status_code,404)
    def test_research_merge_preserves_edits_and_board(self):
        before=self.client.get('/api/board').json()
        first=self.client.post('/api/research/import').json()
        self.assertEqual(first['added'],30)
        card=self.client.get('/api/cards').json()['cards'][0]
        self.client.put('/api/cards/'+card['id'],json={**card,'note':'A real user could replace this note.'})
        again=self.client.post('/api/research/import').json()
        self.assertEqual(again,{'added':0,'skipped':30})
        kept=next(c for c in self.client.get('/api/cards').json()['cards'] if c['id']==card['id'])
        self.assertEqual(kept['note'],'A real user could replace this note.')
        self.assertEqual(before,self.client.get('/api/board').json())
    def test_explicit_feedback_contract_without_real_human_submission(self):
        # Exercise the adapter with mocks: automated tests must not create HUMAN
        # assessments on a real model trace.
        self.module.save_job({'id':'feedback-fixture','state':'succeeded','trace_id':'fixture-trace','run_id':'fixture-run'})
        with patch('mlflow.set_tracking_uri'),patch('mlflow.log_feedback',return_value=SimpleNamespace(assessment_id='fixture-assessment')) as log,patch('mlflow.MlflowClient') as client:
            response=self.client.post('/api/jobs/feedback-fixture/feedback',json={'value':False,'reason':'Fixture only'})
            self.assertEqual(response.status_code,200)
            self.assertEqual(log.call_args.kwargs['trace_id'],'fixture-trace')
            self.assertFalse(log.call_args.kwargs['value'])
            self.assertEqual(log.call_args.kwargs['metadata']['training_permission'],'not_established')
            client.return_value.set_tag.assert_called_once_with('fixture-run','human_review','NOT_USEFUL')

if __name__=='__main__':unittest.main()

"""Explicit synthetic store probe; no model call or participant data collection."""
import json
import os
import sys
from pathlib import Path

os.environ['LANGSMITH_TRACING'] = 'false'
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
from langgraph.store.mongodb import MongoDBStore

root = Path(__file__).resolve().parent
uri = os.environ.get('MONGODB_MEMORY_URI')
if not uri:
    uri = json.loads((root / 'data/connection.json').read_text())['uri']
namespace = ('imagine-together', 'synthetic-workspace-a', 'synthetic-user-a', 'approved-memory')
other = ('imagine-together', 'synthetic-workspace-b', 'synthetic-user-b', 'approved-memory')
key = 'restart-proof'
with MongoDBStore.from_conn_string(conn_string=uri, db_name='imagine_memory', collection_name='agent_memories') as store:
    action = sys.argv[1] if len(sys.argv) > 1 else 'read'
    if action == 'write':
        store.put(namespace, key, {'text': 'Synthetic preference: preserve unfinished questions.', 'status': 'fixture', 'source_revision': 1})
    elif action == 'delete':
        store.delete(namespace, key)
        assert store.get(namespace, key) is None
        print(json.dumps({'deleted': True}))
        sys.exit(0)
    elif action != 'read':
        raise SystemExit('Use write, read or delete')
    item = store.get(namespace, key)
    assert item is not None and item.value['status'] == 'fixture'
    assert store.get(other, key) is None
    assert not store.search(other)
    assert len(store.search(namespace, filter={'status': 'fixture'})) == 1
    print(json.dumps({'action': action, 'retrieved': True, 'other_namespace_empty': True, 'filtered_search': True, 'model_called': False}))

# Local MongoDB agent-memory feasibility lab

A separate optional memory store, not a replacement for Imagine Together's documents/database or Buzz's PostgreSQL. No participant data, embeddings, model requests or automatic learning are enabled.

Verified on Jai's ARM64 GB10, 2026-09-13: MongoDB 8.0.30 in the official ARM64 image; `langgraph-store-mongodb==0.4.0`, PyMongo 4.18.1. The official `MongoDBStore` wrote a synthetic scoped record, retrieved it from a new process after a container restart, filtered it, returned no result from another namespace, and deleted it. Namespace separation is a storage test, not an authorization test: the application still must enforce current membership.

Canonical API: https://www.mongodb.com/docs/atlas/ai-integrations/langgraph/

## Current local instance

Container `imagine-memory-local`, loopback `127.0.0.1:27019`, authenticated, named Docker volume `imagine-memory-data`, 1 CPU / 1 GiB memory cap / 0.25 GiB WiredTiger cache. Image digest is pinned in compose.yaml. It runs independently of the app. Restart policy depends on Docker starting; no host reboot, power-loss recovery or backup restore was tested.

Root initialization credentials are in ignored `.env` (0600). A separate `memory_app` database user has readWrite only on `imagine_memory`; its URI is in ignored `data/connection.json` (0600). Do not copy these files into source control, logs, frontend configuration or MLflow. Changing initialization variables does not rotate credentials in an existing volume.

`compose.yaml` records the desired instance configuration. The current instance was launched with docker run; do not run a second container with the same name or concurrently mount its database volume. To adopt Compose later, stop/remove only the existing container after backup while preserving the named volume, then start the Compose service. No automatic adoption is performed here.

## Reproduce the Python probe

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
# Supply MONGODB_MEMORY_URI securely for your own database,
# or use this machine's protected connection file.
.venv/bin/python probe.py write
# Restart only the memory container, then:
.venv/bin/python probe.py read
.venv/bin/python probe.py delete
```

For a fresh MongoDB instance, provision authenticated credentials and a database-scoped readWrite user before running the probe. The Compose file requires a private `.env` with MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD; never use example/default passwords. Keep loopback binding. Docker access may require a new shell with the docker group on this machine (`sg docker -c 'docker ...'` was used during verification).

There is no vector index or embedding configuration: exact-key and metadata retrieval work without an embedding provider. Semantic search, LangGraph checkpoint resume, useful model recall, application permissions, eviction/consent policies and backup recovery remain untested.

The synthetic record was deleted after verification. Do not infer that the app now remembers across conversations. See [memory decision and launch blockers](../../docs/studio/deployment/MEMORY-AND-LAUNCH.md).

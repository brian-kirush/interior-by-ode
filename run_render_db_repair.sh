#!/usr/bin/env bash
set -u

# run_render_db_repair.sh
# Usage: export DATABASE_URL='postgresql://user:pass@host:port/db?sslmode=require' && bash run_render_db_repair.sh
# This script will:
#  - check DNS for the DB host
#  - create a compressed backup (session_backup.dump)
#  - inspect session-related objects
#  - run repair_session.sql (included in repo)
#  - produce a log file repair_log.txt with all outputs

LOGFILE=repair_log.txt
BACKUP_FILE=session_backup.dump
SQL_FILE=repair_session.sql

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL env var is not set. Export it first and include ?sslmode=require if necessary." >&2
  echo "Example: export DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'" >&2
  exit 2
fi

echo "Repair run started at $(date -u +'%Y-%m-%dT%H:%M:%SZ')" | tee "$LOGFILE"

echo "\n--- Parsed host for DNS check ---" | tee -a "$LOGFILE"
HOST=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/?]+).*#\1#') || HOST=""
if [ -z "$HOST" ]; then
  echo "Could not parse host from DATABASE_URL" | tee -a "$LOGFILE"
else
  echo "Host: $HOST" | tee -a "$LOGFILE"
  echo "\n-- nslookup result --" | tee -a "$LOGFILE"
  nslookup "$HOST" 2>&1 | tee -a "$LOGFILE" || true
  echo "\n-- ping (one packet) --" | tee -a "$LOGFILE"
  ping -c1 "$HOST" 2>&1 | tee -a "$LOGFILE" || true
fi

# Backup
echo "\n--- Running pg_dump to create backup: $BACKUP_FILE ---" | tee -a "$LOGFILE"
pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_FILE" 2>&1 | tee -a "$LOGFILE" || {
  echo "pg_dump failed (see above). Aborting before running repair." | tee -a "$LOGFILE"
  exit 3
}

echo "Backup created: $(ls -lh "$BACKUP_FILE" 2>/dev/null || echo 'not found')" | tee -a "$LOGFILE"

# Inspection
echo "\n--- Inspecting session objects before repair ---" | tee -a "$LOGFILE"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.session') AS session_regclass;" 2>&1 | tee -a "$LOGFILE" || true
psql "$DATABASE_URL" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='session';" 2>&1 | tee -a "$LOGFILE" || true
psql "$DATABASE_URL" -c "SELECT conname, contype, conrelid::regclass::text FROM pg_constraint WHERE conname='session_pkey' OR conrelid = 'public.session'::regclass;" 2>&1 | tee -a "$LOGFILE" || true

# Run repair SQL
if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: $SQL_FILE not found in current directory. Make sure you're running this script from the repo root." | tee -a "$LOGFILE"
  exit 4
fi

echo "\n--- Running repair SQL: $SQL_FILE ---" | tee -a "$LOGFILE"
psql "$DATABASE_URL" -f "$SQL_FILE" 2>&1 | tee -a "$LOGFILE" || {
  echo "repair SQL failed (see log)." | tee -a "$LOGFILE"
  exit 5
}

# Post-repair verification
echo "\n--- Post-repair verification ---" | tee -a "$LOGFILE"
psql "$DATABASE_URL" -c "SELECT to_regclass('public.session') AS session_regclass;" 2>&1 | tee -a "$LOGFILE" || true
psql "$DATABASE_URL" -c "\d public.session" 2>&1 | tee -a "$LOGFILE" || true
psql "$DATABASE_URL" -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.session'::regclass;" 2>&1 | tee -a "$LOGFILE" || true
psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename='session';" 2>&1 | tee -a "$LOGFILE" || true

echo "\nRepair run completed at $(date -u +'%Y-%m-%dT%H:%M:%SZ')" | tee -a "$LOGFILE"

echo "\nLog written to $LOGFILE and backup to $BACKUP_FILE. Paste $LOGFILE here for me to review." | tee -a "$LOGFILE"

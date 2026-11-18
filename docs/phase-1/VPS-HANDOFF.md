# Read-only Ubuntu deployment/schema handoff

These commands read Git metadata and database structure. They do not deploy, import SQL, change database grants, restart services or export table rows. They create a private export directory/files on the VPS. Run in Bash as your normal deployment user. Do not change production configuration to make them work.

## 1. Identify the deployed checkout

Use the actual release directory serving the application, not an old checkout. If website, POS and backend use different checkouts, repeat for each and label the results. Resolve release symlinks with `readlink -f`. A checkout commit alone does not prove the running process or static assets were built from it; share an existing release/build SHA if your deployment records one.

```bash
read -r -p 'Absolute path to deployed Git checkout: ' DEPLOY_DIR
readlink -f -- "$DEPLOY_DIR"
git --no-optional-locks -C "$DEPLOY_DIR" rev-parse --show-toplevel
git --no-optional-locks -C "$DEPLOY_DIR" log -1 --format='%H%n%cI%n%s'
git --no-optional-locks -C "$DEPLOY_DIR" status --short --untracked-files=no
mysql --version
mysqldump --version
```

No status output means no tracked modifications were detected; it does not inspect ignored files or prove artifact parity. Do not share `.env`, `git remote -v`, full process environments or application logs. If no `.git` exists, report that and provide an existing release identifier; do not initialise a new repository.

## 2. MySQL 8.x structure-only export

The following block is for Oracle MySQL 8.x tools. If version output identifies MariaDB, MySQL 5.7 or another vendor, share the version strings first so we can adjust flags. Do not install/upgrade database software. Uses TCP localhost:3306; if your DB uses another endpoint, adjust that endpoint from your existing deployment configuration privately. Do not print configuration files.

Use an existing account permitted to read this application's schema. Every `--password` prompts privately; never append a password to the flag or share it. If access is denied, return the error after redaction rather than changing grants. The block stops if a command fails, avoiding a misleading partial export.

```bash
(
  set -euo pipefail
  umask 077
  read -r -p 'Application database name: ' DB_NAME
  read -r -p 'Existing database review username: ' DB_USER
  DB_HOST='127.0.0.1'
  DB_PORT='3306'
  EXPORT_DIR=$(mktemp -d "$HOME/littora-review.XXXXXX")

  env -u MYSQL_PWD mysql --no-defaults \
    --protocol=TCP --host="$DB_HOST" --port="$DB_PORT" \
    --user="$DB_USER" --password --database="$DB_NAME" \
    --batch --skip-column-names \
    --execute="SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME" \
    > "$EXPORT_DIR/base-tables.txt"

  mapfile -t TABLES < "$EXPORT_DIR/base-tables.txt"
  if [ "${#TABLES[@]}" -eq 0 ]; then
    printf 'No visible base tables; stopping. Check database and access.\n' >&2
    exit 1
  fi

  env -u MYSQL_PWD mysqldump --no-defaults \
    --protocol=TCP --host="$DB_HOST" --port="$DB_PORT" \
    --user="$DB_USER" --password \
    --default-character-set=utf8mb4 \
    --no-data --skip-triggers --skip-routines --skip-events \
    --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 \
    --skip-lock-tables --skip-add-locks --skip-add-drop-table \
    --skip-comments --skip-dump-date \
    -- "$DB_NAME" "${TABLES[@]}" \
    > "$EXPORT_DIR/littora-schema.sql"

  env -u MYSQL_PWD mysql --no-defaults \
    --protocol=TCP --host="$DB_HOST" --port="$DB_PORT" \
    --user="$DB_USER" --password --database="$DB_NAME" --batch \
    --execute="SELECT VERSION() AS server_version; SELECT TABLE_TYPE, COUNT(*) AS visible_objects FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() GROUP BY TABLE_TYPE; SELECT COUNT(*) AS visible_triggers FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE(); SELECT COUNT(*) AS visible_routines FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE(); SELECT COUNT(*) AS visible_events FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE();" \
    > "$EXPORT_DIR/schema-metadata.txt"

  test -s "$EXPORT_DIR/littora-schema.sql"
  printf '\nExport directory: %s\n' "$EXPORT_DIR"
  sha256sum "$EXPORT_DIR/littora-schema.sql"
)
```

Initial handoff deliberately excludes views, stored routines, triggers and scheduled events; these definitions may contain account definers, embedded literals or external actions. Metadata counts show whether a separate reviewed definition export is needed; visibility depends on account permissions, so a zero count is not proof none exists. No users/grants or system databases are requested. Application tables named users are included as empty structures, without account rows.

`--no-data` excludes table rows; the explicit base-table list also excludes views. No explicit table/global locks or replication metadata are requested. MySQL may still take brief metadata locks, and schema changes during export can make the result inconsistent; run while no deployment/schema migration is taking place. Do not add `--all-databases`, `--databases`, `--source-data`, `--master-data`, `--flush-logs`, `--lock-all-tables` or `--force`.

Reference: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## 3. Review before sharing

Replace the path below with the printed export directory. Review locally on the VPS; do not paste full SQL or possible secrets into chat.

```bash
less '/absolute/export/directory/littora-schema.sql'
```

Table defaults, generated expressions, connection clauses and table/column comments may contain hardcoded sensitive literals despite a no-data export. Remove sensitive literal values from the review copy, preserving types/constraints where possible, and note redactions. Do not assume a keyword scan proves absence of secrets. Do not send unreviewed files, credentials, private account rows or payment slips.

## 4. Exact local destinations

The directory already exists and is Git-ignored:

```text
C:\Users\User\.codex\worktrees\littora-phase1\BABYSTORE-POS\.staging\imports\
```

Use these names:

- `littora-schema-reviewed.sql` — reviewed structure-only SQL.
- `schema-metadata.txt` — reviewed server version/object counts.
- `deployment-version.txt` — labelled checkout path/commit/date/dirty status, plus any existing release SHA and redaction notes.

Use your normal SSH/SFTP client to download to these paths. The file is for review; do not import it into live MySQL or execute it automatically. We will compare it to the test schema before deciding what can be applied locally.

Share only commit/version strings and the local reviewed file path in chat. No production password or remote write access is needed for this handoff.

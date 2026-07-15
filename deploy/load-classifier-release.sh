#!/usr/bin/env bash

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
PREDICTIONS="${1:?usage: load-classifier-release.sh PREDICTIONS [METADATA] [CONTRACT]}"
METADATA="${2:-$ROOT/artifacts/frame_classifier/metadata.json}"
CONTRACT="${3:-${PREDICTIONS}.json}"
ENV_FILE="${METACAN_ENV_FILE:-$ROOT/.env}"

die() { printf 'load-classifier-release: %s\n' "$*" >&2; exit 1; }

command -v psql >/dev/null || die "psql is not on PATH"
command -v uv >/dev/null || die "uv is not on PATH"
command -v python3 >/dev/null || die "python3 is not on PATH"
[ -f "$PREDICTIONS" ] || die "prediction file is missing: $PREDICTIONS"
[ -f "$METADATA" ] || die "metadata file is missing: $METADATA"
[ -f "$CONTRACT" ] || die "output contract is missing: $CONTRACT"
[ -f "$ENV_FILE" ] || die "environment file is missing: $ENV_FILE"

database_url="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | head -n 1)"
database_url="${database_url#\"}"
database_url="${database_url%\"}"
[ -n "$database_url" ] || die "DATABASE_URL is missing from $ENV_FILE"

connection_dir="$(mktemp -d)"
cleanup() {
  unset database_url DATABASE_URL_TO_PARSE
  unset PGHOST PGPORT PGUSER PGDATABASE PGSSLMODE PGPASSFILE
  rm -rf "$connection_dir"
}
trap cleanup EXIT

DATABASE_URL_TO_PARSE="$database_url" python3 - "$connection_dir" <<'PY'
import os
import stat
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

destination = Path(sys.argv[1])
parsed = urlsplit(os.environ["DATABASE_URL_TO_PARSE"])
if parsed.scheme not in {"postgres", "postgresql"}:
    raise SystemExit("DATABASE_URL must use the postgres or postgresql scheme")

values = {
    "host": parsed.hostname or "",
    "port": str(parsed.port or 5432),
    "user": unquote(parsed.username or ""),
    "database": unquote(parsed.path.lstrip("/")),
    "sslmode": parse_qs(parsed.query).get("sslmode", ["prefer"])[-1],
}
if not values["host"] or not values["user"] or not values["database"]:
    raise SystemExit("DATABASE_URL must include a host, user, and database")

for name, value in values.items():
    (destination / name).write_text(value, encoding="utf-8")

def pgpass_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:")

password = unquote(parsed.password or "")
pgpass = ":".join(
    pgpass_value(value)
    for value in (
        values["host"],
        values["port"],
        values["database"],
        values["user"],
        password,
    )
)
pgpass_path = destination / "pgpass"
pgpass_path.write_text(f"{pgpass}\n", encoding="utf-8")
pgpass_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
PY

export PGHOST="$(< "$connection_dir/host")"
export PGPORT="$(< "$connection_dir/port")"
export PGUSER="$(< "$connection_dir/user")"
export PGDATABASE="$(< "$connection_dir/database")"
export PGSSLMODE="$(< "$connection_dir/sslmode")"
export PGPASSFILE="$connection_dir/pgpass"
unset database_url DATABASE_URL_TO_PARSE

printf 'load-classifier-release: applying the additive schema\n' >&2
psql -v ON_ERROR_STOP=1 -f "$ROOT/deploy/classifier-schema.sql"

printf 'load-classifier-release: validating and loading predictions\n' >&2
uv run python "$ROOT/deploy/load_classifier.py" \
  --predictions "$PREDICTIONS" \
  --metadata "$METADATA" \
  --contract "$CONTRACT" \
  | psql -v ON_ERROR_STOP=1

printf 'load-classifier-release: complete\n' >&2

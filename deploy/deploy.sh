#!/usr/bin/env bash
#
# One command deploy for metacan.xera.ac. Run it from anywhere in the repo:
#
#     ./deploy/deploy.sh
#
#
# WHY IT IS SHAPED THIS WAY
#
# Every other Node site on the VPS follows one convention: /var/www/<site> IS
# the application. /var/www/culicious/package.json is the app's package.json,
# and that directory is a git clone that tracks GitHub. Nothing on the server
# holds a copy of the whole source repo with the app buried inside it.
#
# /var/www/metacan broke that convention: it was a clone of this entire research
# repo, with the Next.js app sitting in a subdirectory. This script fixes that.
#
# The difficulty is that this repo cannot put the app at its root, because it is
# a research repo and the app is one directory inside it. Two requirements pull
# against each other:
#
#   1. /var/www/metacan must BE the app (its package.json at the top).
#   2. Server and local must stay in sync through GitHub.
#
# They are reconciled with a deploy branch. `git subtree split` republishes the
# app directory as a branch whose ROOT is that directory, and the server clones
# that branch. The server therefore gets the culicious layout exactly, and it is
# still a git checkout tracking GitHub, so `git pull` there is still meaningful.
# No third copy of the source exists on the server.
#
# The app directory is found by its .metacan-app marker, never by a hard-coded
# path, because the research repo is about to be reorganized. Rename or move the
# app directory and this keeps working, as long as the marker moves with it.
#
# Nothing here needs root. Installing the nginx vhost does; the script stages the
# file on the server and prints the exact sudo commands for Ahmad to paste.

set -euo pipefail

SSH_HOST="${METACAN_SSH_HOST:-hetzner-vps}"
APP_ROOT="${METACAN_APP_ROOT:-/var/www/metacan}"
DEPLOY_BRANCH="${METACAN_DEPLOY_BRANCH:-deploy/metacan}"
PM2_NAME="${METACAN_PM2_NAME:-metacan}"
PORT="${METACAN_PORT:-3111}"
CANDIDATE_PORT="${METACAN_CANDIDATE_PORT:-4111}"
REPO_URL="${METACAN_REPO_URL:-https://github.com/choxos/CaRN-data-challenge.git}"
DOMAIN="${METACAN_DOMAIN:-metacan.xera.ac}"

die()  { printf '\ndeploy: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"


# ---------------------------------------------------------------- locate the app
# Tracked markers only. An untracked stray copy, or one inside node_modules,
# must not be able to steer a deploy.
step "Locating the application directory"

markers="$(git ls-files | grep -E '(^|/)\.metacan-app$' || true)"
[ -n "$markers" ] || die "no tracked .metacan-app marker in this repo.
The deployable app directory must contain a file called .metacan-app.
Refusing to guess which directory is the website."

marker_count="$(printf '%s\n' "$markers" | wc -l | tr -d ' ')"
[ "$marker_count" -eq 1 ] || die "found $marker_count .metacan-app markers, expected exactly one:
$markers
Refusing to guess which directory is the website."

APP_DIR="$(dirname "$markers")"
[ "$APP_DIR" != "." ] || die "the marker is at the repo root; it must be in the app subdirectory"
[ -f "$APP_DIR/package.json" ] || die "$APP_DIR has no package.json, so it is not a Node application"

printf '    app directory: %s\n' "$APP_DIR"


# ------------------------------------------------------- refuse to ship stale code
# The deploy branch is built from committed history. If the app directory has
# work that is not committed, deploying would quietly ship the PREVIOUS commit
# and serve a stale build that looks like a fresh one. Stop instead.
step "Checking the app directory is fully committed"

if ! git diff --quiet HEAD -- "$APP_DIR"; then
    die "$APP_DIR has uncommitted changes.
The deploy branch is built from committed history, so deploying now would ship
the last commit and quietly serve a stale build. Commit or stash first."
fi

untracked="$(git ls-files --others --exclude-standard -- "$APP_DIR")"
[ -z "$untracked" ] || die "$APP_DIR has untracked files that would not be deployed:
$untracked
Commit them, ignore them, or remove them."

printf '    clean at %s\n' "$(git rev-parse --short HEAD)"


if [ -n "${METACAN_CLASSIFIER_PREDICTIONS:-}" ]; then
    step "Loading the classifier release"
    ./deploy/load-classifier-release.sh \
        "$METACAN_CLASSIFIER_PREDICTIONS" \
        "${METACAN_CLASSIFIER_METADATA:-$PWD/artifacts/frame_classifier/metadata.json}" \
        "${METACAN_CLASSIFIER_CONTRACT:-${METACAN_CLASSIFIER_PREDICTIONS}.json}"
fi


# ------------------------------------------------------- publish the deploy branch
# ONE squashed commit of the app tree at HEAD, not `git subtree split`. The split
# replays the app directory's entire history, and that history briefly tracked
# site/node_modules (added in 28b5e5ad, untracked again in 0452c67c), including a
# 109 MB binary that GitHub's 100 MB blob limit rejects on every push, forever.
# The deploy branch is a build artifact, not the record; the research repo keeps
# the history, and the server only ever does fetch --force + reset --hard, so a
# fresh root commit per deploy is exactly what it already expects.
step "Publishing $APP_DIR to the $DEPLOY_BRANCH branch"

tree_sha="$(git rev-parse "HEAD:$APP_DIR")"
[ -n "$tree_sha" ] || die "could not resolve the tree for $APP_DIR at HEAD"

split_sha="$(git commit-tree "$tree_sha" -m "deploy: $APP_DIR at $(git rev-parse --short HEAD)")"
[ -n "$split_sha" ] || die "git commit-tree produced nothing for $APP_DIR"

remote_ref="refs/heads/${DEPLOY_BRANCH}"
remote_sha="$(git ls-remote --heads origin "$remote_ref" | awk '{print $1}')"
git push --force-with-lease="${remote_ref}:${remote_sha}" origin "${split_sha}:${remote_ref}"
printf '    %s -> %s\n' "$DEPLOY_BRANCH" "${split_sha:0:12}"


# -------------------------------------------------------- stage the nginx vhost
# Root is needed to install it, so it is only staged here. The script prints the
# sudo commands at the end if the vhost is not live yet.
step "Staging the nginx vhost on $SSH_HOST"
scp -q deploy/nginx/"$DOMAIN" "$SSH_HOST:${DOMAIN}.nginx"
scp -q deploy/nginx/metacan-rate-limits.conf "$SSH_HOST:metacan-rate-limits.conf"
scp -q deploy/nginx/metacan-app.conf "$SSH_HOST:metacan-app.conf"
printf '    staged at ~/%s.nginx\n' "$DOMAIN"
printf '    staged at ~/metacan-rate-limits.conf\n'
printf '    staged at ~/metacan-app.conf\n'


# --------------------------------------------------------------------- server side
step "Deploying on $SSH_HOST"

ssh "$SSH_HOST" \
    APP_ROOT="$APP_ROOT" \
    DEPLOY_BRANCH="$DEPLOY_BRANCH" \
    REPO_URL="$REPO_URL" \
    PM2_NAME="$PM2_NAME" \
    PORT="$PORT" \
    CANDIDATE_PORT="$CANDIDATE_PORT" \
    DEPLOY_SHA="$split_sha" \
    DOMAIN="$DOMAIN" \
    bash -s <<'SERVER'
set -euo pipefail
die() { printf '\ndeploy(server): %s\n' "$*" >&2; exit 1; }

command -v npm  >/dev/null || die "npm is not on PATH"
command -v pm2  >/dev/null || die "pm2 is not on PATH"
command -v node >/dev/null || die "node is not on PATH"
command -v crontab >/dev/null || die "crontab is not on PATH"
command -v curl >/dev/null || die "curl is not on PATH"

case "$PORT:$CANDIDATE_PORT" in
    *[!0-9:]*|:*) die "METACAN_PORT and METACAN_CANDIDATE_PORT must be numeric" ;;
esac
[ "$PORT" != "$CANDIDATE_PORT" ] || die "the serving and candidate ports must differ"

RELEASES_ROOT="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
ENV_FILE="$APP_ROOT/.env"
LOG_ROOT="$APP_ROOT/logs"
BASELINE_MIGRATION="20260714000000_existing_schema_baseline"
legacy_target=""

# Convert the previous single-checkout layout once. The environment file moves
# to a stable parent, while the old checkout stays available as a dated backup.
if [ ! -d "$RELEASES_ROOT" ]; then
    echo "--> preparing the immutable release layout"
    saved_env=""
    if [ -e "$APP_ROOT" ]; then
        legacy_app=""
        if [ -f "$APP_ROOT/package.json" ]; then
            legacy_app="$APP_ROOT"
        else
            legacy_markers="$(find "$APP_ROOT" -maxdepth 3 -name .metacan-app -not -path '*/node_modules/*' 2>/dev/null)"
            legacy_marker_count="$(printf '%s\n' "$legacy_markers" | sed '/^$/d' | wc -l | tr -d ' ')"
            if [ "$legacy_marker_count" -eq 1 ]; then
                candidate_legacy_app="$(dirname "$legacy_markers")"
                if [ -f "$candidate_legacy_app/package.json" ]; then
                    legacy_app="$candidate_legacy_app"
                fi
            fi
        fi
        found=""
        for candidate in "$APP_ROOT/.env" "$APP_ROOT/site/.env"; do
            if [ -f "$candidate" ]; then
                found="$candidate"
                break
            fi
        done
        if [ -z "$found" ]; then
            found="$(find "$APP_ROOT" -maxdepth 3 -name .env -not -path '*/node_modules/*' -print -quit 2>/dev/null)"
        fi
        [ -n "$found" ] || die "no environment file was found in the existing checkout.
The existing application was not moved. Add DATABASE_URL and OPENALEX_API_KEY
to its environment file, then re-run the deployment."

        legacy_database_url="$(sed -n 's/^DATABASE_URL=//p' "$found" | head -1)"
        legacy_database_url="${legacy_database_url#\"}"
        legacy_database_url="${legacy_database_url%\"}"
        [ -n "$legacy_database_url" ] || die "$found has no usable DATABASE_URL value.
The existing application was not moved."
        legacy_openalex_key="$(sed -n 's/^OPENALEX_API_KEY=//p' "$found" | head -1)"
        legacy_openalex_key="${legacy_openalex_key#\"}"
        legacy_openalex_key="${legacy_openalex_key%\"}"
        [ -n "$legacy_openalex_key" ] || die "$found has no usable OPENALEX_API_KEY value.
The existing application was not moved. Add a free OpenAlex API key directly
to this file, then re-run the deployment."
        unset legacy_database_url legacy_openalex_key

        saved_env="$(mktemp)"
        cp "$found" "$saved_env"
        chmod 600 "$saved_env"
        echo "    preserved the environment file"
        backup="${APP_ROOT}.old.$(date +%Y%m%d%H%M%S)"
        mv "$APP_ROOT" "$backup"
        echo "    previous checkout kept at $backup"
        if [ -n "$legacy_app" ]; then
            legacy_target="${backup}${legacy_app#"$APP_ROOT"}"
            echo "    previous application retained as the first rollback target"
        fi
    fi
    mkdir -p "$RELEASES_ROOT" "$LOG_ROOT"
    if [ -n "$saved_env" ]; then
        mv "$saved_env" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
    fi
else
    mkdir -p "$RELEASES_ROOT" "$LOG_ROOT"
fi

[ -f "$ENV_FILE" ] || die "$ENV_FILE is missing.
It holds DATABASE_URL and OPENALEX_API_KEY outside every release. Restore it and re-run."
chmod 600 "$ENV_FILE"

# Validate required values without printing either secret.
database_url_value="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | head -1)"
database_url_value="${database_url_value#\"}"
database_url_value="${database_url_value%\"}"
[ -n "$database_url_value" ] || die "$ENV_FILE has no usable DATABASE_URL value"
openalex_key_value="$(sed -n 's/^OPENALEX_API_KEY=//p' "$ENV_FILE" | head -1)"
openalex_key_value="${openalex_key_value#\"}"
openalex_key_value="${openalex_key_value%\"}"
[ -n "$openalex_key_value" ] || die "$ENV_FILE has no usable OPENALEX_API_KEY value.
The complete daily recent-work sync exceeds the anonymous OpenAlex allowance.
Add a free OpenAlex API key directly to this file and re-run the deployment."
unset openalex_key_value

# Clone a new immutable release. The serving symlink is untouched until every
# preparation step and the candidate health check have succeeded.
release_id="$(date +%Y%m%d%H%M%S)-${DEPLOY_SHA:0:12}"
release_dir="$RELEASES_ROOT/$release_id"
[ ! -e "$release_dir" ] || die "release directory already exists: $release_dir"
echo "--> cloning release $release_id"
git clone --quiet --branch "$DEPLOY_BRANCH" --single-branch "$REPO_URL" "$release_dir"
[ "$(git -C "$release_dir" rev-parse HEAD)" = "$DEPLOY_SHA" ] \
    || die "the cloned deploy branch does not match the published release"
ln -s ../../.env "$release_dir/.env"
[ -f "$release_dir/package.json" ] || die "the release has no package.json"
[ -f "$release_dir/.metacan-app" ] || die "the release has no .metacan-app marker"

cd "$release_dir"
echo "--> npm ci"
npm ci --no-audit --no-fund

# The build and migrations use a small pool. This leaves capacity for the
# release that is still serving throughout preparation.
build_db_url="$database_url_value"
unset database_url_value
case "$build_db_url" in
    *\?*) build_db_url="${build_db_url}&connection_limit=5" ;;
    *)    build_db_url="${build_db_url}?connection_limit=5" ;;
esac

echo "--> checking the Prisma migration baseline"
baseline_status="$(DATABASE_URL="$build_db_url" node scripts/check-prisma-baseline.mjs)"
case "$baseline_status" in
    clean|resolved) ;;
    needs-resolve)
        echo "    marking the verified legacy baseline as applied"
        DATABASE_URL="$build_db_url" npx prisma migrate resolve \
            --applied "$BASELINE_MIGRATION"
        ;;
    *) die "unexpected migration baseline status: $baseline_status" ;;
esac

echo "--> applying database migrations"
DATABASE_URL="$build_db_url" npx prisma migrate deploy
echo "--> refreshing empty facet tables"
DATABASE_URL="$build_db_url" node scripts/refresh-facets.mjs
echo "--> refreshing the recent OpenAlex layer when stale"
DATABASE_URL="$build_db_url" node scripts/sync-recent-openalex.mjs --if-stale-hours 20
echo "--> building the release"
DATABASE_URL="$build_db_url" npm run build
unset build_db_url baseline_status

health_check() {
    local check_port="$1"
    local label="$2"
    local code=""
    for _ in $(seq 1 30); do
        code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
            "http://127.0.0.1:${check_port}/" || true)"
        [ "$code" = "200" ] && break
        sleep 2
    done
    if [ "$code" != "200" ]; then
        printf '    %s did not answer HTTP 200 on port %s\n' "$label" "$check_port" >&2
        return 1
    fi

    local summary_json
    summary_json="$(curl -fsS --max-time 60 \
        "http://127.0.0.1:${check_port}/api/v1/stats/summary")" || return 1
    printf '%s' "$summary_json" | node -e '
let body = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { body += chunk; });
process.stdin.on("end", () => {
  const value = JSON.parse(body);
  if (value.works !== 4299418) process.exit(1);
});
' || return 1

    local classifier_json
    classifier_json="$(curl -fsS --max-time 60 \
        "http://127.0.0.1:${check_port}/api/v1/works?label_source=classifier&per_page=1")" \
        || return 1
    printf '%s' "$classifier_json" | node -e '
let body = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { body += chunk; });
process.stdin.on("end", () => {
  const classifier = JSON.parse(body)?.meta?.classifier;
  if (classifier?.version !== "metacan-v1-d91a1de5be90") process.exit(1);
  if (classifier?.frame_rows_covered !== 4299418) process.exit(1);
});
' || return 1

    curl -fsS --max-time 60 \
        "http://127.0.0.1:${check_port}/api/v1/works/W2096287682" >/dev/null \
        || return 1
    echo "    $label is healthy on port $check_port"
}

candidate_name="${PM2_NAME}-candidate"
echo "--> starting the candidate release"
pm2 delete "$candidate_name" >/dev/null 2>&1 || true
PORT="$CANDIDATE_PORT" pm2 start npm --name "$candidate_name" \
    --cwd "$release_dir" -- start >/dev/null
if ! health_check "$CANDIDATE_PORT" "candidate release"; then
    pm2 logs "$candidate_name" --lines 80 --nostream >&2 || true
    pm2 delete "$candidate_name" >/dev/null 2>&1 || true
    die "candidate health checks failed; the serving release was not changed"
fi

previous_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
if [ -z "$previous_target" ] && [ -n "$legacy_target" ]; then
    previous_target="$legacy_target"
fi
next_link="$APP_ROOT/.current.$$"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$CURRENT_LINK"

echo "--> activating release $release_id"
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
PORT="$PORT" pm2 start npm --name "$PM2_NAME" \
    --cwd "$CURRENT_LINK" -- start >/dev/null

if ! health_check "$PORT" "serving release"; then
    echo "    serving health checks failed; restoring the previous release" >&2
    if [ -n "$previous_target" ] && [ -d "$previous_target" ]; then
        rollback_link="$APP_ROOT/.current.rollback.$$"
        ln -s "$previous_target" "$rollback_link"
        mv -Tf "$rollback_link" "$CURRENT_LINK"
        pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
        PORT="$PORT" pm2 start npm --name "$PM2_NAME" \
            --cwd "$CURRENT_LINK" -- start >/dev/null
        health_check "$PORT" "restored release" \
            || die "the new release failed and the previous release could not be restored"
        pm2 save >/dev/null
    else
        pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
    fi
    pm2 delete "$candidate_name" >/dev/null 2>&1 || true
    die "the new release failed its serving health checks and was rolled back"
fi

pm2 delete "$candidate_name" >/dev/null 2>&1 || true
pm2 save >/dev/null

echo "--> installing the daily OpenAlex schedule"
cron_file="$(mktemp)"
(crontab -l 2>/dev/null || true) | awk '!/metacan_recent_sync/' > "$cron_file"
node_bin="$(command -v node)"
printf '15 5 * * * cd "%s" && "%s" scripts/sync-recent-openalex.mjs --if-stale-hours 20 >> "%s/recent-sync.log" 2>&1 # metacan_recent_sync\n' \
    "$CURRENT_LINK" "$node_bin" "$LOG_ROOT" >> "$cron_file"
crontab "$cron_file"
rm -f "$cron_file"
echo "    daily update scheduled for 05:15 server time"
echo "    release $release_id is active"

if [ -e "/etc/nginx/sites-available/${DOMAIN}" ] && \
   [ -e "/etc/nginx/conf.d/metacan-rate-limits.conf" ] && \
   [ -e "/etc/nginx/snippets/metacan-app.conf" ] && \
   grep -Fq "server_name ${DOMAIN};" "/etc/nginx/sites-available/${DOMAIN}" && \
   grep -Fq "include /etc/nginx/snippets/metacan-app.conf;" "/etc/nginx/sites-available/${DOMAIN}" && \
   cmp -s "$HOME/metacan-rate-limits.conf" "/etc/nginx/conf.d/metacan-rate-limits.conf" && \
   cmp -s "$HOME/metacan-app.conf" "/etc/nginx/snippets/metacan-app.conf"; then
    echo "    installed nginx configuration matches the staged files"
else
    echo "    nginx activation is required after this application release"
fi
SERVER


# --------------------------------------------------------------------------- done
step "Application release activated"

nginx_state="$(ssh "$SSH_HOST" DOMAIN="$DOMAIN" bash -s <<'NGINX_CHECK'
set -euo pipefail
if [ -e "/etc/nginx/sites-available/${DOMAIN}" ] && \
   [ -e "/etc/nginx/conf.d/metacan-rate-limits.conf" ] && \
   [ -e "/etc/nginx/snippets/metacan-app.conf" ] && \
   grep -Fq "server_name ${DOMAIN};" "/etc/nginx/sites-available/${DOMAIN}" && \
   grep -Fq "include /etc/nginx/snippets/metacan-app.conf;" "/etc/nginx/sites-available/${DOMAIN}" && \
   cmp -s "$HOME/metacan-rate-limits.conf" "/etc/nginx/conf.d/metacan-rate-limits.conf" && \
   cmp -s "$HOME/metacan-app.conf" "/etc/nginx/snippets/metacan-app.conf"; then
    echo current
else
    echo needs-install
fi
NGINX_CHECK
)"

if [ "$nginx_state" = "current" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/" || true)"
    printf '    https://%s/ -> HTTP %s\n' "$DOMAIN" "$code"
    [ "$code" = "200" ] || die "the public HTTPS endpoint did not return HTTP 200"
else
    cat <<EOF

    The application release is active and healthy on the server. The staged
    nginx files differ from the installed files or are missing. Root access is
    required to activate the matching proxy and request limits. Run these in
    order:

      sudo cp ~/${DOMAIN}.nginx /etc/nginx/sites-available/${DOMAIN}
      sudo cp ~/metacan-rate-limits.conf /etc/nginx/conf.d/metacan-rate-limits.conf
      sudo cp ~/metacan-app.conf /etc/nginx/snippets/metacan-app.conf
      sudo ln -sfn /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
      sudo nginx -t
      sudo systemctl reload nginx
      sudo certbot --nginx -d ${DOMAIN} --agree-tos -m ahmad.pub@gmail.com --redirect

EOF
    exit 2
fi

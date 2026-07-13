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


# ------------------------------------------------------- publish the deploy branch
# subtree split rewrites the app directory's history into a branch whose root is
# that directory. --force because renaming the app directory (which the coming
# reorganization may do) changes the prefix and so rewrites the synthetic history.
step "Publishing $APP_DIR to the $DEPLOY_BRANCH branch"

split_sha="$(git subtree split --prefix="$APP_DIR" HEAD)"
[ -n "$split_sha" ] || die "git subtree split produced nothing for $APP_DIR"

git push --force origin "${split_sha}:refs/heads/${DEPLOY_BRANCH}"
printf '    %s -> %s\n' "$DEPLOY_BRANCH" "${split_sha:0:12}"


# -------------------------------------------------------- stage the nginx vhost
# Root is needed to install it, so it is only staged here. The script prints the
# sudo commands at the end if the vhost is not live yet.
step "Staging the nginx vhost on $SSH_HOST"
scp -q deploy/nginx/"$DOMAIN" "$SSH_HOST:${DOMAIN}.nginx"
printf '    staged at ~/%s.nginx\n' "$DOMAIN"


# --------------------------------------------------------------------- server side
step "Deploying on $SSH_HOST"

ssh "$SSH_HOST" \
    APP_ROOT="$APP_ROOT" \
    DEPLOY_BRANCH="$DEPLOY_BRANCH" \
    REPO_URL="$REPO_URL" \
    PM2_NAME="$PM2_NAME" \
    PORT="$PORT" \
    DOMAIN="$DOMAIN" \
    bash -s <<'SERVER'
set -euo pipefail
die() { printf '\ndeploy(server): %s\n' "$*" >&2; exit 1; }

command -v npm  >/dev/null || die "npm is not on PATH"
command -v pm2  >/dev/null || die "pm2 is not on PATH"

# 1. Make APP_ROOT a checkout of the deploy branch, whose root is the app.
current_branch="$(git -C "$APP_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

if [ "$current_branch" = "$DEPLOY_BRANCH" ]; then
    echo "--> updating the existing checkout"
    git -C "$APP_ROOT" fetch --force --quiet origin "$DEPLOY_BRANCH"
    git -C "$APP_ROOT" reset --hard --quiet FETCH_HEAD
else
    echo "--> $APP_ROOT is not a $DEPLOY_BRANCH checkout, rebuilding it"

    # Rescue the secret before anything moves. .env is deliberately not in git,
    # so a fresh clone would not bring it back.
    saved_env=""
    if [ -e "$APP_ROOT" ]; then
        found="$(find "$APP_ROOT" -maxdepth 2 -name .env -not -path '*/node_modules/*' 2>/dev/null | head -1)"
        if [ -n "$found" ]; then
            saved_env="$(mktemp)"
            cp "$found" "$saved_env"
            echo "    rescued $found"
        fi
        backup="${APP_ROOT}.old.$(date +%Y%m%d%H%M%S)"
        mv "$APP_ROOT" "$backup"
        echo "    previous tree kept at $backup"
    fi

    git clone --quiet --branch "$DEPLOY_BRANCH" --single-branch "$REPO_URL" "$APP_ROOT"

    if [ -n "$saved_env" ]; then
        cp "$saved_env" "$APP_ROOT/.env"
        chmod 600 "$APP_ROOT/.env"
        rm -f "$saved_env"
        echo "    restored .env"
    fi
fi

# 2. The whole point of the exercise: the web root IS the app.
[ -f "$APP_ROOT/package.json"  ] || die "$APP_ROOT/package.json is missing: the deploy branch root is not the app"
[ -f "$APP_ROOT/.metacan-app"  ] || die "$APP_ROOT/.metacan-app is missing: this is not the MetaCan app"

# 3. The database URL. Never invent one, never guess: fail and say what is wrong.
[ -f "$APP_ROOT/.env" ] || die "$APP_ROOT/.env is missing.
It holds DATABASE_URL and is deliberately kept out of git. Restore it and re-run."
grep -q '^DATABASE_URL=' "$APP_ROOT/.env" || die "$APP_ROOT/.env has no DATABASE_URL line"

# 4. Install and build. If the build fails we stop here WITHOUT restarting pm2:
#    the old build keeps serving, but this deploy exits non-zero and says so
#    rather than silently publishing a broken or stale tree.
cd "$APP_ROOT"
echo "--> npm ci"
npm ci --no-audit --no-fund
echo "--> npm run build"
# The build prerenders pages against the SAME Postgres the live app is using,
# and this host caps max_connections at 50, most of which the live app's idle
# pool already holds. Prisma's default pool (2 x cores + 1, per build worker)
# blows through the remainder and the build dies mid-prerender with "too many
# clients". So the BUILD runs with a small explicit pool; the runtime app is
# untouched.
build_db_url="$(grep '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
case "$build_db_url" in
    *\?*) build_db_url="${build_db_url}&connection_limit=5" ;;
    *)    build_db_url="${build_db_url}?connection_limit=5" ;;
esac
DATABASE_URL="$build_db_url" npm run build

# 5. Point pm2 at the new root. The cwd changed, so the process is recreated
#    rather than reloaded.
echo "--> restarting pm2 process '$PM2_NAME'"
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$PM2_NAME" --cwd "$APP_ROOT" -- start
pm2 save >/dev/null

# 6. Prove it actually serves, and that the database answers. A build that boots
#    but cannot reach Postgres is a failed deploy, not a successful one.
echo "--> health check"
code=""
for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}/" || true)"
    [ "$code" = "200" ] && break
    sleep 2
done
[ "$code" = "200" ] || die "the app did not answer 200 on 127.0.0.1:${PORT} within 60s.
Check: pm2 logs $PM2_NAME"

curl -fsS --max-time 60 "http://127.0.0.1:${PORT}/api/v1/stats/summary" >/dev/null \
    || die "the app is up but its database query failed. Check DATABASE_URL in $APP_ROOT/.env"

echo "    app healthy on 127.0.0.1:${PORT}, database reachable"

# 7. Is nginx actually routing the domain yet? This needs root to fix, so only report.
if [ -e "/etc/nginx/sites-enabled/${DOMAIN}" ]; then
    echo "    nginx vhost is installed"
else
    echo "    NOTE: no nginx vhost for ${DOMAIN} yet (needs root, see below)"
fi
SERVER


# --------------------------------------------------------------------------- done
step "Deployed"

vhost_live="$(ssh "$SSH_HOST" "test -e /etc/nginx/sites-enabled/${DOMAIN} && echo yes || echo no")"

if [ "$vhost_live" = "yes" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://${DOMAIN}/" || true)"
    printf '    http://%s/ -> HTTP %s\n' "$DOMAIN" "$code"
else
    cat <<EOF

    The app is built, running and healthy on the server, but nginx does not yet
    route ${DOMAIN} to it. That step needs root. Paste these, in order:

      sudo cp ~/${DOMAIN}.nginx /etc/nginx/sites-available/${DOMAIN}
      sudo ln -sfn /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
      sudo nginx -t
      sudo systemctl reload nginx
      sudo certbot --nginx -d ${DOMAIN} --agree-tos -m ahmad.pub@gmail.com --redirect

EOF
fi

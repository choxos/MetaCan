#!/usr/bin/env bash
set -Eeuo pipefail

app_dir="${METACAN_APP_DIR:-/var/www/metacan}"
process_name="${METACAN_PM2_PROCESS:-metacan}"
rollback_dir=".next.rollback"
failed_dir=".next.failed-$(date -u +%Y%m%dT%H%M%SZ)-$$"
process_stopped=0
release_healthy=0

restore_previous_build() {
  status=$?
  if [[ "$release_healthy" -eq 0 && "$process_stopped" -eq 1 ]]; then
    set +e
    if [[ -d "$rollback_dir" ]]; then
      if [[ -d .next ]]; then
        mv .next "$failed_dir"
      fi
      mv "$rollback_dir" .next
    fi
    pm2 restart "$process_name" --update-env
    pm2 save
    set -e
  fi
  exit "$status"
}

trap restore_previous_build EXIT

cd "$app_dir"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Tracked production files have local changes." >&2
  exit 1
fi
if [[ -e "$rollback_dir" ]]; then
  echo "$rollback_dir already exists. Inspect it before another deployment." >&2
  exit 1
fi

git fetch origin webapp:refs/remotes/origin/webapp
git switch webapp
git merge --ff-only origin/webapp

npm ci
npm run db:preflight
npm run db:migrate
npm run db:refresh-facets

if [[ ! -d .next ]]; then
  echo "The current production build is missing." >&2
  exit 1
fi

pm2 stop "$process_name"
process_stopped=1
mv .next "$rollback_dir"

npm run build
if [[ -d "$rollback_dir/static" ]]; then
  mkdir -p .next/static
  cp -a "$rollback_dir/static/." .next/static/
fi

pm2 restart "$process_name" --update-env
pm2 save

healthy=0
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:3111/ >/dev/null; then
    healthy=1
    break
  fi
  sleep 1
done
if [[ "$healthy" -ne 1 ]]; then
  echo "The new build did not pass its local health check." >&2
  exit 1
fi

release_healthy=1
trap - EXIT
rm -rf "$rollback_dir"

echo "MétaCan production deployment completed."

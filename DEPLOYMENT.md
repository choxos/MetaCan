# Production deployment

The production checkout lives at `/var/www/metacan`, tracks the `webapp` branch, and is managed by PM2 as `metacan`. Nginx proxies `metacan.xera.ac` to port 3111.

## Protected environment

Keep production values in `/var/www/metacan/.env` with mode 600. The required values are:

```dotenv
DATABASE_URL="postgresql://..."
OPENALEX_API_KEY="..."
METACAN_RECENT_DAYS="30"
```

Do not place credentials in Git, shell history, process arguments, or deployment logs.

## Update sequence

Confirm the checkout is clean and that a current database backup exists. Then run:

```bash
cd /var/www/metacan
git fetch origin webapp
git switch webapp
git merge --ff-only origin/webapp
npm ci
npm run db:preflight
npm run db:migrate
npm run db:refresh-facets
npm run build
npm run sync:recent -- --if-stale-hours 20
pm2 restart metacan --update-env
pm2 save
```

The build must finish before PM2 restarts. If any command before the restart fails, the running process remains untouched.

## Daily update

Install one crontab entry for the rolling OpenAlex layer:

```cron
15 5 * * * cd /var/www/metacan && /usr/bin/node scripts/sync-recent-openalex.mjs --if-stale-hours 20 >> /var/www/metacan/recent-sync.log 2>&1 # metacan_recent_sync
```

Use the absolute path returned by `command -v node` if Node is installed elsewhere.

## Health checks

```bash
curl --fail --silent --show-error https://metacan.xera.ac/
curl --fail --silent --show-error https://metacan.xera.ac/api/v1/stats/summary
curl --fail --silent --show-error 'https://metacan.xera.ac/api/v1/works?label_source=classifier&per_page=1'
curl --fail --silent --show-error https://metacan.xera.ac/api/v1/recent
```

The summary must report 4,299,418 frozen works. The classifier response must report `metacan-v1-d91a1de5be90` with full frame coverage. The recent endpoint must report its own update status and must not alter the frozen count.

## Nginx

The files under `ops/nginx` separate the Certbot managed virtual host from the application proxy and rate limit configuration. After a configuration change:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

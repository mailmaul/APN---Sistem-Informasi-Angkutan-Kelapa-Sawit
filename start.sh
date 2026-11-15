#!/usr/bin/env bash
# pm2 entrypoint — port & host sudah ditetapkan di script "start" package.json.
set -euo pipefail
cd /home/ubuntu/apn-app
exec npm run start

#!/usr/bin/env bash
# Build the static export and publish it to the gh-pages branch (GitHub Pages).
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE_URL=$(git remote get-url origin)

npm run build
touch out/.nojekyll

cd out
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy static export"
git push -f "$REMOTE_URL" gh-pages
rm -rf .git

echo "Deployed: https://artme-nx.github.io/artificial-media-v2/"

#!/usr/bin/env bash
# On Windows: npm install requires Python 3 (for better-sqlite3). Install from python.org
# or use: npm config set python "C:\Path\To\python.exe"
set -euo pipefail

echo "Setting up environment variables..."
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env file from .env.example"
else
  echo ".env already exists, skipping"
fi

echo "Making temp folder..."
mkdir -p tmp
touch tmp/db.sqlite3
echo "Created tmp/db.sqlite3 file"

echo "Installing dependencies..."
npm install

echo "Generating app key..."
node ace generate:key

echo "Running database migrations..."
node ace migration:run

echo "Seeding database..."
node ace db:seed || echo "Seed skipped or failed (optional)"

echo "Setup complete."



#!/bin/bash
set -e

echo "==> Running database migrations..."
cd backend && npx prisma migrate deploy && cd ..

echo "==> Starting production services..."
docker compose up -d --build

echo "==> Waiting for API to be ready..."
sleep 10

echo "==> Health check..."
curl -f http://localhost:3001/api/health && echo ""

echo "==> Deployment successful!"
echo "    Frontend: http://localhost:5173"
echo "    Backend:  http://localhost:3001"

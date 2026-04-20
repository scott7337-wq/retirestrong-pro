#!/bin/bash
# RetireStrong Launcher
# Double-click this file to start everything

cd ~/Documents/retirestrong-personal

echo "🚀 Starting RetireStrong..."
echo ""

# ── Kill any stale processes ──────────────────────────────────────────────────
echo "🧹 Cleaning up old processes..."
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
sleep 1

# ── Check PostgreSQL ──────────────────────────────────────────────────────────
echo "🗄️  Checking PostgreSQL..."
if /Applications/Postgres.app/Contents/Versions/18/bin/psql -U $USER -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ PostgreSQL is running"
else
  echo "⚠️  PostgreSQL not running — opening Postgres.app..."
  open -a "Postgres"
  sleep 3
fi

# ── Start proxy server ────────────────────────────────────────────────────────
echo ""
echo "🔌 Starting proxy server on port 3001..."
node ~/Documents/retirestrong-personal/server.cjs &
PROXY_PID=$!
sleep 2

# ── Test proxy ────────────────────────────────────────────────────────────────
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✅ Proxy running (PID $PROXY_PID)"
else
  echo "⚠️  Proxy may still be starting..."
fi

# ── Start Vite ────────────────────────────────────────────────────────────────
echo ""
echo "⚡ Starting Vite dev server on port 5173..."
npm run dev &
VITE_PID=$!
sleep 3

# ── Open browser ─────────────────────────────────────────────────────────────
echo ""
echo "🌐 Opening RetireStrong in Chrome..."
sleep 2
open -a "Google Chrome" http://localhost:5173

echo ""
echo "✅ RetireStrong is running!"
echo "   App:   http://localhost:5173"
echo "   Proxy: http://localhost:3001"
echo ""
echo "⚠️  Keep this window open — closing it will stop the servers."
echo "   Press Ctrl+C to shut everything down."

# ── Wait and keep alive ───────────────────────────────────────────────────────
wait $PROXY_PID

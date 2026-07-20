#!/usr/bin/env bash
# Site Factory notifier: phone push via ntfy.sh (topic in .claude/ntfy-topic) + desktop fallback.
MSG="${1:-Site Factory update}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOPIC="${NTFY_TOPIC:-}"
[ -z "$TOPIC" ] && [ -f "$DIR/.claude/ntfy-topic" ] && TOPIC="$(cat "$DIR/.claude/ntfy-topic" | tr -d '[:space:]')"
if [ -n "$TOPIC" ]; then
  curl -s -H "Title: Site Factory" -d "$MSG" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1
fi
case "$(uname)" in
  Darwin) osascript -e "display notification \"$MSG\" with title \"Site Factory\"" >/dev/null 2>&1 ;;
  Linux)  command -v notify-send >/dev/null 2>&1 && notify-send "Site Factory" "$MSG" ;;
esac
echo "[notify] $MSG"

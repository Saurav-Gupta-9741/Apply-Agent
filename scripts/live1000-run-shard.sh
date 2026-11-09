#!/bin/bash
# Runs one shard of a live real-form run until every job is done, restarting after a crash (the run resumes).
#   bash scripts/live1000-run-shard.sh <jobs.json> <results.jsonl>
cd "$(dirname "$0")/.."
JOBS=$1; OUT=$2; LOG=reports/live1000/logs/$(basename "$OUT" .jsonl).log
total=$(node -e "console.log(require('./$JOBS').length)")
for i in 1 2 3 4 5 6 7 8 9 10; do
  LIVE_ALL_SITES=1 LIVE1000=1 LIVE1000_CANDIDATE=${LIVE1000_CANDIDATE:-} LIVE1000_JOBS=$JOBS LIVE1000_OUT=$OUT npx playwright test e2e/live1000.spec.ts --reporter=line --output=test-results/$(basename "$OUT" .jsonl) >> "$LOG" 2>&1
  done_n=$(node -e "const fs=require('fs');const s=new Set();if(fs.existsSync('$OUT'))for(const l of fs.readFileSync('$OUT','utf8').split('\n').filter(Boolean))s.add(JSON.parse(l).url);console.log(s.size)")
  echo "attempt $i: $done_n / $total" >> "$LOG"
  [ "$done_n" -ge "$total" ] && break
  sleep 5
done
echo "SHARD $OUT FINISHED: $done_n / $total"

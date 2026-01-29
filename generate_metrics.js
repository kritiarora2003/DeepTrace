import fs from "fs"
import path from "path"

const LOG_FILE = "./data/request_logs.jsonl"
const OUT_FILE = "./data/metrics.json"

const lines = fs
  .readFileSync(LOG_FILE, "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse)

const metricsByMinute = {}

for (const log of lines) {
  const minute = log.timestamp.slice(0, 16) + ":00Z"

  if (!metricsByMinute[minute]) {
    metricsByMinute[minute] = {
      timestamp: minute,
      cpu_percent: 25,
      memory_percent: 40,
      request_rate: 0,
      p95_latency_ms: 200,
      error_rate: 0
    }
  }

  const m = metricsByMinute[minute]
  m.request_rate += 1
  m.p95_latency_ms = Math.max(
    m.p95_latency_ms,
    log.response_time_ms
  )

  if (log.request_size_bytes > 5_000_000) {
    m.cpu_percent = Math.min(m.cpu_percent + 6, 95)
    m.memory_percent = Math.min(m.memory_percent + 5, 90)
  }

  if (log.status_code >= 500) {
    m.error_rate = 0.45
  }
}

const metrics = Object.values(metricsByMinute)

fs.writeFileSync(OUT_FILE, JSON.stringify(metrics, null, 2))
console.log("📊 Metrics generated:", metrics.length)

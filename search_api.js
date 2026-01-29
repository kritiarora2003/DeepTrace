import express from "express"
import fs from "fs"
import path from "path"

const app = express()

// ❌ Intentionally unsafe: large JSON bodies allowed
app.use(express.json({ limit: "20mb" }))

const DATA_DIR = "./data"
const LOG_FILE = path.join(DATA_DIR, "request_logs.jsonl")

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)

app.post("/api/search", (req, res) => {
  const start = Date.now()

  // Measure payload size
  const payloadSizeBytes = Buffer.byteLength(
    JSON.stringify(req.body || {})
  )

  // Simulate CPU burn proportional to payload size
  const burnTimeMs = Math.min(payloadSizeBytes / 1000, 8000)
  while (Date.now() - start < burnTimeMs) {}

  const durationMs = Date.now() - start

  const statusCode = durationMs > 5000 ? 504 : 200

  // ---- REQUEST LOG (SOURCE OF TRUTH) ----
  const log = {
    timestamp: new Date().toISOString(),
    service: "search-api",
    endpoint: "/api/search",
    method: "POST",
    request_size_bytes: payloadSizeBytes,
    response_time_ms: durationMs,
    status_code: statusCode,
    client_ip:
      req.headers["x-forwarded-for"] || "198.51.100.23"
  }

  fs.appendFileSync(LOG_FILE, JSON.stringify(log) + "\n")

  if (statusCode === 504) {
    return res.status(504).json({ error: "timeout" })
  }

  res.json({ results: [] })
})

app.listen(4000, () => {
  console.log("🚨 Vulnerable search API running on http://localhost:4000")
})

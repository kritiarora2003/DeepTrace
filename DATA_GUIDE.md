# DeepTrace Data & Demo Guide 📊

## What is `npm run demo`?

When you run `npm run demo`, it executes the file **`agent.js`** which is an AI-powered security investigation agent.

### What the Demo Does:

```
npm run demo  →  node agent.js  →  Automated Security Investigation
```

The agent:
1. 🚨 Receives an alert about high error rates
2. 📞 Calls the MCP server to investigate
3. 🔍 Uses all 4 tools to analyze the incident
4. 📋 Generates a complete incident report

---

## Where is the Test Data?

All test data is in the **`data/`** directory:

```
data/
├── application_logs.json      ← 200 log entries (153 normal + 47 attack)
├── metrics.json               ← 35 metric data points (CPU, memory, etc.)
├── api_gateway_logs.json      ← 127 gateway request logs
└── kubernetes_events.json     ← 25 K8s events (pod restarts, OOM kills)
```

---

## Sample Data Examples

### 1. Normal Application Log
**File:** `data/application_logs.json` (entry #1)

```json
{
  "timestamp": "2026-01-29T14:00:00.000Z",
  "level": "info",
  "service": "search-api",
  "endpoint": "/api/products",
  "method": "POST",
  "request_size": 602,              ← Normal size (602 bytes)
  "response_time_ms": 164,          ← Fast response (164ms)
  "status_code": 200,               ← Success
  "source_ip": "192.168.1.45",     ← Normal user IP
  "user_agent": "Mozilla/5.0...",
  "query": "phone"
}
```

### 2. Attack Log (Large Payload)
**File:** `data/application_logs.json` (attack entries)

```json
{
  "timestamp": "2026-01-29T14:15:00.000Z",
  "level": "error",
  "service": "search-api",
  "endpoint": "/api/search",
  "method": "POST",
  "request_size": 9749827,          ← HUGE! (9.7 MB)
  "response_time_ms": 8013,         ← SLOW! (8 seconds)
  "status_code": 500,               ← Error
  "source_ip": "203.0.113.45",     ← Attacker IP
  "error": "Request timeout - payload processing exceeded limit",
  "nested_depth": 138,              ← Deeply nested JSON
  "user_agent": "python-requests/2.28.0"
}
```

**Key Differences:**
- Request size: 602 bytes → 9.7 MB (16,000x larger!)
- Response time: 164ms → 8,013ms (49x slower!)
- Status: 200 → 500 (error)
- Same attacker IP: 203.0.113.45

### 3. Metrics Data (During Attack)
**File:** `data/metrics.json` (at 14:20 UTC)

```json
{
  "timestamp": "2026-01-29T14:20:00.000Z",
  "service": "search-api",
  "metrics": {
    "cpu_percent": 48.3,            ← Rising (baseline: 25%)
    "memory_percent": 56.7,         ← Rising (baseline: 40%)
    "request_rate": 110,
    "response_time": {
      "p50": 2200,                  ← 10x slower than baseline
      "p95": 3466,
      "p99": 4400
    },
    "error_rate": 0.152,            ← 15% errors (baseline: 0.2%)
    "active_connections": 116
  }
}
```

### 4. Kubernetes Event (OOM Kill)
**File:** `data/kubernetes_events.json`

```json
{
  "timestamp": "2026-01-29T14:25:00.000Z",
  "event_type": "pod_restart",
  "namespace": "production",
  "pod_name": "search-api-7d9f8c-m4n7q",
  "reason": "OOMKilled",            ← Out of Memory!
  "message": "Container exceeded memory limit",
  "resource_usage": {
    "memory_limit": "2Gi",
    "memory_used": "2.44Gi"         ← Exceeded limit!
  },
  "restart_count": 2
}
```

---

## How to View the Data

### View All Files
```bash
ls -lh data/
```

### Count Entries
```bash
# Application logs
jq 'length' data/application_logs.json
# Output: 200

# Attack requests (>5MB)
jq '[.[] | select(.request_size > 5000000)] | length' data/application_logs.json
# Output: 47

# Attacker IP requests
jq '[.[] | select(.source_ip == "203.0.113.45")] | length' data/application_logs.json
# Output: 47
```

### View Specific Data
```bash
# First normal log
jq '.[0]' data/application_logs.json

# First attack log
jq '[.[] | select(.request_size > 5000000)][0]' data/application_logs.json

# Metrics during attack (14:20 UTC)
jq '.[] | select(.timestamp | contains("14:20"))' data/metrics.json

# All OOM kills
jq '[.[] | select(.reason == "OOMKilled")]' data/kubernetes_events.json
```

### View in VS Code
```bash
# Open in VS Code
code data/application_logs.json
code data/metrics.json
code data/api_gateway_logs.json
code data/kubernetes_events.json
```

---

## Data Statistics

### Application Logs (200 entries)
- **Normal Requests:** 153 entries
  - Status: 200 (success)
  - Size: 500-2000 bytes
  - Response time: 150-300ms
  - IPs: Various (192.168.x.x, 10.0.0.x, 172.16.0.x)

- **Attack Requests:** 47 entries
  - Status: 500, 503, 504 (errors)
  - Size: 5-10 MB
  - Response time: 6-10 seconds
  - IP: 203.0.113.45 (single attacker)
  - Time: 14:15-14:30 UTC

### Metrics (35 data points)
- **Baseline (14:00-14:15):** 15 entries
  - CPU: 20-30%
  - Memory: 35-45%
  - Response time: 180-250ms
  - Error rate: 0.1-0.3%

- **Attack (14:15-14:30):** 15 entries
  - CPU: 25% → 95% (progressive increase)
  - Memory: 40% → 90% (progressive increase)
  - Response time: 200ms → 6,200ms (30x increase)
  - Error rate: 0.2% → 45% (225x increase)

- **Recovery (14:30-14:35):** 5 entries
  - Metrics gradually returning to normal

### API Gateway Logs (127 entries)
- Normal requests: 80 entries
- Attack requests: 47 entries (same as application logs)
- Includes request IDs, headers, geo-location

### Kubernetes Events (25 events)
- Pod restarts: 15 events
- OOM kills: 15 events (same pods restarted due to memory)
- Health check failures: 8 events
- Scaling events: 2 events

---

## What the Demo Agent Does

**File:** `agent.js` (310 lines)

### Step-by-Step Process:

```
1. ALERT RECEIVED
   ↓
2. STEP 1: fetch_incident_timeline
   → Queries all 4 data sources
   → Builds timeline of 287 events
   → Identifies 2 attack patterns
   ↓
3. STEP 2: analyze_logs
   → Analyzes 200 log entries
   → Detects 47 large payloads
   → AI identifies: "JSON Payload Bomb"
   → Confidence: 95%
   ↓
4. STEP 3: identify_root_cause
   → Correlates all data
   → AI analysis: "Missing input validation"
   → Evidence: Large payloads + CPU spikes + OOM kills
   → Confidence: 92%
   ↓
5. STEP 4: suggest_remediation
   → Immediate: Block attacker IP
   → Short-term: Add input validation
   → Long-term: Deploy WAF
   ↓
6. INCIDENT REPORT GENERATED
   → Complete summary
   → Root cause
   → Impact assessment
   → Action plan
```

---

## How Data Flows

```
┌─────────────────────────────────────────────────────────────┐
│                     agent.js (Demo)                         │
│                                                             │
│  1. Receives alert                                          │
│  2. Calls MCP server tools                                  │
│  3. Displays results                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  mcp_server.js (Server)                     │
│                                                             │
│  Receives HTTP requests                                     │
│  Routes to appropriate tool                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    tools.js (4 Tools)                       │
│                                                             │
│  1. fetch_incident_timeline                                 │
│  2. analyze_logs                                            │
│  3. identify_root_cause                                     │
│  4. suggest_remediation                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              services/data_sources.js                       │
│                                                             │
│  Reads and queries JSON files                               │
│  Provides data to tools                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    data/*.json                              │
│                                                             │
│  • application_logs.json (200 entries)                      │
│  • metrics.json (35 entries)                                │
│  • api_gateway_logs.json (127 entries)                      │
│  • kubernetes_events.json (25 entries)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Commands Reference

```bash
# View data files
ls -lh data/

# Count attack requests
jq '[.[] | select(.request_size > 5000000)] | length' data/application_logs.json

# View attacker IP requests
jq '[.[] | select(.source_ip == "203.0.113.45")]' data/application_logs.json

# View metrics during attack
jq '[.[] | select(.timestamp | contains("14:2"))]' data/metrics.json

# View OOM kills
jq '[.[] | select(.reason == "OOMKilled")]' data/kubernetes_events.json

# Run the demo
npm run demo

# Test all tools
npm test
```

---

## Summary

**`npm run demo`** runs **`agent.js`** which:
- Acts as an AI security investigator
- Calls the MCP server (must be running)
- Uses all 4 tools to investigate
- Analyzes data from `data/*.json` files
- Generates a complete incident report

**The data** in `data/*.json` simulates:
- A real JSON payload bomb attack
- 47 malicious requests from IP 203.0.113.45
- Service degradation (CPU/memory spikes)
- Pod crashes and restarts
- Complete attack timeline from 14:15-14:30 UTC

---

**Ready to explore?** Try these commands:
```bash
# View the data
jq '.[0]' data/application_logs.json

# Run the demo
npm start  # Terminal 1
npm run demo  # Terminal 2
# DeepTrace Testing Guide 🧪

Complete guide to testing the DeepTrace MCP server.

## Prerequisites Check

Before testing, verify you have:
- ✅ Node.js v18+ installed
- ✅ npm installed
- ✅ All dependencies installed (`npm install`)
- ✅ Attack data generated

## Quick Verification

```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Check if dependencies are installed
ls node_modules | wc -l  # Should show ~70+ packages

# Check if data files exist
ls -lh data/*.json
```

## Testing Methods

### Method 1: Automated Test Suite (Recommended)

This runs all 4 tools and verifies they work correctly.

```bash
npm test
```

**Expected Output:**
```
🧪 Testing DeepTrace MCP Tools
================================================================================

📍 Test 1: fetch_incident_timeline
✅ PASSED
   • Timeline events: 287
   • Attack patterns: 2
   • Critical events: 17

📍 Test 2: analyze_logs
✅ PASSED
   • Logs analyzed: 200
   • Error patterns: 2
   • Anomalies detected: 20
   • AI confidence: 80.0%

📍 Test 3: identify_root_cause
✅ PASSED
   • Root cause: Missing input validation...
   • Attack type: JSON Payload Bomb
   • Confidence: 85.0%
   • Evidence items: 3

📍 Test 4: suggest_remediation
✅ PASSED
   • Immediate actions: 2
   • Short-term fixes: 2
   • Long-term improvements: 3

================================================================================
📊 TEST SUMMARY
================================================================================
✅ Passed: 4/4
❌ Failed: 0/4

🎉 All tests passed! DeepTrace MCP server is ready.
```

**What This Tests:**
- ✅ All 4 MCP tools execute without errors
- ✅ Data sources are accessible
- ✅ AI integration works (with fallback)
- ✅ Response formats are correct

---

### Method 2: Full Demo Investigation

This runs the complete automated investigation workflow.

**Step 1: Start the MCP Server**
```bash
# Terminal 1
npm start
```

**Expected Output:**
```
MCP Server running on http://localhost:3000
```

**Step 2: Run the Investigation Agent**
```bash
# Terminal 2 (keep server running)
npm run demo
```

**Expected Output:**
```
================================================================================
🚨 DEEPTRACE SECURITY INCIDENT INVESTIGATION
================================================================================

📢 ALERT: High error rate detected on search-api service
⏰ Alert Time: 2026-01-29T14:28:00Z
🎯 Affected Service: search-api
📊 Error Rate: 45% (baseline: 0.2%)

--------------------------------------------------------------------------------
================================================================================
📍 STEP 1: Fetch incident timeline to understand event sequence
================================================================================

🛠️  Calling tool: fetch_incident_timeline
📋 Arguments: {
  "start_time": "2026-01-29T14:00:00.000Z",
  "end_time": "2026-01-29T14:35:00.000Z",
  "sources": ["all"]
}

✅ Tool execution completed

📊 Timeline Summary:
   • Total Events: 287
   • Critical Events: 17
   • High Severity: 89
   • Attack Patterns Found: 2

🎯 Attack Patterns Detected:
   • large_payload_burst: Multiple large requests from single source
     Severity: critical
   • resource_exhaustion: Service experiencing resource exhaustion with pod restarts
     Severity: critical

[... continues with steps 2-4 ...]

================================================================================
📋 FINAL INCIDENT REPORT
================================================================================

INCIDENT ID: INC-20260129-001
SEVERITY: Critical
STATUS: Mitigated

[... complete incident report ...]

================================================================================
✅ Investigation Complete
================================================================================
```

**What This Tests:**
- ✅ End-to-end investigation workflow
- ✅ All 4 tools working together
- ✅ AI analysis (if Ollama is running)
- ✅ Incident report generation

---

### Method 3: Manual API Testing with curl

Test individual tools using curl commands.

**Step 1: Start the Server**
```bash
npm start
```

**Step 2: Test Each Tool**

#### Test 1: List Available Tools
```bash
curl http://localhost:3000/tools | jq .
```

**Expected:** List of 6 tools (4 core + 2 test tools)

#### Test 2: Fetch Incident Timeline
```bash
curl -X POST http://localhost:3000/tools/fetch_incident_timeline \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2026-01-29T14:00:00Z",
    "end_time": "2026-01-29T14:35:00Z",
    "sources": ["all"]
  }' | jq .
```

**Expected:** JSON with timeline, summary, attack_patterns

#### Test 3: Analyze Logs
```bash
curl -X POST http://localhost:3000/tools/analyze_logs \
  -H "Content-Type: application/json" \
  -d '{
    "time_range": {
      "start": "2026-01-29T14:00:00Z",
      "end": "2026-01-29T14:35:00Z"
    },
    "log_level": "all"
  }' | jq .
```

**Expected:** JSON with patterns, anomalies, ai_analysis

#### Test 4: Identify Root Cause
```bash
curl -X POST http://localhost:3000/tools/identify_root_cause \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "TEST-001",
    "include_metrics": true,
    "include_logs": true
  }' | jq .
```

**Expected:** JSON with root_cause, confidence_score, evidence

#### Test 5: Suggest Remediation
```bash
curl -X POST http://localhost:3000/tools/suggest_remediation \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Missing input validation",
    "attack_type": "JSON Payload Bomb",
    "severity": "critical"
  }' | jq .
```

**Expected:** JSON with immediate_actions, short_term_fixes, long_term_improvements

---

### Method 4: Interactive Testing with Node REPL

Test tools programmatically.

```bash
node
```

```javascript
// Load the tools
const { tools } = require('./tools');

// Test fetch_incident_timeline
const timeline = await tools.fetch_incident_timeline.execute({
  start_time: "2026-01-29T14:00:00Z",
  end_time: "2026-01-29T14:35:00Z",
  sources: ["all"]
});

console.log('Total events:', timeline.summary.total_events);
console.log('Attack patterns:', timeline.attack_patterns.length);

// Test analyze_logs
const analysis = await tools.analyze_logs.execute({
  time_range: {
    start: "2026-01-29T14:00:00Z",
    end: "2026-01-29T14:35:00Z"
  }
});

console.log('Logs analyzed:', analysis.statistics.total_logs);
console.log('Attack type:', analysis.ai_analysis.attack_type);
```

---

## Verification Checklist

Use this checklist to verify everything works:

### Basic Setup
- [ ] Node.js v18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Data files exist in `data/` directory
- [ ] All 4 JSON files present (application_logs, metrics, api_gateway_logs, kubernetes_events)

### Test Suite
- [ ] `npm test` runs without errors
- [ ] All 4 tests pass
- [ ] No error messages in output

### MCP Server
- [ ] Server starts on port 3000
- [ ] No error messages on startup
- [ ] GET /tools returns list of tools
- [ ] All 4 core tools listed

### Individual Tools
- [ ] fetch_incident_timeline returns 287 events
- [ ] analyze_logs returns 200 logs analyzed
- [ ] identify_root_cause returns root cause with confidence
- [ ] suggest_remediation returns action plans

### Demo Agent
- [ ] Agent runs all 4 steps
- [ ] Each step completes successfully
- [ ] Final incident report generated
- [ ] No errors in output

### Data Integrity
- [ ] application_logs.json has 200 entries
- [ ] metrics.json has 35 entries
- [ ] api_gateway_logs.json has 127 entries
- [ ] kubernetes_events.json has 25 entries

---

## Troubleshooting

### Issue: "Cannot find module 'express'"

**Solution:**
```bash
npm install
```

### Issue: "ENOENT: no such file or directory, open 'data/application_logs.json'"

**Solution:**
```bash
npm run generate-data
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or change port in mcp_server.js
```

### Issue: "Ollama connection error"

**Note:** This is not critical! The system has fallback responses.

**Optional Fix (for full AI features):**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull model
ollama pull llama3.2:3b
```

### Issue: Tests fail with "timeout"

**Solution:**
```bash
# Increase timeout or check if data files are corrupted
npm run generate-data
npm test
```

---

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time | Acceptable Range |
|-----------|--------------|------------------|
| Timeline Generation | ~100ms | 50-200ms |
| Log Analysis (no AI) | ~500ms | 200-1000ms |
| Log Analysis (with AI) | ~2-3s | 1-5s |
| Root Cause (with AI) | ~3-5s | 2-8s |
| Remediation (with AI) | ~2-4s | 1-6s |
| Full Investigation | ~10-15s | 5-20s |

---

## Test Data Validation

Verify the attack simulation data is correct:

```bash
# Check log counts
jq 'length' data/application_logs.json
# Expected: 200

# Check attack requests
jq '[.[] | select(.request_size > 5000000)] | length' data/application_logs.json
# Expected: 47

# Check attacker IP
jq '[.[] | select(.source_ip == "203.0.113.45")] | length' data/application_logs.json
# Expected: 47

# Check metrics data points
jq 'length' data/metrics.json
# Expected: 35

# Check K8s events
jq 'length' data/kubernetes_events.json
# Expected: 25
```

---

## CI/CD Testing

For automated testing in CI/CD:

```bash
#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Generating test data..."
npm run generate-data

echo "Running tests..."
npm test

echo "Starting server..."
npm start &
SERVER_PID=$!
sleep 2

echo "Testing API endpoints..."
curl -f http://localhost:3000/tools || exit 1

echo "Stopping server..."
kill $SERVER_PID

echo "All tests passed!"
```

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Review the demo output
2. ✅ Check the incident report
3. ✅ Explore the API documentation (API.md)
4. ✅ Try custom time ranges
5. ✅ Experiment with different queries

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review README.md for setup instructions
3. Check DEMO.md for usage examples
4. Verify all data files exist and are valid JSON

---

**Happy Testing! 🚀**
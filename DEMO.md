# DeepTrace Demo Guide 🎬

This guide walks you through a complete demonstration of DeepTrace investigating a real security incident.

## 🎯 Demo Scenario

**Incident:** JSON Payload Bomb Attack on Production Search API  
**Date:** January 29, 2026  
**Time:** 14:15 - 14:30 UTC  
**Attacker IP:** 203.0.113.45  
**Impact:** 45% error rate, 15 pod restarts, $8,000 in lost sales

## 🚀 Quick Demo (5 minutes)

### Step 1: Start the MCP Server

```bash
# Terminal 1
npm start
```

Expected output:
```
MCP Server running on http://localhost:3000
```

### Step 2: Run the Investigation Agent

```bash
# Terminal 2
npm run demo
```

The agent will automatically:
1. ✅ Fetch incident timeline (287 events)
2. ✅ Analyze logs (200 entries, 47 attack requests)
3. ✅ Identify root cause (missing input validation)
4. ✅ Generate remediation plan (immediate + long-term)

### Step 3: Review the Results

The agent displays:
- **Timeline Summary:** Critical events and attack patterns
- **Log Analysis:** Attack type, characteristics, confidence score
- **Root Cause:** Vulnerability details with evidence
- **Remediation Plan:** Prioritized actions with commands

## 📊 Detailed Walkthrough

### Investigation Flow

```
🚨 ALERT RECEIVED
    ↓
📍 STEP 1: Fetch Timeline
    → 287 events from 4 data sources
    → 2 attack patterns detected
    → 17 critical events identified
    ↓
📍 STEP 2: Analyze Logs
    → 200 logs analyzed
    → 47 large payload requests (5-10MB)
    → Attack type: JSON Payload Bomb
    → Confidence: 95%
    ↓
📍 STEP 3: Root Cause Analysis
    → Root cause: Missing input validation
    → Contributing factors: No rate limiting, insufficient resource limits
    → Evidence: 47 large requests, CPU/memory spikes, 15 pod restarts
    → Confidence: 92%
    ↓
📍 STEP 4: Remediation Plan
    → Immediate: Block attacker IP (2 min)
    → Short-term: Add input validation (2 hours)
    → Long-term: Deploy WAF (1 week)
    ↓
📋 INCIDENT REPORT GENERATED
```

## 🔍 Manual Tool Testing

### Test Individual Tools with curl

#### 1. Fetch Incident Timeline

```bash
curl -X POST http://localhost:3000/tools/fetch_incident_timeline \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2026-01-29T14:00:00Z",
    "end_time": "2026-01-29T14:35:00Z",
    "sources": ["all"]
  }' | jq .
```

**Key Findings:**
- 287 total events
- 17 critical severity events
- 2 attack patterns identified:
  - Large payload burst (47 requests from single IP)
  - Resource exhaustion (15 OOM kills)

#### 2. Analyze Logs

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

**Key Findings:**
- 200 logs analyzed
- 47 error logs
- 47 large payloads detected (>5MB)
- Attack signature: JSON Payload Bomb
- Attacker IP: 203.0.113.45

#### 3. Identify Root Cause

```bash
curl -X POST http://localhost:3000/tools/identify_root_cause \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "INC-20260129-001",
    "include_metrics": true,
    "include_logs": true
  }' | jq .
```

**Key Findings:**
- Root cause: Missing input validation on /api/search
- Contributing factors:
  - No rate limiting
  - Insufficient resource limits
  - Lack of payload size validation
- Impact: 15 pod restarts, 15 OOM kills
- Confidence: 92%

#### 4. Suggest Remediation

```bash
curl -X POST http://localhost:3000/tools/suggest_remediation \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Missing input validation on /api/search endpoint",
    "attack_type": "JSON Payload Bomb",
    "severity": "critical",
    "include_commands": true
  }' | jq .
```

**Key Findings:**
- Immediate actions (2 items):
  1. Block attacker IP (2 minutes)
  2. Scale up pods (5 minutes)
- Short-term fixes (2 items):
  1. Add request size validation (2 hours)
  2. Implement rate limiting (2 hours)
- Long-term improvements (3 items):
  1. Deploy WAF (1 week)
  2. Enhanced monitoring (1 week)
  3. Security training (ongoing)

## 📈 Expected Results

### Timeline Analysis
```json
{
  "summary": {
    "total_events": 287,
    "by_severity": {
      "critical": 17,
      "high": 89,
      "warning": 135,
      "info": 46
    }
  },
  "attack_patterns": [
    {
      "pattern_type": "large_payload_burst",
      "description": "Multiple large requests from single source",
      "severity": "critical"
    }
  ]
}
```

### Log Analysis
```json
{
  "ai_analysis": {
    "attack_type": "JSON Payload Bomb",
    "characteristics": "Single IP sending 5-10MB payloads with deeply nested objects",
    "impact": "CPU/memory exhaustion causing cascading failures",
    "confidence": 0.95
  },
  "statistics": {
    "total_logs": 200,
    "error_count": 47,
    "large_payload_count": 47,
    "unique_ips": 10
  }
}
```

### Root Cause
```json
{
  "root_cause": "Missing input validation on /api/search endpoint",
  "contributing_factors": [
    "No rate limiting",
    "Insufficient resource limits",
    "Lack of payload size validation"
  ],
  "confidence_score": 0.92,
  "impact_assessment": {
    "pod_restarts": 15,
    "oom_kills": 15,
    "error_rate_increase": "225x",
    "response_time_increase": "40x"
  }
}
```

### Remediation Plan
```json
{
  "immediate_actions": [
    {
      "priority": 1,
      "action": "Block attacker IP address",
      "estimated_time": "2 minutes",
      "commands": [
        "sudo iptables -A INPUT -s 203.0.113.45 -j DROP"
      ]
    }
  ],
  "short_term_fixes": [
    {
      "priority": 2,
      "action": "Implement request size validation",
      "estimated_time": "2 hours",
      "implementation_code": "app.use(express.json({ limit: '1mb' }));"
    }
  ]
}
```

## 🎥 Demo Script for Presentation

### Introduction (1 minute)
"DeepTrace is an AI-powered MCP server that helps security teams investigate production incidents. Let me show you how it analyzes a real JSON payload bomb attack."

### Demo (3 minutes)

1. **Show the Alert** (30 seconds)
   ```
   🚨 ALERT: High error rate on search-api
   Error Rate: 45% (baseline: 0.2%)
   Time: 14:28 UTC
   ```

2. **Run Investigation** (2 minutes)
   ```bash
   npm run demo
   ```
   
   Highlight:
   - Timeline shows 287 events, 2 attack patterns
   - Logs reveal 47 large payloads from single IP
   - AI identifies JSON Payload Bomb with 95% confidence
   - Root cause: Missing input validation
   - Remediation plan generated with specific commands

3. **Show Results** (30 seconds)
   - Point out the incident report
   - Highlight immediate actions
   - Show the estimated recovery time

### Conclusion (1 minute)
"DeepTrace correlates data from multiple sources, uses AI for intelligent analysis, and generates actionable remediation plans—all in under a minute."

## 🧪 Verification Checklist

Before your demo, verify:

- [ ] MCP server starts without errors
- [ ] All 4 tools return valid responses
- [ ] Data files exist in `data/` directory
- [ ] Ollama is running (optional, has fallback)
- [ ] Test script passes: `npm test`

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process or change port in mcp_server.js
```

### Data files missing
```bash
# Regenerate data
npm run generate-data
```

### Ollama connection error
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Start Ollama if needed
ollama serve

# Pull model if missing
ollama pull llama3.2:3b
```

### Tests failing
```bash
# Run tests with verbose output
node test_tools.js

# Check data files
ls -la data/*.json
```

## 📊 Performance Metrics

- **Timeline Generation:** ~100ms
- **Log Analysis:** ~500ms (without AI), ~2-3s (with AI)
- **Root Cause Analysis:** ~3-5s (with AI)
- **Remediation Plan:** ~2-4s (with AI)
- **Total Investigation Time:** ~10-15s

## 🎓 Key Takeaways

1. **Multi-Source Correlation:** DeepTrace aggregates data from logs, metrics, K8s events, and API gateway
2. **AI-Powered Analysis:** Uses Ollama LLM for intelligent pattern detection and root cause analysis
3. **Actionable Insights:** Generates specific commands and code for remediation
4. **Confidence Scoring:** All insights include confidence levels for transparency
5. **MCP Compliance:** Fully implements the Model Context Protocol specification

## 📝 Demo Notes

- The attack simulation is realistic with 200+ log entries
- All timestamps are consistent across data sources
- The AI analysis adapts to the actual data patterns
- Remediation plans include immediate, short-term, and long-term actions
- The system handles errors gracefully with fallback responses

---

**Ready to investigate?** Run `npm run demo` and watch DeepTrace in action! 🚀
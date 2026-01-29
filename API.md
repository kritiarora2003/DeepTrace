# DeepTrace API Documentation 📚

Complete API reference for the DeepTrace MCP Server.

## Base URL

```
http://localhost:3000
```

## Endpoints

### List Available Tools

Get a list of all available MCP tools.

**Endpoint:** `GET /tools`

**Response:**
```json
[
  {
    "name": "fetch_incident_timeline",
    "description": "Build a chronological timeline of events...",
    "input_schema": {
      "start_time": { "type": "string" },
      "end_time": { "type": "string" },
      "sources": { "type": "array" }
    }
  }
]
```

---

## Tool: fetch_incident_timeline

Build a chronological timeline of events from all observability sources.

**Endpoint:** `POST /tools/fetch_incident_timeline`

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "start_time": "2026-01-29T14:00:00Z",
  "end_time": "2026-01-29T14:35:00Z",
  "sources": ["all"]
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_time | string | Yes | Start time in ISO 8601 format |
| end_time | string | Yes | End time in ISO 8601 format |
| sources | array | No | Data sources to include: ["logs", "metrics", "gateway", "kubernetes", "all"]. Default: ["all"] |

### Response

**Success (200 OK):**
```json
{
  "timeline": [
    {
      "timestamp": "2026-01-29T14:15:00Z",
      "source": "api_gateway",
      "event_type": "large_request_detected",
      "severity": "warning",
      "details": {
        "request_id": "req-a7f3d9c2",
        "endpoint": "/api/search",
        "request_size": "8.5MB",
        "source_ip": "203.0.113.45"
      }
    }
  ],
  "summary": {
    "total_events": 287,
    "by_source": {
      "application_logs": 200,
      "metrics": 35,
      "api_gateway": 127,
      "kubernetes": 25
    },
    "by_severity": {
      "critical": 17,
      "high": 89,
      "warning": 135,
      "info": 46
    },
    "by_event_type": {
      "error_logged": 47,
      "large_request_detected": 47,
      "performance_degradation": 15,
      "pod_restart": 15
    },
    "time_range": {
      "start": "2026-01-29T14:00:00Z",
      "end": "2026-01-29T14:35:00Z"
    }
  },
  "attack_patterns": [
    {
      "pattern_type": "large_payload_burst",
      "description": "Multiple large requests from single source",
      "severity": "critical",
      "evidence": {
        "request_count": 47,
        "suspicious_ips": [
          { "ip": "203.0.113.45", "count": 47 }
        ]
      }
    }
  ],
  "correlation_windows": [
    {
      "start": "2026-01-29T14:15:00Z",
      "end": "2026-01-29T14:20:00Z",
      "event_count": 89,
      "severity_distribution": {
        "critical": 5,
        "high": 34,
        "warning": 45,
        "info": 5
      }
    }
  ],
  "metadata": {
    "time_range": "2026-01-29T14:00:00Z to 2026-01-29T14:35:00Z",
    "sources_queried": ["all"],
    "total_events": 287
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Invalid time range: start_time must be before end_time"
}
```

### Example

```bash
curl -X POST http://localhost:3000/tools/fetch_incident_timeline \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2026-01-29T14:00:00Z",
    "end_time": "2026-01-29T14:35:00Z",
    "sources": ["logs", "metrics"]
  }'
```

---

## Tool: analyze_logs

AI-powered log analysis to identify attack patterns and anomalies.

**Endpoint:** `POST /tools/analyze_logs`

### Request

**Body:**
```json
{
  "time_range": {
    "start": "2026-01-29T14:00:00Z",
    "end": "2026-01-29T14:35:00Z"
  },
  "log_level": "all",
  "limit": 500
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| time_range | object | Yes | Time range with start and end |
| time_range.start | string | Yes | Start time in ISO 8601 format |
| time_range.end | string | Yes | End time in ISO 8601 format |
| log_level | string | No | Filter by level: "error", "warn", "info", "all". Default: "all" |
| limit | number | No | Max logs to analyze. Default: 500 |

### Response

**Success (200 OK):**
```json
{
  "patterns": [
    {
      "pattern": "Request timeout - payload processing exceeded limit",
      "frequency": 47,
      "severity": "critical",
      "sample_ips": ["203.0.113.45"],
      "endpoints": ["/api/search"]
    }
  ],
  "anomalies": [
    {
      "timestamp": "2026-01-29T14:17:45Z",
      "source_ip": "203.0.113.45",
      "endpoint": "/api/search",
      "request_size": 8388608,
      "response_time_ms": 8234,
      "status_code": 500,
      "anomaly_type": "large_payload"
    }
  ],
  "statistics": {
    "total_logs": 200,
    "error_count": 47,
    "unique_ips": 10,
    "unique_endpoints": 4,
    "avg_response_time": 1245,
    "large_payload_count": 47
  },
  "ai_analysis": {
    "attack_type": "JSON Payload Bomb",
    "characteristics": "Single IP (203.0.113.45) sent 47 requests with 5-10MB payloads containing deeply nested objects (150+ levels)",
    "impact": "CPU/memory exhaustion causing cascading failures",
    "confidence": 0.95
  },
  "top_error_ips": {
    "203.0.113.45": 47,
    "192.168.1.45": 2
  },
  "metadata": {
    "time_range": {
      "start": "2026-01-29T14:00:00Z",
      "end": "2026-01-29T14:35:00Z"
    },
    "analyzed_logs": 200
  }
}
```

### Example

```bash
curl -X POST http://localhost:3000/tools/analyze_logs \
  -H "Content-Type: application/json" \
  -d '{
    "time_range": {
      "start": "2026-01-29T14:15:00Z",
      "end": "2026-01-29T14:30:00Z"
    },
    "log_level": "error"
  }'
```

---

## Tool: identify_root_cause

Comprehensive root cause analysis using correlated data from all sources.

**Endpoint:** `POST /tools/identify_root_cause`

### Request

**Body:**
```json
{
  "incident_id": "INC-20260129-001",
  "include_metrics": true,
  "include_logs": true,
  "time_range": {
    "start": "2026-01-29T14:15:00Z",
    "end": "2026-01-29T14:30:00Z"
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| incident_id | string | No | Optional incident identifier |
| include_metrics | boolean | No | Include metrics analysis. Default: true |
| include_logs | boolean | No | Include log analysis. Default: true |
| time_range | object | No | Time range (defaults to attack window) |

### Response

**Success (200 OK):**
```json
{
  "incident_id": "INC-20260129-001",
  "root_cause": "Missing input validation on /api/search endpoint",
  "contributing_factors": [
    "No rate limiting",
    "Insufficient resource limits",
    "Lack of payload size validation"
  ],
  "confidence_score": 0.92,
  "attack_type": "JSON Payload Bomb",
  "evidence": [
    {
      "type": "log_analysis",
      "description": "47 large payload requests detected (>5MB)",
      "severity": "critical",
      "details": [...]
    },
    {
      "type": "metrics",
      "description": "15 metric anomalies detected",
      "severity": "critical",
      "details": [...]
    },
    {
      "type": "attack_patterns",
      "description": "Attack patterns identified in timeline",
      "severity": "critical",
      "details": [...]
    }
  ],
  "impact_assessment": {
    "affected_service": "search-api",
    "pod_restarts": 15,
    "oom_kills": 15,
    "error_rate_increase": "225x",
    "response_time_increase": "40x",
    "baseline_comparison": {
      "cpu_percent": 25.3,
      "memory_percent": 40.2,
      "response_time_p95": 280
    }
  },
  "timeline_summary": {
    "total_events": 287,
    "by_severity": {
      "critical": 17,
      "high": 89
    }
  },
  "metadata": {
    "analysis_time": "2026-01-29T14:35:00Z",
    "time_range": {
      "start": "2026-01-29T14:15:00Z",
      "end": "2026-01-29T14:30:00Z"
    },
    "data_sources_analyzed": ["logs", "metrics", "gateway", "kubernetes"]
  }
}
```

### Example

```bash
curl -X POST http://localhost:3000/tools/identify_root_cause \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "INC-20260129-001",
    "include_metrics": true,
    "include_logs": true
  }'
```

---

## Tool: suggest_remediation

Generate prioritized, actionable remediation plan.

**Endpoint:** `POST /tools/suggest_remediation`

### Request

**Body:**
```json
{
  "root_cause": "Missing input validation on /api/search endpoint",
  "attack_type": "JSON Payload Bomb",
  "severity": "critical",
  "include_commands": true
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| root_cause | string | Yes | The identified root cause |
| attack_type | string | No | Type of attack detected |
| severity | string | No | Incident severity: "critical", "high", "medium", "low". Default: "critical" |
| include_commands | boolean | No | Include executable commands. Default: true |

### Response

**Success (200 OK):**
```json
{
  "summary": "A JSON payload bomb attack exploited missing input validation on the /api/search endpoint, causing service degradation with 45% error rate and multiple pod restarts. Immediate action required to block the attacker and implement input validation.",
  "immediate_actions": [
    {
      "priority": 1,
      "action": "Block attacker IP address",
      "implementation": "Add firewall rule or update WAF",
      "estimated_time": "2 minutes",
      "commands": [
        "# Block attacker IP at firewall level",
        "sudo iptables -A INPUT -s 203.0.113.45 -j DROP",
        "# Or update nginx config",
        "echo 'deny 203.0.113.45;' >> /etc/nginx/blocked-ips.conf",
        "sudo nginx -s reload"
      ]
    }
  ],
  "short_term_fixes": [
    {
      "priority": 2,
      "action": "Implement request size validation",
      "implementation": "Add middleware to limit payload size to 1MB",
      "estimated_time": "2 hours",
      "implementation_code": "// Add Express middleware for payload size validation\napp.use(express.json({ limit: '1mb' }));\n\n// Add custom validation middleware\napp.use('/api/search', (req, res, next) => {\n  const contentLength = parseInt(req.headers['content-length'] || '0');\n  if (contentLength > 1048576) { // 1MB\n    return res.status(413).json({ error: 'Payload too large' });\n  }\n  next();\n});"
    }
  ],
  "long_term_improvements": [
    {
      "priority": 3,
      "action": "Deploy Web Application Firewall",
      "implementation": "Implement ModSecurity with OWASP rules",
      "estimated_time": "1 week"
    }
  ],
  "monitoring_recommendations": [
    {
      "metric": "Request payload size",
      "threshold": "> 1MB",
      "action": "Alert and log for investigation"
    },
    {
      "metric": "Request rate per IP",
      "threshold": "> 10 requests/minute",
      "action": "Trigger rate limiting"
    }
  ],
  "estimated_total_time": {
    "immediate": "5-10 minutes",
    "short_term": "4-8 hours",
    "long_term": "1-2 weeks"
  },
  "priority_order": [
    "1. Execute immediate actions to stop ongoing attack",
    "2. Implement short-term fixes to prevent recurrence",
    "3. Plan and execute long-term security improvements",
    "4. Set up enhanced monitoring and alerting"
  ],
  "metadata": {
    "generated_at": "2026-01-29T14:35:00Z",
    "severity": "critical",
    "root_cause": "Missing input validation on /api/search endpoint",
    "attack_type": "JSON Payload Bomb"
  }
}
```

### Example

```bash
curl -X POST http://localhost:3000/tools/suggest_remediation \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Missing input validation",
    "attack_type": "JSON Payload Bomb",
    "severity": "critical"
  }'
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
Invalid input parameters or validation error.

```json
{
  "error": "Validation error: start_time is required"
}
```

### 404 Not Found
Tool not found.

```json
{
  "error": "Tool not found"
}
```

### 500 Internal Server Error
Server error during tool execution.

```json
{
  "error": "Failed to analyze logs: Connection timeout"
}
```

---

## Rate Limiting

Currently, there are no rate limits on the API. In production, consider implementing:
- 100 requests per minute per IP
- 1000 requests per hour per IP

---

## Authentication

The current implementation does not require authentication. For production use, implement:
- API key authentication
- JWT tokens
- OAuth 2.0

---

## Best Practices

1. **Time Ranges:** Keep time ranges reasonable (< 24 hours) for optimal performance
2. **Limits:** Use the `limit` parameter to control response size
3. **Error Handling:** Always check for error responses and handle gracefully
4. **Caching:** Consider caching responses for repeated queries
5. **Monitoring:** Monitor API response times and error rates

---

## SDK Examples

### Node.js

```javascript
const fetch = require('node-fetch');

async function investigateIncident() {
  // Fetch timeline
  const timeline = await fetch('http://localhost:3000/tools/fetch_incident_timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_time: '2026-01-29T14:00:00Z',
      end_time: '2026-01-29T14:35:00Z'
    })
  }).then(r => r.json());

  console.log('Timeline events:', timeline.summary.total_events);
}
```

### Python

```python
import requests

def investigate_incident():
    # Fetch timeline
    response = requests.post(
        'http://localhost:3000/tools/fetch_incident_timeline',
        json={
            'start_time': '2026-01-29T14:00:00Z',
            'end_time': '2026-01-29T14:35:00Z'
        }
    )
    
    timeline = response.json()
    print(f"Timeline events: {timeline['summary']['total_events']}")
```

---

## Support

For issues or questions:
- GitHub Issues: [repository-url]/issues
- Documentation: README.md
- Demo Guide: DEMO.md

---

**DeepTrace API v1.0.0** - AI-Powered Security Incident Investigation
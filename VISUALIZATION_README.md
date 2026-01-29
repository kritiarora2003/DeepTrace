# 📊 Attack Visualization

## Quick Start

Generate all attack visualization charts:

```bash
npm run visualize
```

View the interactive dashboard:

```bash
open dashboard.html
```

## Generated Charts

All charts are saved to the `charts/` directory:

| Chart | Description | Key Insight |
|-------|-------------|-------------|
| **1_resource_usage.png** | CPU & Memory over time | 95% CPU, 90% memory during attack |
| **2_response_time.png** | Response time degradation | 40x increase (200ms → 8s) |
| **3_error_rate.png** | Error rate spike | 225x increase (0.2% → 45%) |
| **4_request_size_distribution.png** | Request size categories | 47 attack payloads >5MB |
| **5_attack_timeline.png** | Events per minute | Correlation of payloads, errors, restarts |
| **6_top_ips.png** | Top source IPs | Single attacker: 203.0.113.45 |

## Dashboard Features

The HTML dashboard (`dashboard.html`) includes:

- **📈 Real-time Stats**: Response time, CPU, memory, error rate
- **📊 Interactive Charts**: All 6 visualizations with descriptions
- **⏰ Attack Timeline**: Chronological incident progression
- **🎨 Professional Design**: Color-coded severity levels

## Example Output

### Resource Usage Chart
Shows CPU and memory exhaustion during the attack window (14:15-14:30 UTC):
- CPU: 25% → 95% (critical)
- Memory: 40% → 90% (critical)
- Clear attack window highlighted

### Response Time Chart
Demonstrates 40x performance degradation:
- p50: 200ms → 8,000ms
- p95: 266ms → 10,000ms
- p99: 375ms → 12,000ms

### Error Rate Chart
Visualizes 225x error increase:
- Baseline: 0.2%
- Peak: 45%
- Color-coded by severity

## Customization

Edit `visualize_attack.js` to customize:

```javascript
// Chart dimensions
const width = 1200;
const height = 600;

// Colors
backgroundColor: 'rgba(255, 99, 132, 0.8)',  // Red for critical
borderColor: 'rgb(255, 99, 132)',

// Time range
const startTime = "2026-01-29T14:00:00Z";
const endTime = "2026-01-29T14:35:00Z";
```

## Use Cases

1. **Incident Investigation**: Visual timeline of attack progression
2. **Root Cause Analysis**: Correlate metrics to identify vulnerabilities
3. **Stakeholder Reporting**: Professional charts for management
4. **Training**: Demonstrate attack patterns and impact
5. **Documentation**: Visual evidence for post-mortems

## Technical Details

- **Library**: Chart.js v4 with chartjs-node-canvas
- **Format**: High-quality PNG images (1200x600px)
- **Data Sources**: Application logs, metrics, K8s events, API gateway logs
- **Generation Time**: ~5 seconds for all 6 charts

## Full Documentation

See [VISUALIZATION_GUIDE.md](VISUALIZATION_GUIDE.md) for:
- Detailed chart explanations
- Analysis tips and techniques
- Customization guide
- Troubleshooting
- Learning exercises

---

**💡 Tip**: Run `npm run visualize` after generating new attack data to update all charts.
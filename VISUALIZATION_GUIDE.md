# 📊 Attack Visualization Guide

This guide explains how to use the visualization features in DeepTrace to analyze the JSON Payload Bomb attack.

## 🚀 Quick Start

### Generate Charts

```bash
# Generate all 6 visualization charts
npm run visualize

# Or run directly
node visualize_attack.js
```

This will create 6 PNG charts in the `charts/` directory.

### View Dashboard

```bash
# Open the HTML dashboard in your browser
open dashboard.html

# Or on Linux
xdg-open dashboard.html

# Or on Windows
start dashboard.html
```

## 📈 Generated Charts

### 1. Resource Usage (CPU & Memory)
**File:** `charts/1_resource_usage.png`

Shows CPU and memory usage over time during the attack window (14:15-14:30 UTC).

**Key Insights:**
- CPU spikes from 25% baseline to 95% during attack
- Memory increases from 40% to 90%
- Clear correlation between attack timing and resource exhaustion
- Attack window highlighted in red

**What to Look For:**
- Sudden spikes indicating attack start
- Sustained high usage during attack
- Recovery patterns after attack ends

---

### 2. Response Time Degradation
**File:** `charts/2_response_time.png`

Displays p50, p95, and p99 response times showing 40x degradation.

**Key Insights:**
- p50 (median): 200ms → 8,000ms
- p95: 266ms → 10,000ms
- p99: 375ms → 12,000ms
- 40x increase in response time

**What to Look For:**
- Baseline performance before attack
- Dramatic spike during attack window
- All percentiles affected (not just outliers)
- Service-wide impact

---

### 3. Error Rate Spike
**File:** `charts/3_error_rate.png`

Bar chart showing error rate increasing 225x from baseline.

**Key Insights:**
- Baseline error rate: 0.2%
- Peak error rate: 45%
- 225x increase
- Color-coded by severity (green → yellow → red)

**What to Look For:**
- Normal error rate before attack
- Sudden spike at attack start
- Sustained high error rate
- Impact on customer experience

---

### 4. Request Size Distribution
**File:** `charts/4_request_size_distribution.png`

Doughnut chart categorizing requests by payload size.

**Key Insights:**
- 47 attack payloads (>5MB) - shown in red
- Normal traffic patterns visible
- Clear distinction between legitimate and attack traffic

**Categories:**
- Normal (<10KB): Typical API requests
- Medium (10-100KB): Larger queries
- Large (100KB-1MB): Edge cases
- Very Large (1-5MB): Suspicious
- **Attack (>5MB)**: Malicious payloads

---

### 5. Attack Timeline
**File:** `charts/5_attack_timeline.png`

Stacked bar chart showing events per minute.

**Key Insights:**
- Large payloads (red bars): Attack requests
- Errors (orange bars): Failed requests
- Pod restarts (purple bars): Infrastructure impact
- Clear correlation between all three metrics

**What to Look For:**
- Attack burst pattern
- Cascading failures (errors → pod restarts)
- Timeline of incident progression

---

### 6. Top Source IPs
**File:** `charts/6_top_ips.png`

Horizontal bar chart showing request counts by source IP.

**Key Insights:**
- Attacker IP (203.0.113.45) highlighted in red
- Single source responsible for attack
- Normal traffic from other IPs shown in blue

**What to Look For:**
- Anomalous request volume from single IP
- Comparison with legitimate traffic patterns
- Evidence for IP blocking decision

---

## 🎨 Dashboard Features

The HTML dashboard (`dashboard.html`) provides:

### Interactive Elements
- **Stats Cards**: Key metrics at a glance
  - Response time increase (40x)
  - CPU/Memory usage peaks
  - Error rate spike (225x)
  - Attack payload count (47)
  - Pod restarts (15)

### Incident Timeline
Chronological view of attack progression:
- 14:15 UTC: Attack begins
- 14:17 UTC: Performance degradation
- 14:20 UTC: CPU exhaustion
- 14:22 UTC: Memory exhaustion
- 14:25 UTC: Service instability
- 14:28 UTC: Alerts triggered
- 14:30 UTC: Peak impact

### Visual Design
- Color-coded severity levels
- Responsive layout
- Professional styling
- Easy-to-read charts

---

## 🔧 Customization

### Modify Chart Generation

Edit `visualize_attack.js` to customize:

```javascript
// Change chart dimensions
const width = 1200;  // Default: 1200px
const height = 600;  // Default: 600px

// Adjust time range
const startTime = "2026-01-29T14:00:00Z";
const endTime = "2026-01-29T14:35:00Z";

// Modify colors
backgroundColor: 'rgba(255, 99, 132, 0.8)',  // Red for critical
borderColor: 'rgb(255, 99, 132)',
```

### Add New Charts

To add a new chart:

1. Create a new async function:
```javascript
async function generateMyNewChart() {
  // Your chart configuration
  const configuration = {
    type: 'line',  // or 'bar', 'doughnut', etc.
    data: { /* your data */ },
    options: { /* your options */ }
  };
  
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '7_my_chart.png'), imageBuffer);
  console.log('✓ Generated: 7_my_chart.png');
}
```

2. Call it in `generateAllCharts()`:
```javascript
await generateMyNewChart();
```

3. Add to dashboard.html:
```html
<div class="chart-card">
  <h3>📊 My New Chart</h3>
  <img src="charts/7_my_chart.png" alt="My Chart">
</div>
```

---

## 📊 Chart Types Available

### Line Charts
Best for: Time-series data, trends
- Resource usage
- Response times
- Continuous metrics

### Bar Charts
Best for: Comparisons, distributions
- Error rates
- Event counts
- Categorical data

### Doughnut/Pie Charts
Best for: Proportions, percentages
- Request size distribution
- Traffic composition

### Horizontal Bar Charts
Best for: Rankings, top N lists
- Top IPs
- Most affected endpoints

---

## 🎯 Analysis Tips

### Identifying Attack Patterns

1. **Look for Correlations**
   - CPU spike + Memory spike + Error spike = Attack
   - Large payloads + Pod restarts = Resource exhaustion

2. **Compare to Baseline**
   - Normal CPU: 25% → Attack: 95%
   - Normal response: 200ms → Attack: 8000ms
   - Normal errors: 0.2% → Attack: 45%

3. **Timeline Analysis**
   - When did attack start? (14:15 UTC)
   - How long did it last? (15 minutes)
   - What was the progression? (gradual → sudden spike)

4. **Source Analysis**
   - Single IP or distributed? (Single: 203.0.113.45)
   - Request pattern? (Burst of large payloads)
   - Geographic origin? (Check IP geolocation)

### Using Charts for Incident Response

1. **Detection**: Error rate and response time charts
2. **Investigation**: Timeline and resource usage
3. **Attribution**: Top IPs and request distribution
4. **Impact Assessment**: All metrics combined
5. **Remediation Planning**: Identify what to fix

---

## 🔍 Troubleshooting

### Charts Not Generating

```bash
# Check if data files exist
ls -la data/*.json

# Regenerate data if needed
npm run generate-data

# Check dependencies
npm list chart.js chartjs-node-canvas
```

### Dashboard Not Displaying Charts

1. Ensure charts are generated first:
   ```bash
   npm run visualize
   ```

2. Check charts directory:
   ```bash
   ls -la charts/
   ```

3. Open dashboard from correct location:
   ```bash
   # Must be in project root
   open dashboard.html
   ```

### Chart Quality Issues

Increase resolution in `visualize_attack.js`:
```javascript
const width = 1600;   // Higher resolution
const height = 800;
```

---

## 📚 Additional Resources

### Chart.js Documentation
- [Chart.js Official Docs](https://www.chartjs.org/docs/latest/)
- [Chart Types](https://www.chartjs.org/docs/latest/charts/)
- [Configuration Options](https://www.chartjs.org/docs/latest/configuration/)

### Data Analysis
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Incident Response Best Practices](https://www.sans.org/incident-response/)

### Visualization Best Practices
- Use appropriate chart types for data
- Color-code by severity
- Include context (baselines, thresholds)
- Make charts self-explanatory

---

## 🎓 Learning Exercises

### Exercise 1: Identify Attack Start Time
Look at the charts and determine:
- When did CPU usage spike?
- When did errors start increasing?
- What's the correlation?

**Answer:** 14:15 UTC - visible in all charts

### Exercise 2: Calculate Impact
Using the charts, calculate:
- Response time increase factor
- Error rate increase factor
- Resource utilization change

**Answers:**
- Response time: 40x increase
- Error rate: 225x increase
- CPU: +280% (25% → 95%)

### Exercise 3: Remediation Priority
Based on the visualizations, prioritize:
1. What to fix first?
2. What to monitor?
3. What to prevent?

**Suggested Priority:**
1. Block attacker IP (immediate)
2. Add payload size limits (short-term)
3. Implement rate limiting (short-term)
4. Deploy WAF (long-term)

---

## 💡 Pro Tips

1. **Generate charts after each data update**
   ```bash
   npm run generate-data && npm run visualize
   ```

2. **Compare multiple incidents**
   - Save charts with timestamps
   - Create comparison dashboards

3. **Automate reporting**
   - Schedule chart generation
   - Email charts to stakeholders
   - Integrate with monitoring tools

4. **Use charts in presentations**
   - High-quality PNG format
   - Clear, self-explanatory
   - Professional appearance

---

## 🤝 Contributing

Want to add more visualizations?

1. Fork the repository
2. Add your chart function to `visualize_attack.js`
3. Update `dashboard.html` to display it
4. Submit a pull request

---

**DeepTrace** - AI-Powered Security Incident Investigation 🔍
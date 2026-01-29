// Live Data Source - Reads from request_logs.jsonl for real-time monitoring
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'request_logs.jsonl');

/**
 * Read and parse request_logs.jsonl
 */
function readLiveLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }

  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    try {
      const log = JSON.parse(line);
      // Convert to application log format
      return {
        timestamp: log.timestamp,
        service: log.service,
        endpoint: log.endpoint,
        method: log.method,
        request_size: log.request_size_bytes,
        response_time_ms: log.response_time_ms,
        status_code: log.status_code,
        source_ip: log.client_ip,
        level: log.status_code >= 500 ? 'error' : 'info',
        error: log.status_code >= 500 ? `HTTP ${log.status_code}` : null
      };
    } catch (e) {
      console.error('Failed to parse log line:', e.message);
      return null;
    }
  }).filter(log => log !== null);
}

/**
 * Query live logs by time range
 */
function queryLiveLogs({ startTime, endTime, level, limit }) {
  let logs = readLiveLogs();

  // Filter by time range
  if (startTime) {
    logs = logs.filter(log => new Date(log.timestamp) >= new Date(startTime));
  }
  if (endTime) {
    logs = logs.filter(log => new Date(log.timestamp) <= new Date(endTime));
  }

  // Filter by log level
  if (level && level !== 'all') {
    logs = logs.filter(log => log.level === level);
  }

  // Apply limit
  if (limit) {
    logs = logs.slice(0, limit);
  }

  return logs;
}

/**
 * Detect anomalies in live logs
 */
function detectLiveAnomalies({ startTime, endTime, threshold = 1000000 }) {
  const logs = queryLiveLogs({ startTime, endTime });
  
  return logs.filter(log => log.request_size > threshold).map(log => ({
    timestamp: log.timestamp,
    source_ip: log.source_ip,
    endpoint: log.endpoint,
    request_size: log.request_size,
    response_time_ms: log.response_time_ms,
    status_code: log.status_code,
    anomaly_type: 'large_payload'
  }));
}

/**
 * Get error patterns from live logs
 */
function getLiveErrorPatterns({ startTime, endTime }) {
  const errors = queryLiveLogs({ startTime, endTime, level: 'error' });
  
  const patterns = {};
  errors.forEach(log => {
    const key = log.error || 'Unknown error';
    if (!patterns[key]) {
      patterns[key] = {
        pattern: key,
        frequency: 0,
        sample_ips: new Set(),
        endpoints: new Set()
      };
    }
    patterns[key].frequency++;
    patterns[key].sample_ips.add(log.source_ip);
    patterns[key].endpoints.add(log.endpoint);
  });

  // Convert sets to arrays and sort by frequency
  return Object.values(patterns)
    .map(p => ({
      ...p,
      sample_ips: Array.from(p.sample_ips),
      endpoints: Array.from(p.endpoints)
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculate baseline from recent normal traffic
 */
function calculateLiveBaseline() {
  const logs = readLiveLogs();
  
  if (logs.length === 0) {
    return {
      avg_request_size: 1000,
      avg_response_time: 100,
      error_rate: 0.001
    };
  }

  // Use first 20% of logs as baseline (assuming they're normal)
  const baselineLogs = logs.slice(0, Math.floor(logs.length * 0.2));
  
  if (baselineLogs.length === 0) {
    return {
      avg_request_size: 1000,
      avg_response_time: 100,
      error_rate: 0.001
    };
  }

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  return {
    avg_request_size: avg(baselineLogs.map(l => l.request_size)),
    avg_response_time: avg(baselineLogs.map(l => l.response_time_ms)),
    error_rate: baselineLogs.filter(l => l.level === 'error').length / baselineLogs.length
  };
}

/**
 * Detect anomalies by comparing to baseline
 */
function detectLiveMetricAnomalies({ startTime, endTime }) {
  const logs = queryLiveLogs({ startTime, endTime });
  const baseline = calculateLiveBaseline();
  
  const anomalies = [];
  
  // Check for large payload anomalies
  const largePayloads = logs.filter(l => l.request_size > baseline.avg_request_size * 10);
  if (largePayloads.length > 0) {
    anomalies.push({
      type: 'large_payload_burst',
      severity: 'critical',
      count: largePayloads.length,
      baseline: baseline.avg_request_size,
      max_size: Math.max(...largePayloads.map(l => l.request_size)),
      sample_ips: [...new Set(largePayloads.map(l => l.source_ip))]
    });
  }

  // Check for slow response times
  const slowRequests = logs.filter(l => l.response_time_ms > baseline.avg_response_time * 5);
  if (slowRequests.length > 5) {
    anomalies.push({
      type: 'response_time_degradation',
      severity: 'high',
      count: slowRequests.length,
      baseline: baseline.avg_response_time,
      max_time: Math.max(...slowRequests.map(l => l.response_time_ms))
    });
  }

  // Check for error rate spike
  const errorCount = logs.filter(l => l.level === 'error').length;
  const currentErrorRate = errorCount / logs.length;
  if (currentErrorRate > baseline.error_rate * 10 && errorCount > 5) {
    anomalies.push({
      type: 'error_rate_spike',
      severity: 'critical',
      count: errorCount,
      baseline: baseline.error_rate,
      current: currentErrorRate
    });
  }

  return anomalies;
}

module.exports = {
  readLiveLogs,
  queryLiveLogs,
  detectLiveAnomalies,
  getLiveErrorPatterns,
  calculateLiveBaseline,
  detectLiveMetricAnomalies
};

// Made with Bob

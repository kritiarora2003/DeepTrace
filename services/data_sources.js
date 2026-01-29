// Data source connectors for accessing attack simulation data
const fs = require('fs');
const path = require('path');

// Load data files
const dataDir = path.join(__dirname, '..', 'data');

let applicationLogs = null;
let metrics = null;
let apiGatewayLogs = null;
let kubernetesEvents = null;

// Lazy load data files
function loadData() {
  if (!applicationLogs) {
    applicationLogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'application_logs.json'), 'utf8'));
    metrics = JSON.parse(fs.readFileSync(path.join(dataDir, 'metrics.json'), 'utf8'));
    apiGatewayLogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'api_gateway_logs.json'), 'utf8'));
    kubernetesEvents = JSON.parse(fs.readFileSync(path.join(dataDir, 'kubernetes_events.json'), 'utf8'));
  }
}

/**
 * Application Logs Data Source
 * Provides access to structured application logs
 */
class ApplicationLogsDataSource {
  constructor() {
    loadData();
  }

  /**
   * Query logs by time range and filters
   */
  query({ startTime, endTime, level, endpoint, sourceIp, limit }) {
    let results = [...applicationLogs];

    // Filter by time range
    if (startTime) {
      results = results.filter(log => new Date(log.timestamp) >= new Date(startTime));
    }
    if (endTime) {
      results = results.filter(log => new Date(log.timestamp) <= new Date(endTime));
    }

    // Filter by log level
    if (level) {
      results = results.filter(log => log.level === level);
    }

    // Filter by endpoint
    if (endpoint) {
      results = results.filter(log => log.endpoint === endpoint);
    }

    // Filter by source IP
    if (sourceIp) {
      results = results.filter(log => log.source_ip === sourceIp);
    }

    // Apply limit
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Get error patterns and frequencies
   */
  getErrorPatterns({ startTime, endTime }) {
    const errors = this.query({ startTime, endTime, level: 'error' });
    
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
   * Detect anomalies in request sizes
   */
  detectAnomalies({ startTime, endTime, threshold = 5000000 }) {
    const logs = this.query({ startTime, endTime });
    
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
   * Get all logs (for full analysis)
   */
  getAll() {
    return [...applicationLogs];
  }
}

/**
 * Metrics Data Source
 * Provides access to time-series metrics data
 */
class MetricsDataSource {
  constructor() {
    loadData();
  }

  /**
   * Query metrics by time range
   */
  query({ startTime, endTime, service }) {
    let results = [...metrics];

    if (startTime) {
      results = results.filter(m => new Date(m.timestamp) >= new Date(startTime));
    }
    if (endTime) {
      results = results.filter(m => new Date(m.timestamp) <= new Date(endTime));
    }
    if (service) {
      results = results.filter(m => m.service === service);
    }

    return results;
  }

  /**
   * Get baseline metrics for comparison
   */
  getBaseline({ service = 'search-api' }) {
    // Get metrics from 14:00-14:15 (before attack)
    const baselineEnd = new Date('2026-01-29T14:15:00.000Z');
    const baselineStart = new Date('2026-01-29T14:00:00.000Z');

    const baselineMetrics = this.query({
      startTime: baselineStart.toISOString(),
      endTime: baselineEnd.toISOString(),
      service
    });

    if (baselineMetrics.length === 0) return null;

    // Calculate averages
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      cpu_percent: avg(baselineMetrics.map(m => m.metrics.cpu_percent)),
      memory_percent: avg(baselineMetrics.map(m => m.metrics.memory_percent)),
      request_rate: avg(baselineMetrics.map(m => m.metrics.request_rate)),
      response_time_p50: avg(baselineMetrics.map(m => m.metrics.response_time.p50)),
      response_time_p95: avg(baselineMetrics.map(m => m.metrics.response_time.p95)),
      response_time_p99: avg(baselineMetrics.map(m => m.metrics.response_time.p99)),
      error_rate: avg(baselineMetrics.map(m => m.metrics.error_rate))
    };
  }

  /**
   * Detect metric anomalies
   */
  detectAnomalies({ startTime, endTime, service = 'search-api' }) {
    const baseline = this.getBaseline({ service });
    const currentMetrics = this.query({ startTime, endTime, service });

    const anomalies = [];

    currentMetrics.forEach(metric => {
      const m = metric.metrics;
      
      // CPU spike (>2x baseline)
      if (m.cpu_percent > baseline.cpu_percent * 2) {
        anomalies.push({
          timestamp: metric.timestamp,
          type: 'cpu_spike',
          severity: m.cpu_percent > 90 ? 'critical' : 'high',
          value: m.cpu_percent,
          baseline: baseline.cpu_percent,
          increase_factor: (m.cpu_percent / baseline.cpu_percent).toFixed(2)
        });
      }

      // Memory spike (>2x baseline)
      if (m.memory_percent > baseline.memory_percent * 2) {
        anomalies.push({
          timestamp: metric.timestamp,
          type: 'memory_spike',
          severity: m.memory_percent > 85 ? 'critical' : 'high',
          value: m.memory_percent,
          baseline: baseline.memory_percent,
          increase_factor: (m.memory_percent / baseline.memory_percent).toFixed(2)
        });
      }

      // Response time degradation (>5x baseline)
      if (m.response_time.p95 > baseline.response_time_p95 * 5) {
        anomalies.push({
          timestamp: metric.timestamp,
          type: 'response_time_degradation',
          severity: 'critical',
          value: m.response_time.p95,
          baseline: baseline.response_time_p95,
          increase_factor: (m.response_time.p95 / baseline.response_time_p95).toFixed(2)
        });
      }

      // Error rate spike (>10x baseline)
      if (m.error_rate > baseline.error_rate * 10) {
        anomalies.push({
          timestamp: metric.timestamp,
          type: 'error_rate_spike',
          severity: 'critical',
          value: m.error_rate,
          baseline: baseline.error_rate,
          increase_factor: (m.error_rate / baseline.error_rate).toFixed(2)
        });
      }
    });

    return anomalies;
  }

  /**
   * Get all metrics
   */
  getAll() {
    return [...metrics];
  }
}

/**
 * API Gateway Logs Data Source
 * Provides access to API gateway request/response logs
 */
class APIGatewayLogsDataSource {
  constructor() {
    loadData();
  }

  /**
   * Query gateway logs
   */
  query({ startTime, endTime, endpoint, sourceIp, minRequestSize }) {
    let results = [...apiGatewayLogs];

    if (startTime) {
      results = results.filter(log => new Date(log.timestamp) >= new Date(startTime));
    }
    if (endTime) {
      results = results.filter(log => new Date(log.timestamp) <= new Date(endTime));
    }
    if (endpoint) {
      results = results.filter(log => log.endpoint === endpoint);
    }
    if (sourceIp) {
      results = results.filter(log => log.source_ip === sourceIp);
    }
    if (minRequestSize) {
      results = results.filter(log => log.request_size >= minRequestSize);
    }

    return results;
  }

  /**
   * Get request size distribution
   */
  getRequestSizeDistribution({ startTime, endTime }) {
    const logs = this.query({ startTime, endTime });
    
    const distribution = {
      small: 0,      // < 10KB
      medium: 0,     // 10KB - 100KB
      large: 0,      // 100KB - 1MB
      very_large: 0, // 1MB - 5MB
      extreme: 0     // > 5MB
    };

    logs.forEach(log => {
      const size = log.request_size;
      if (size < 10240) distribution.small++;
      else if (size < 102400) distribution.medium++;
      else if (size < 1048576) distribution.large++;
      else if (size < 5242880) distribution.very_large++;
      else distribution.extreme++;
    });

    return distribution;
  }

  /**
   * Get top source IPs by request count
   */
  getTopSourceIPs({ startTime, endTime, limit = 10 }) {
    const logs = this.query({ startTime, endTime });
    
    const ipCounts = {};
    logs.forEach(log => {
      ipCounts[log.source_ip] = (ipCounts[log.source_ip] || 0) + 1;
    });

    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get all gateway logs
   */
  getAll() {
    return [...apiGatewayLogs];
  }
}

/**
 * Kubernetes Events Data Source
 * Provides access to Kubernetes cluster events
 */
class KubernetesEventsDataSource {
  constructor() {
    loadData();
  }

  /**
   * Query Kubernetes events
   */
  query({ startTime, endTime, eventType, namespace, podName }) {
    let results = [...kubernetesEvents];

    if (startTime) {
      results = results.filter(e => new Date(e.timestamp) >= new Date(startTime));
    }
    if (endTime) {
      results = results.filter(e => new Date(e.timestamp) <= new Date(endTime));
    }
    if (eventType) {
      results = results.filter(e => e.event_type === eventType);
    }
    if (namespace) {
      results = results.filter(e => e.namespace === namespace);
    }
    if (podName) {
      results = results.filter(e => e.pod_name.includes(podName));
    }

    return results;
  }

  /**
   * Get pod restart summary
   */
  getPodRestartSummary({ startTime, endTime }) {
    const restarts = this.query({ startTime, endTime, eventType: 'pod_restart' });
    
    const summary = {
      total_restarts: restarts.length,
      oom_kills: restarts.filter(e => e.reason === 'OOMKilled').length,
      pods_affected: new Set(restarts.map(e => e.pod_name)).size,
      restart_timeline: restarts.map(e => ({
        timestamp: e.timestamp,
        pod_name: e.pod_name,
        reason: e.reason
      }))
    };

    return summary;
  }

  /**
   * Get all events
   */
  getAll() {
    return [...kubernetesEvents];
  }
}

// Export data source instances
module.exports = {
  applicationLogs: new ApplicationLogsDataSource(),
  metrics: new MetricsDataSource(),
  apiGatewayLogs: new APIGatewayLogsDataSource(),
  kubernetesEvents: new KubernetesEventsDataSource()
};

// Made with Bob

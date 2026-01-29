const fs = require('fs');

class PredictiveEngine {
  constructor(options = {}) {
    this.options = Object.assign({
      largePayloadBytes: 1 * 1024 * 1024, // 1 MB
      recentMinutes: 60,
      minEventsForPrediction: 3
    }, options);

    this.memory = {
      applicationLogs: [],
      apiGatewayLogs: [],
      metrics: [],
      kubernetesEvents: []
    };

    this.model = {
      endpointStats: {},
      sourceStats: {}
    };
  }

  // Load JSON arrays from file paths (silently skip missing files)
  loadMemoryFromFiles(paths = {}) {
    const load = (p) => {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        return [];
      }
    };

    if (paths.applicationLogs) this.memory.applicationLogs = load(paths.applicationLogs);
    if (paths.apiGatewayLogs) this.memory.apiGatewayLogs = load(paths.apiGatewayLogs);
    if (paths.metrics) this.memory.metrics = load(paths.metrics);
    if (paths.kubernetesEvents) this.memory.kubernetesEvents = load(paths.kubernetesEvents);
  }

  // Simple training: aggregate counts and sizes per endpoint and per source IP
  train() {
    const app = this.memory.applicationLogs || [];
    const api = this.memory.apiGatewayLogs || [];

    const endpointStats = {};
    const sourceStats = {};

    const ingest = (rec, source) => {
      const ts = rec.timestamp ? Date.parse(rec.timestamp) : Date.now();
      const endpoint = rec.endpoint || rec.path || rec.url || 'unknown';
      const size = rec.request_size || rec.requestSize || rec.request_size_bytes || 0;
      const ip = rec.source_ip || rec.sourceIp || rec.client_ip || 'unknown';

      endpointStats[endpoint] = endpointStats[endpoint] || {count:0, totalSize:0, lastSeen:0};
      endpointStats[endpoint].count += 1;
      endpointStats[endpoint].totalSize += Number(size) || 0;
      endpointStats[endpoint].lastSeen = Math.max(endpointStats[endpoint].lastSeen, ts);

      sourceStats[ip] = sourceStats[ip] || {count:0, largeCount:0, lastSeen:0};
      sourceStats[ip].count += 1;
      if ((Number(size) || 0) >= this.options.largePayloadBytes) sourceStats[ip].largeCount += 1;
      sourceStats[ip].lastSeen = Math.max(sourceStats[ip].lastSeen, ts);
    };

    api.forEach(r => ingest(r, 'api_gateway'));
    app.forEach(r => ingest(r, 'application'));

    this.model.endpointStats = endpointStats;
    this.model.sourceStats = sourceStats;
  }

  // Predict likely next attack using simple heuristics
  predict({timeWindowMinutes} = {}) {
    const now = Date.now();
    const windowMs = (timeWindowMinutes || this.options.recentMinutes) * 60 * 1000;

    const endpoints = this.model.endpointStats || {};
    const sources = this.model.sourceStats || {};

    // Score endpoints by recent activity and average payload size
    const endpointScores = Object.entries(endpoints).map(([endpoint, s]) => {
      const avgSize = s.count ? s.totalSize / s.count : 0;
      const ageFactor = Math.exp(-(now - s.lastSeen) / windowMs);
      const score = (s.count * 0.6) + (avgSize / (this.options.largePayloadBytes) * 0.4);
      return {endpoint, score: score * ageFactor, count: s.count, avgSize};
    }).sort((a,b) => b.score - a.score);

    // Score sources by large payload frequency
    const sourceScores = Object.entries(sources).map(([ip, s]) => {
      const recentLargeRatio = s.count ? s.largeCount / s.count : 0;
      const ageFactor = Math.exp(-(now - s.lastSeen) / windowMs);
      const score = (s.largeCount * 0.7) + (recentLargeRatio * 10 * 0.3);
      return {ip, score: score * ageFactor, count: s.count, largeCount: s.largeCount};
    }).sort((a,b) => b.score - a.score);

    const topEndpoint = endpointScores[0] || null;
    const topSource = sourceScores[0] || null;

    // Build a naive attack type prediction
    let attackType = 'unknown';
    let confidence = 0;

    if (topSource && topSource.largeCount >= 3) {
      attackType = 'JSON Payload Bomb';
      confidence = Math.min(0.9, 0.3 + (topSource.largeCount / 10) + (topEndpoint ? Math.min(0.3, topEndpoint.score/5) : 0));
    } else if (topEndpoint && topEndpoint.avgSize >= this.options.largePayloadBytes) {
      attackType = 'Large Payloads / Resource Exhaustion';
      confidence = Math.min(0.8, 0.2 + (topEndpoint.avgSize / (this.options.largePayloadBytes*2)) + (topEndpoint.count/50));
    } else if (topEndpoint && topEndpoint.count >= 20) {
      attackType = 'High Frequency Requests / DDoS';
      confidence = Math.min(0.7, 0.1 + (topEndpoint.count / 100));
    }

    // If not enough data, lower confidence
    const totalEvents = Object.values(endpoints).reduce((s,v)=>s+v.count,0);
    if (totalEvents < this.options.minEventsForPrediction) confidence = Math.min(confidence, 0.35);

    const prediction = {
      timestamp: new Date().toISOString(),
      predicted_endpoint: topEndpoint ? topEndpoint.endpoint : null,
      predicted_source: topSource ? topSource.ip : null,
      predicted_attack_type: attackType,
      confidence: Number(confidence.toFixed(2)),
      rationale: {
        top_endpoint: topEndpoint || null,
        top_source: topSource || null,
        total_events: totalEvents
      },
      recommended_actions: this._recommend(attackType, topSource, topEndpoint)
    };

    return prediction;
  }

  _recommend(attackType, topSource, topEndpoint) {
    const actions = [];
    if (attackType === 'JSON Payload Bomb' || attackType === 'Large Payloads / Resource Exhaustion') {
      if (topSource && topSource.ip && topSource.largeCount) {
        actions.push({priority:1, action:`Block IP ${topSource.ip}`, estimated_time:'2 minutes'});
      }
      if (topEndpoint && topEndpoint.endpoint) {
        actions.push({priority:2, action:`Add request size validation on ${topEndpoint.endpoint}`, estimated_time:'1 hour', implementation:"express.json({ limit: '1mb' })"});
      }
      actions.push({priority:3, action:'Apply rate limiting and resource limits', estimated_time:'2-4 hours'});
    } else if (attackType === 'High Frequency Requests / DDoS') {
      actions.push({priority:1, action:'Enable rate limiting / WAF rules', estimated_time:'10 minutes'});
      actions.push({priority:2, action:'Increase autoscaling & circuit breakers', estimated_time:'1 hour'});
    } else {
      actions.push({priority:1, action:'Collect more data and monitor', estimated_time:'ongoing'});
    }
    return actions;
  }
}

module.exports = PredictiveEngine;

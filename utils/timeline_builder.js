// Timeline builder utility for correlating events from multiple sources

/**
 * Build a chronological timeline from multiple data sources
 */
function buildTimeline(sources, startTime, endTime) {
  const events = [];

  // Add application log events
  if (sources.applicationLogs) {
    sources.applicationLogs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      if (timestamp >= new Date(startTime) && timestamp <= new Date(endTime)) {
        events.push({
          timestamp: log.timestamp,
          source: 'application_logs',
          event_type: log.level === 'error' ? 'error_logged' : 'request_logged',
          severity: log.level === 'error' ? 'high' : 'info',
          details: {
            endpoint: log.endpoint,
            source_ip: log.source_ip,
            request_size: log.request_size,
            response_time_ms: log.response_time_ms,
            status_code: log.status_code,
            error: log.error
          }
        });
      }
    });
  }

  // Add metrics events (only significant changes)
  if (sources.metrics) {
    sources.metrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp);
      if (timestamp >= new Date(startTime) && timestamp <= new Date(endTime)) {
        const m = metric.metrics;
        
        // Add event if metrics show significant degradation
        if (m.cpu_percent > 70 || m.memory_percent > 70 || m.error_rate > 0.1) {
          events.push({
            timestamp: metric.timestamp,
            source: 'metrics',
            event_type: 'performance_degradation',
            severity: m.cpu_percent > 90 || m.memory_percent > 85 ? 'critical' : 'high',
            details: {
              cpu_percent: Math.round(m.cpu_percent * 10) / 10,
              memory_percent: Math.round(m.memory_percent * 10) / 10,
              response_time_p95: m.response_time.p95,
              error_rate: Math.round(m.error_rate * 1000) / 1000
            }
          });
        }
      }
    });
  }

  // Add API gateway events (large requests)
  if (sources.apiGatewayLogs) {
    sources.apiGatewayLogs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      if (timestamp >= new Date(startTime) && timestamp <= new Date(endTime)) {
        // Only add large requests or errors
        if (log.request_size > 5000000 || log.response_code >= 500) {
          events.push({
            timestamp: log.timestamp,
            source: 'api_gateway',
            event_type: log.request_size > 5000000 ? 'large_request_detected' : 'gateway_error',
            severity: log.request_size > 5000000 ? 'warning' : 'high',
            details: {
              request_id: log.request_id,
              endpoint: log.endpoint,
              request_size: `${(log.request_size / 1048576).toFixed(2)}MB`,
              response_code: log.response_code,
              source_ip: log.source_ip,
              response_time_ms: log.response_time_ms
            }
          });
        }
      }
    });
  }

  // Add Kubernetes events
  if (sources.kubernetesEvents) {
    sources.kubernetesEvents.forEach(event => {
      const timestamp = new Date(event.timestamp);
      if (timestamp >= new Date(startTime) && timestamp <= new Date(endTime)) {
        events.push({
          timestamp: event.timestamp,
          source: 'kubernetes',
          event_type: event.event_type,
          severity: event.reason === 'OOMKilled' ? 'critical' : 'high',
          details: {
            pod_name: event.pod_name,
            reason: event.reason,
            message: event.message,
            namespace: event.namespace,
            resource_usage: event.resource_usage,
            restart_count: event.restart_count
          }
        });
      }
    });
  }

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return events;
}

/**
 * Identify correlation windows (time periods with clustered events)
 */
function identifyCorrelationWindows(timeline, windowSizeMinutes = 5) {
  if (timeline.length === 0) return [];

  const windows = [];
  let currentWindow = {
    start: timeline[0].timestamp,
    end: timeline[0].timestamp,
    events: [timeline[0]],
    severity_counts: { critical: 0, high: 0, warning: 0, info: 0 }
  };

  currentWindow.severity_counts[timeline[0].severity]++;

  for (let i = 1; i < timeline.length; i++) {
    const event = timeline[i];
    const currentTime = new Date(event.timestamp);
    const windowEnd = new Date(currentWindow.end);
    const diffMinutes = (currentTime - windowEnd) / (1000 * 60);

    if (diffMinutes <= windowSizeMinutes) {
      // Add to current window
      currentWindow.end = event.timestamp;
      currentWindow.events.push(event);
      currentWindow.severity_counts[event.severity]++;
    } else {
      // Start new window
      windows.push(currentWindow);
      currentWindow = {
        start: event.timestamp,
        end: event.timestamp,
        events: [event],
        severity_counts: { critical: 0, high: 0, warning: 0, info: 0 }
      };
      currentWindow.severity_counts[event.severity]++;
    }
  }

  // Add last window
  windows.push(currentWindow);

  return windows;
}

/**
 * Generate timeline summary statistics
 */
function generateTimelineSummary(timeline) {
  const summary = {
    total_events: timeline.length,
    by_source: {},
    by_severity: { critical: 0, high: 0, warning: 0, info: 0 },
    by_event_type: {},
    time_range: {
      start: timeline.length > 0 ? timeline[0].timestamp : null,
      end: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null
    }
  };

  timeline.forEach(event => {
    // Count by source
    summary.by_source[event.source] = (summary.by_source[event.source] || 0) + 1;
    
    // Count by severity
    summary.by_severity[event.severity]++;
    
    // Count by event type
    summary.by_event_type[event.event_type] = (summary.by_event_type[event.event_type] || 0) + 1;
  });

  return summary;
}

/**
 * Find attack patterns in timeline
 */
function findAttackPatterns(timeline) {
  const patterns = [];

  // Pattern 1: Burst of large requests from single IP
  const largeRequests = timeline.filter(e => 
    e.event_type === 'large_request_detected' || 
    (e.details && e.details.request_size && parseInt(e.details.request_size) > 5000000)
  );

  if (largeRequests.length > 10) {
    const ips = largeRequests.map(e => e.details.source_ip).filter(ip => ip);
    const ipCounts = {};
    ips.forEach(ip => ipCounts[ip] = (ipCounts[ip] || 0) + 1);
    
    const suspiciousIPs = Object.entries(ipCounts)
      .filter(([ip, count]) => count > 5)
      .map(([ip, count]) => ({ ip, count }));

    if (suspiciousIPs.length > 0) {
      patterns.push({
        pattern_type: 'large_payload_burst',
        description: 'Multiple large requests from single source',
        severity: 'critical',
        evidence: {
          request_count: largeRequests.length,
          suspicious_ips: suspiciousIPs,
          time_range: {
            start: largeRequests[0].timestamp,
            end: largeRequests[largeRequests.length - 1].timestamp
          }
        }
      });
    }
  }

  // Pattern 2: Resource exhaustion (OOM kills + high CPU/memory)
  const oomEvents = timeline.filter(e => 
    e.event_type === 'pod_restart' && e.details.reason === 'OOMKilled'
  );
  const resourceEvents = timeline.filter(e => 
    e.event_type === 'performance_degradation' && 
    (e.details.cpu_percent > 90 || e.details.memory_percent > 85)
  );

  if (oomEvents.length > 5 && resourceEvents.length > 5) {
    patterns.push({
      pattern_type: 'resource_exhaustion',
      description: 'Service experiencing resource exhaustion with pod restarts',
      severity: 'critical',
      evidence: {
        oom_kills: oomEvents.length,
        high_resource_events: resourceEvents.length,
        affected_pods: [...new Set(oomEvents.map(e => e.details.pod_name))].length
      }
    });
  }

  // Pattern 3: Error rate spike
  const errorEvents = timeline.filter(e => 
    e.event_type === 'error_logged' || e.event_type === 'gateway_error'
  );

  if (errorEvents.length > 20) {
    patterns.push({
      pattern_type: 'error_rate_spike',
      description: 'Significant increase in error rate',
      severity: 'high',
      evidence: {
        error_count: errorEvents.length,
        error_types: [...new Set(errorEvents.map(e => e.details.error).filter(e => e))]
      }
    });
  }

  return patterns;
}

module.exports = {
  buildTimeline,
  identifyCorrelationWindows,
  generateTimelineSummary,
  findAttackPatterns
};


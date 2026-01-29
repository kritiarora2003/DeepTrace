// Script to generate realistic attack simulation data
const fs = require('fs');

// Helper function to generate random timestamp
function generateTimestamp(baseTime, offsetMinutes, offsetSeconds = 0) {
  const base = new Date(baseTime);
  base.setMinutes(base.getMinutes() + offsetMinutes);
  base.setSeconds(base.getSeconds() + offsetSeconds);
  return base.toISOString();
}

// Generate application logs (200+ entries)
function generateApplicationLogs() {
  const logs = [];
  const baseTime = '2026-01-29T14:00:00.000Z';
  const attackerIP = '203.0.113.45';
  const normalIPs = [
    '192.168.1.45', '192.168.1.67', '192.168.1.89',
    '10.0.0.23', '10.0.0.45', '10.0.0.78',
    '172.16.0.12', '172.16.0.34', '172.16.0.56'
  ];
  
  const endpoints = ['/api/search', '/api/products', '/api/users', '/api/cart'];
  const queries = ['laptop', 'phone', 'tablet', 'headphones', 'camera', 'watch'];
  
  // Generate normal traffic (14:00 - 14:35, ~153 entries)
  for (let i = 0; i < 153; i++) {
    const minuteOffset = Math.floor(i / 5);
    const secondOffset = (i % 5) * 12;
    const ip = normalIPs[Math.floor(Math.random() * normalIPs.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    logs.push({
      timestamp: generateTimestamp(baseTime, minuteOffset, secondOffset),
      level: 'info',
      service: 'search-api',
      endpoint: endpoint,
      method: 'POST',
      request_size: Math.floor(Math.random() * 2000) + 500,
      response_time_ms: Math.floor(Math.random() * 150) + 150,
      status_code: 200,
      source_ip: ip,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      query: queries[Math.floor(Math.random() * queries.length)]
    });
  }
  
  // Generate attack traffic (14:15 - 14:30, 47 entries)
  for (let i = 0; i < 47; i++) {
    const minuteOffset = 15 + Math.floor(i / 3);
    const secondOffset = (i % 3) * 20;
    const requestSize = Math.floor(Math.random() * 5000000) + 5000000; // 5-10MB
    const responseTime = Math.floor(Math.random() * 4000) + 6000; // 6-10 seconds
    
    logs.push({
      timestamp: generateTimestamp(baseTime, minuteOffset, secondOffset),
      level: 'error',
      service: 'search-api',
      endpoint: '/api/search',
      method: 'POST',
      request_size: requestSize,
      response_time_ms: responseTime,
      status_code: i % 3 === 0 ? 500 : (i % 3 === 1 ? 504 : 503),
      source_ip: attackerIP,
      error: i % 2 === 0 ? 'Request timeout - payload processing exceeded limit' : 'Memory allocation failed',
      nested_depth: Math.floor(Math.random() * 50) + 100,
      user_agent: 'python-requests/2.28.0'
    });
  }
  
  // Sort by timestamp
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  return logs;
}

// Generate metrics data
function generateMetrics() {
  const metrics = [];
  const baseTime = '2026-01-29T14:00:00.000Z';
  
  // Baseline metrics (14:00 - 14:15)
  for (let i = 0; i < 15; i++) {
    metrics.push({
      timestamp: generateTimestamp(baseTime, i),
      service: 'search-api',
      metrics: {
        cpu_percent: 20 + Math.random() * 10,
        memory_percent: 35 + Math.random() * 10,
        request_rate: 80 + Math.floor(Math.random() * 20),
        response_time: {
          p50: 180 + Math.floor(Math.random() * 40),
          p95: 250 + Math.floor(Math.random() * 50),
          p99: 350 + Math.floor(Math.random() * 100)
        },
        error_rate: 0.001 + Math.random() * 0.002,
        active_connections: 45 + Math.floor(Math.random() * 15)
      }
    });
  }
  
  // Attack progression (14:15 - 14:30)
  for (let i = 15; i < 30; i++) {
    const attackProgress = (i - 15) / 15; // 0 to 1
    metrics.push({
      timestamp: generateTimestamp(baseTime, i),
      service: 'search-api',
      metrics: {
        cpu_percent: 25 + (attackProgress * 70),
        memory_percent: 40 + (attackProgress * 50),
        request_rate: 90 + Math.floor(attackProgress * 60),
        response_time: {
          p50: 200 + Math.floor(attackProgress * 6000),
          p95: 300 + Math.floor(attackProgress * 9500),
          p99: 400 + Math.floor(attackProgress * 12000)
        },
        error_rate: 0.002 + (attackProgress * 0.45),
        active_connections: 50 + Math.floor(attackProgress * 200)
      }
    });
  }
  
  // Recovery phase (14:30 - 14:35)
  for (let i = 30; i < 35; i++) {
    const recoveryProgress = (i - 30) / 5;
    metrics.push({
      timestamp: generateTimestamp(baseTime, i),
      service: 'search-api',
      metrics: {
        cpu_percent: 95 - (recoveryProgress * 70),
        memory_percent: 90 - (recoveryProgress * 50),
        request_rate: 150 - Math.floor(recoveryProgress * 60),
        response_time: {
          p50: 6200 - Math.floor(recoveryProgress * 6000),
          p95: 9800 - Math.floor(recoveryProgress * 9500),
          p99: 12400 - Math.floor(recoveryProgress * 12000)
        },
        error_rate: 0.45 - (recoveryProgress * 0.448),
        active_connections: 250 - Math.floor(recoveryProgress * 200)
      }
    });
  }
  
  return metrics;
}

// Generate API Gateway logs
function generateAPIGatewayLogs() {
  const logs = [];
  const baseTime = '2026-01-29T14:00:00.000Z';
  const attackerIP = '203.0.113.45';
  
  // Normal requests
  for (let i = 0; i < 80; i++) {
    const minuteOffset = Math.floor(i / 3);
    logs.push({
      request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: generateTimestamp(baseTime, minuteOffset, (i % 3) * 20),
      method: 'POST',
      endpoint: '/api/search',
      request_size: Math.floor(Math.random() * 2000) + 500,
      request_headers: {
        'content-type': 'application/json',
        'content-length': String(Math.floor(Math.random() * 2000) + 500)
      },
      response_code: 200,
      response_time_ms: Math.floor(Math.random() * 150) + 150,
      source_ip: `192.168.1.${Math.floor(Math.random() * 100) + 1}`,
      geo_location: {
        country: 'US',
        city: 'San Francisco'
      },
      rate_limit_hit: false
    });
  }
  
  // Attack requests
  for (let i = 0; i < 47; i++) {
    const minuteOffset = 15 + Math.floor(i / 3);
    const requestSize = Math.floor(Math.random() * 5000000) + 5000000;
    logs.push({
      request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: generateTimestamp(baseTime, minuteOffset, (i % 3) * 20),
      method: 'POST',
      endpoint: '/api/search',
      request_size: requestSize,
      request_headers: {
        'content-type': 'application/json',
        'content-length': String(requestSize)
      },
      response_code: i % 3 === 0 ? 500 : (i % 3 === 1 ? 504 : 503),
      response_time_ms: Math.floor(Math.random() * 4000) + 6000,
      source_ip: attackerIP,
      geo_location: {
        country: 'Unknown',
        city: 'Unknown'
      },
      rate_limit_hit: false
    });
  }
  
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return logs;
}

// Generate Kubernetes events
function generateKubernetesEvents() {
  const events = [];
  const baseTime = '2026-01-29T14:00:00.000Z';
  const podNames = [
    'search-api-7d9f8c-xk2p9',
    'search-api-7d9f8c-m4n7q',
    'search-api-7d9f8c-p8r2t',
    'search-api-7d9f8c-w5y3k',
    'search-api-7d9f8c-z9b6v'
  ];
  
  // Normal events
  events.push({
    timestamp: generateTimestamp(baseTime, 0),
    event_type: 'deployment_update',
    namespace: 'production',
    pod_name: 'search-api-7d9f8c',
    reason: 'ScalingReplicaSet',
    message: 'Scaled up replica set to 5',
    replica_count: 5
  });
  
  // OOM kills during attack
  for (let i = 0; i < 15; i++) {
    const minuteOffset = 22 + Math.floor(i / 2);
    events.push({
      timestamp: generateTimestamp(baseTime, minuteOffset, (i % 2) * 30),
      event_type: 'pod_restart',
      namespace: 'production',
      pod_name: podNames[i % 5],
      reason: 'OOMKilled',
      message: 'Container exceeded memory limit',
      resource_usage: {
        memory_limit: '2Gi',
        memory_used: `${2.0 + Math.random() * 0.5}Gi`
      },
      restart_count: Math.floor(i / 5) + 1
    });
  }
  
  // Health check failures
  for (let i = 0; i < 8; i++) {
    const minuteOffset = 20 + Math.floor(i / 2);
    events.push({
      timestamp: generateTimestamp(baseTime, minuteOffset, (i % 2) * 30),
      event_type: 'health_check_failed',
      namespace: 'production',
      pod_name: podNames[i % 5],
      reason: 'Unhealthy',
      message: 'Liveness probe failed: HTTP probe failed with statuscode: 503',
      consecutive_failures: Math.floor(i / 2) + 1
    });
  }
  
  // Auto-scaling events
  events.push({
    timestamp: generateTimestamp(baseTime, 25),
    event_type: 'horizontal_scaling',
    namespace: 'production',
    pod_name: 'search-api-7d9f8c',
    reason: 'ScalingReplicaSet',
    message: 'Scaled up replica set from 5 to 8 due to CPU utilization',
    replica_count: 8,
    trigger_metric: 'cpu_percent',
    trigger_value: 95
  });
  
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return events;
}

// Generate all data files
console.log('Generating attack simulation data...');

const applicationLogs = generateApplicationLogs();
const metrics = generateMetrics();
const apiGatewayLogs = generateAPIGatewayLogs();
const kubernetesEvents = generateKubernetesEvents();

const path = require('path');
const dataDir = __dirname;

fs.writeFileSync(path.join(dataDir, 'application_logs.json'), JSON.stringify(applicationLogs, null, 2));
fs.writeFileSync(path.join(dataDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(dataDir, 'api_gateway_logs.json'), JSON.stringify(apiGatewayLogs, null, 2));
fs.writeFileSync(path.join(dataDir, 'kubernetes_events.json'), JSON.stringify(kubernetesEvents, null, 2));

console.log(`✅ Generated ${applicationLogs.length} application log entries`);
console.log(`✅ Generated ${metrics.length} metric data points`);
console.log(`✅ Generated ${apiGatewayLogs.length} API gateway log entries`);
console.log(`✅ Generated ${kubernetesEvents.length} Kubernetes events`);
console.log('\nData files created in data/ directory');

// Made with Bob

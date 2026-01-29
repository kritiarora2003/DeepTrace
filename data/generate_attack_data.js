// Script to generate realistic, randomized attack simulation data
const fs = require('fs');
const path = require('path');

console.log('🎲 Generating randomized realistic attack data...');

// --- CONFIGURATION ---
const BASE_TIME = new Date('2026-01-29T14:00:00.000Z');
const ATTACK_START_OFFSET_MIN = 15; // Attack starts at 14:15
const TOTAL_DURATION_MIN = 35; // Runs until 14:35

// Botnet IPs (Distributed Attack)
const ATTACKER_IPS = [
  '203.0.113.45',  // C&C / Main Node
  '198.51.100.23', // Bot 1
  '198.51.100.89', // Bot 2
  '192.0.2.14',    // Bot 3
  '192.0.2.188'    // Bot 4
];

const NORMAL_IPS = [
  '192.168.1.45', '192.168.1.67', '192.168.1.89', '10.0.0.23',
  '10.0.0.45', '10.0.0.78', '172.16.0.12', '172.16.0.34'
];

const USER_AGENTS = {
  NORMAL: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (HTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
  ],
  ATTACK: [
    'python-requests/2.28.0',
    'curl/7.81.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Spoofed
    'Go-http-client/1.1'
  ]
};

// --- HELPERS ---

// Random integer between min and max (inclusive)
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Get random element from array
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Add random jitter to time (Poisson-like arrival)
function addJitter(date, msRange) {
  const newDate = new Date(date);
  newDate.setMilliseconds(newDate.getMilliseconds() + randomInt(-msRange, msRange));
  return newDate;
}

// Generate Logs
function generateApplicationLogs() {
  const logs = [];
  let currentTime = new Date(BASE_TIME);
  const endTime = new Date(BASE_TIME.getTime() + TOTAL_DURATION_MIN * 60000);

  // Normal traffic generator loop
  let normalTrafficParams = { meanIntervalMs: 12000, varianceMs: 5000 };

  // Attack traffic events
  const attackEvents = [];

  // 1. Generate BACKGROUND Normal Traffic
  let t = new Date(BASE_TIME);
  while (t < endTime) {
    // Variable interval for realistic traffic waves
    const interval = Math.max(100, normalTrafficParams.meanIntervalMs + randomInt(-normalTrafficParams.varianceMs, normalTrafficParams.varianceMs));
    t = new Date(t.getTime() + interval);

    if (t >= endTime) break;

    logs.push({
      timestamp: t.toISOString(),
      level: 'info',
      service: 'search-api',
      endpoint: randomChoice(['/api/search', '/api/products', '/api/users']),
      method: 'POST',
      request_size: randomInt(300, 2500),
      response_time_ms: randomInt(80, 450), // Normal latency
      status_code: 200,
      source_ip: randomChoice(NORMAL_IPS),
      user_agent: randomChoice(USER_AGENTS.NORMAL),
      query: randomChoice(['laptop', 'shoes', 'watch', 'monitor'])
    });
  }

  // 2. Generate ATTACK Traffic (Bursts)
  const attackStartTime = new Date(BASE_TIME.getTime() + ATTACK_START_OFFSET_MIN * 60000);
  const attackEndTime = new Date(attackStartTime.getTime() + 15 * 60000); // 15 min attack

  let at = new Date(attackStartTime);
  while (at < attackEndTime) {
    // Attack traffic comes in bursts
    const burstSize = randomInt(1, 5); // 1-5 requests in quick succession

    for (let i = 0; i < burstSize; i++) {
      const isBombs = Math.random() > 0.3; // 70% chance of being a huge payload
      const payloadSize = isBombs ? randomInt(4 * 1024 * 1024, 12 * 1024 * 1024) : randomInt(5000, 50000); // 4-12MB or 5-50KB probing

      // Massive latency for bombs
      const latency = isBombs ? randomInt(5000, 15000) : randomInt(200, 800);

      // Errors increase as system degrades
      const attackProgress = (at.getTime() - attackStartTime.getTime()) / (15 * 60000);
      const errorChance = 0.2 + (attackProgress * 0.7); // Starts at 20%, ends at 90%
      const isError = Math.random() < errorChance;

      let statusCode = 200;
      let errorMsg = undefined;
      let level = 'info';

      if (isError) {
        level = 'error';
        statusCode = randomChoice([500, 502, 503, 504]);
        errorMsg = randomChoice([
          'Request timeout - payload processing exceeded limit',
          'Memory allocation failed',
          'JavaScript heap out of memory',
          'Unexpected token in JSON at position 5242880'
        ]);
      }

      logs.push({
        timestamp: addJitter(at, 2000).toISOString(),
        level: level,
        service: 'search-api',
        endpoint: '/api/search',
        method: 'POST',
        request_size: payloadSize,
        response_time_ms: latency,
        status_code: statusCode,
        source_ip: randomChoice(ATTACKER_IPS), // Distributed IPs
        user_agent: randomChoice(USER_AGENTS.ATTACK),
        error: errorMsg,
        nested_depth: isBombs ? randomInt(100, 500) : randomInt(2, 10)
      });
    }

    // Time until next attack burst (randomized)
    at = new Date(at.getTime() + randomInt(2000, 15000));
  }

  return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function generateMetrics() {
  const metrics = [];
  const endTime = new Date(BASE_TIME.getTime() + TOTAL_DURATION_MIN * 60000);
  let t = new Date(BASE_TIME);

  // Per-minute metrics
  while (t < endTime) {
    const minutesFromStart = (t.getTime() - BASE_TIME.getTime()) / 60000;

    // Baseline
    let cpu = 20 + Math.random() * 5;
    let mem = 35 + Math.random() * 5;
    let errorRate = 0.001;
    let p95 = 200;

    // Attack Period
    if (minutesFromStart >= ATTACK_START_OFFSET_MIN && minutesFromStart <= (ATTACK_START_OFFSET_MIN + 15)) {
      const attackProgress = (minutesFromStart - ATTACK_START_OFFSET_MIN) / 15;

      // Noisy, jagged increase
      const noise = (Math.random() - 0.5) * 15;
      cpu = Math.min(99, 25 + (attackProgress * 70) + noise);
      mem = Math.min(95, 40 + (attackProgress * 50) + noise);

      errorRate = Math.min(0.8, 0.01 + (attackProgress * 0.6) + (Math.random() * 0.1));
      p95 = 250 + (attackProgress * 8000) + randomInt(-500, 2000);
    }

    metrics.push({
      timestamp: t.toISOString(),
      service: 'search-api',
      metrics: {
        cpu_percent: parseFloat(cpu.toFixed(1)),
        memory_percent: parseFloat(mem.toFixed(1)),
        request_rate: randomInt(80, 150),
        response_time: {
          p50: p95 * 0.6,
          p95: p95,
          p99: p95 * 1.5
        },
        error_rate: parseFloat(errorRate.toFixed(4)),
        active_connections: randomInt(40, 300)
      }
    });

    t = new Date(t.getTime() + 60000); // +1 minute
  }

  return metrics;
}

// Generate and Save
const path_logs = path.join(__dirname, 'application_logs.json');
const path_metrics = path.join(__dirname, 'metrics.json');
const path_gateway = path.join(__dirname, 'api_gateway_logs.json');
const path_k8s = path.join(__dirname, 'kubernetes_events.json');

const appLogs = generateApplicationLogs();
const metricsData = generateMetrics();

// Reuse app logs for gateway logs to ensure consistency, but strip some app-only fields
const gatewayLogs = appLogs.map(log => ({
  request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: log.timestamp,
  method: log.method,
  endpoint: log.endpoint,
  request_size: log.request_size,
  response_code: log.status_code,
  response_time_ms: log.response_time_ms,
  source_ip: log.source_ip,
  user_agent: log.user_agent // Gateway sees UA
}));

// Simple K8s events generation based on Metrics
const k8sEvents = [];
metricsData.forEach(m => {
  if (m.metrics.memory_percent > 70 && Math.random() > 0.3) {
    k8sEvents.push({
      timestamp: m.timestamp,
      event_type: 'pod_restart',
      namespace: 'production',
      pod_name: `search-api-${randomInt(1000, 9999)}`,
      reason: 'OOMKilled',
      message: 'Container exceeded memory limit',
      restart_count: randomInt(1, 5)
    });
  }
});

fs.writeFileSync(path_logs, JSON.stringify(appLogs, null, 2));
fs.writeFileSync(path_metrics, JSON.stringify(metricsData, null, 2));
fs.writeFileSync(path_gateway, JSON.stringify(gatewayLogs, null, 2));
fs.writeFileSync(path_k8s, JSON.stringify(k8sEvents, null, 2));

console.log(`✅ Generated ${appLogs.length} randomized log entries.`);
console.log(`✅ Generated ${metricsData.length} metric points.`);
console.log(`✅ Generated ${gatewayLogs.length} gateway logs.`);
console.log(`✅ Generated ${k8sEvents.length} k8s events.`);

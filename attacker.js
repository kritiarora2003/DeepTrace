// Enhanced attacker that generates realistic logs, metrics, and K8s events during live attack
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

// Reuse helper functions from generate_attack_data.js
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// IP Pools
const ATTACKER_IPS = [
  '203.0.113.45',  // C&C / Main Node
  '198.51.100.23', // Bot 1
  '198.51.100.89', // Bot 2
  '192.0.2.14',    // Bot 3
  '192.0.2.188'    // Bot 4
];

const NORMAL_IPS = [
  '192.168.1.45', '192.168.1.67', '192.168.1.89', '10.0.0.23',
  '10.0.0.45'
];

// User Agents
const USER_AGENTS = {
  NORMAL: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  ],
  ATTACK: [
    'python-requests/2.28.0',
    'curl/7.81.0',
    'Go-http-client/1.1'
  ]
};

// Payload generator
function generateJsonBomb(depth, payloadSize) {
  let root = {};
  let current = root;
  for (let i = 0; i < depth; i++) {
    current.child = {};
    current = current.child;
  }
  current.data = "A".repeat(payloadSize);
  return root;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Generate realistic metrics during attack
function generateMetrics(attackProgress, baseTime) {
  const noise = (Math.random() - 0.5) * 15;
  const cpu = Math.min(99, 25 + (attackProgress * 70) + noise);
  const mem = Math.min(95, 40 + (attackProgress * 50) + noise);
  const errorRate = Math.min(0.8, 0.01 + (attackProgress * 0.6) + (Math.random() * 0.1));
  const p95 = 250 + (attackProgress * 8000) + randomInt(-500, 2000);

  return {
    timestamp: baseTime.toISOString(),
    service: 'search-api',
    metrics: {
      cpu_percent: parseFloat(cpu.toFixed(1)),
      memory_percent: parseFloat(mem.toFixed(1)),
      request_rate: randomInt(80, 150),
      response_time: {
        p50: Math.round(p95 * 0.6),
        p95: Math.round(p95),
        p99: Math.round(p95 * 1.5)
      },
      error_rate: parseFloat(errorRate.toFixed(4)),
      active_connections: randomInt(40, 300)
    }
  };
}

// Generate Kubernetes events during attack
function generateK8sEvent(attackProgress, baseTime, eventType) {
  const podNames = [
    'search-api-7d9f8b6c5d-x7k2m',
    'search-api-7d9f8b6c5d-p9n4q',
    'search-api-7d9f8b6c5d-m3h8r'
  ];

  const events = {
    pod_restart: {
      event_type: 'pod_restart',
      reason: 'OOMKilled',
      message: 'Container killed due to memory pressure',
      resource_usage: {
        memory_mb: randomInt(450, 512),
        cpu_cores: randomInt(80, 100) / 100
      }
    },
    high_memory: {
      event_type: 'resource_warning',
      reason: 'HighMemoryUsage',
      message: 'Pod memory usage exceeded 85% threshold',
      resource_usage: {
        memory_mb: randomInt(400, 480),
        cpu_cores: randomInt(70, 90) / 100
      }
    }
  };

  const event = events[eventType];
  return {
    timestamp: baseTime.toISOString(),
    namespace: 'production',
    pod_name: randomChoice(podNames),
    ...event,
    restart_count: Math.floor(attackProgress * 20)
  };
}

// Update metrics file
function updateMetricsFile(metrics) {
  const filepath = path.join(__dirname, 'data', 'metrics.json');
  let existingMetrics = [];
  
  if (fs.existsSync(filepath)) {
    try {
      existingMetrics = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      existingMetrics = [];
    }
  }
  
  existingMetrics.push(metrics);
  fs.writeFileSync(filepath, JSON.stringify(existingMetrics, null, 2));
}

// Update K8s events file
function updateK8sEventsFile(event) {
  const filepath = path.join(__dirname, 'data', 'kubernetes_events.json');
  let existingEvents = [];
  
  if (fs.existsSync(filepath)) {
    try {
      existingEvents = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      existingEvents = [];
    }
  }
  
  existingEvents.push(event);
  fs.writeFileSync(filepath, JSON.stringify(existingEvents, null, 2));
}

async function attack() {
  const fetchModule = await import("node-fetch");
  const fetchFn = fetchModule.default;

  console.log('\n' + '='.repeat(80));
  console.log('💣 ENHANCED REALISTIC ATTACK SIMULATION');
  console.log('='.repeat(80));
  console.log('\n🎯 Target: http://localhost:4000/api/search');
  console.log('🌐 Attack Pattern: Distributed botnet (5 IPs)');
  console.log('📊 Generates: Logs + Metrics + K8s Events');
  console.log('🔢 Total Requests: 100 (mix of normal + attack)');
  console.log('⏱️  Duration: ~25 seconds\n');

  const startTime = Date.now();
  const attackStartTime = new Date();
  let successCount = 0;
  let errorCount = 0;
  let normalCount = 0;
  let attackCount = 0;
  let metricsGenerated = 0;
  let k8sEventsGenerated = 0;

  for (let i = 0; i < 100; i++) {
    const attackProgress = i / 100;
    const currentTime = new Date(attackStartTime.getTime() + (i * 250));
    
    // Determine if this is attack traffic (70% attack, 30% normal)
    const isAttackTraffic = Math.random() > 0.3;
    
    let ip, userAgent, payloadSize, depth;
    
    if (isAttackTraffic) {
      // Attack traffic
      ip = randomChoice(ATTACKER_IPS);
      userAgent = randomChoice(USER_AGENTS.ATTACK);
      
      // 70% chance of large payload bomb
      const isBomb = Math.random() > 0.3;
      payloadSize = isBomb ? randomInt(4000000, 12000000) : randomInt(5000, 50000);
      depth = isBomb ? randomInt(100, 500) : randomInt(2, 10);
      attackCount++;
    } else {
      // Normal traffic
      ip = randomChoice(NORMAL_IPS);
      userAgent = randomChoice(USER_AGENTS.NORMAL);
      payloadSize = randomInt(300, 2500);
      depth = randomInt(2, 5);
      normalCount++;
    }

    // Generate payload
    const payload = generateJsonBomb(depth, payloadSize);
    const payloadStr = JSON.stringify(payload);
    const actualPayloadSize = Buffer.byteLength(payloadStr);

    try {
      const reqStart = Date.now();
      const response = await fetchFn("http://localhost:4000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip,
          "User-Agent": userAgent
        },
        body: payloadStr
      });

      const reqTime = Date.now() - reqStart;
      const icon = isAttackTraffic ? '🔴' : '🟢';
      
      if (response.ok) {
        successCount++;
        console.log(`${icon} ${i + 1}/100: ${formatBytes(actualPayloadSize).padEnd(10)} from ${ip.padEnd(15)} ${reqTime}ms`);
      } else {
        errorCount++;
        console.log(`${icon} ${i + 1}/100: ${formatBytes(actualPayloadSize).padEnd(10)} from ${ip.padEnd(15)} ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      errorCount++;
      console.log(`❌ ${i + 1}/100: ${formatBytes(actualPayloadSize).padEnd(10)} from ${ip.padEnd(15)} Failed`);
    }

    // Generate metrics every 10 requests
    if (i % 10 === 0) {
      const metrics = generateMetrics(attackProgress, currentTime);
      updateMetricsFile(metrics);
      metricsGenerated++;
    }

    // Generate K8s events during heavy attack (after 30% progress)
    if (attackProgress > 0.3 && i % 15 === 0) {
      const eventType = Math.random() > 0.5 ? 'pod_restart' : 'high_memory';
      const k8sEvent = generateK8sEvent(attackProgress, currentTime, eventType);
      updateK8sEventsFile(k8sEvent);
      k8sEventsGenerated++;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('📊 ENHANCED ATTACK COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📈 Request Summary:`);
  console.log(`   • Total Requests: 100`);
  console.log(`   • Successful: ${successCount}`);
  console.log(`   • Failed: ${errorCount}`);
  console.log(`   • Normal Traffic: ${normalCount}`);
  console.log(`   • Attack Traffic: ${attackCount}`);
  console.log(`   • Total Time: ${totalTime}s`);
  
  console.log(`\n📊 Generated Data:`);
  console.log(`   • Request Logs: 100 (in request_logs.jsonl)`);
  console.log(`   • Metrics: ${metricsGenerated} data points (in metrics.json)`);
  console.log(`   • K8s Events: ${k8sEventsGenerated} events (in kubernetes_events.json)`);

  console.log(`\n🔍 Monitor Should Detect:`);
  console.log(`   • ~${attackCount} anomalous requests`);
  console.log(`   • ${metricsGenerated} metric anomalies (CPU/Memory spikes)`);
  console.log(`   • ${k8sEventsGenerated} pod restarts/warnings`);
  console.log(`   • Distributed attack from ${ATTACKER_IPS.length} IPs`);
  
  console.log('\n' + '='.repeat(80) + '\n');
}

attack();

// Made with Bob

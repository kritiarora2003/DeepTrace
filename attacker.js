const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Pool of 10 different IPs (mix of legitimate and malicious)
const IP_POOL = [
  "203.0.113.45",   // Malicious
  "198.51.100.23",  // Legitimate
  "192.0.2.100",    // Malicious
  "203.0.113.67",   // Legitimate
  "198.51.100.89",  // Malicious
  "192.0.2.150",    // Legitimate
  "203.0.113.120",  // Malicious
  "198.51.100.200", // Legitimate
  "192.0.2.250",    // Malicious
  "203.0.113.180"   // Legitimate
];

// 10 different payload configurations (mix of normal and anomalous)
const PAYLOAD_CONFIGS = [
  { depth: 5, size: 1000, type: "normal", description: "Small normal request" },           // ~1KB
  { depth: 10, size: 5000, type: "normal", description: "Medium normal request" },         // ~5KB
  { depth: 15, size: 10000, type: "normal", description: "Large normal request" },         // ~10KB
  { depth: 20, size: 50000, type: "normal", description: "Very large normal request" },    // ~50KB
  { depth: 50, size: 500000, type: "suspicious", description: "Suspicious large request" }, // ~500KB
  { depth: 80, size: 2000000, type: "anomaly", description: "Anomalous 2MB payload" },     // ~2MB
  { depth: 90, size: 5000000, type: "anomaly", description: "Anomalous 5MB payload" },     // ~5MB
  { depth: 100, size: 8000000, type: "anomaly", description: "Anomalous 8MB payload" },    // ~8MB
  { depth: 110, size: 10000000, type: "anomaly", description: "Anomalous 10MB payload" },  // ~10MB
  { depth: 3, size: 500, type: "normal", description: "Tiny normal request" }              // ~500B
];

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

async function attack() {
  const fetchModule = await import("node-fetch");
  const fetchFn = fetchModule.default;

  console.log('\n' + '='.repeat(80));
  console.log('💣 STARTING MIXED TRAFFIC SIMULATION');
  console.log('='.repeat(80));
  console.log('\n🎯 Target: http://localhost:4000/api/search');
  console.log('🌐 IP Pool: 10 different source IPs');
  console.log('📦 Payload Types: 10 different sizes (4 normal, 1 suspicious, 5 anomalous)');
  console.log('🔢 Total Requests: 100');
  console.log('⏱️  Delay: 200ms between requests\n');

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let normalCount = 0;
  let suspiciousCount = 0;
  let anomalyCount = 0;

  const stats = {
    byType: { normal: 0, suspicious: 0, anomaly: 0 },
    byIP: {},
    totalBytes: 0
  };

  for (let i = 0; i < 100; i++) {
    // Randomly select IP and payload config
    const ip = IP_POOL[Math.floor(Math.random() * IP_POOL.length)];
    const config = PAYLOAD_CONFIGS[Math.floor(Math.random() * PAYLOAD_CONFIGS.length)];
    
    // Generate payload
    const payload = generateJsonBomb(config.depth, config.size);
    const payloadStr = JSON.stringify(payload);
    const payloadSize = Buffer.byteLength(payloadStr);

    // Track statistics
    stats.byType[config.type]++;
    stats.byIP[ip] = (stats.byIP[ip] || 0) + 1;
    stats.totalBytes += payloadSize;

    try {
      const reqStart = Date.now();
      const response = await fetchFn("http://localhost:4000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": ip
        },
        body: payloadStr
      });

      const reqTime = Date.now() - reqStart;
      
      let icon = '✅';
      if (config.type === 'anomaly') {
        icon = '🔴';
        anomalyCount++;
      } else if (config.type === 'suspicious') {
        icon = '🟡';
        suspiciousCount++;
      } else {
        icon = '🟢';
        normalCount++;
      }

      if (response.ok) {
        successCount++;
        console.log(`${icon} Request ${i + 1}/100: ${formatBytes(payloadSize).padEnd(10)} from ${ip.padEnd(15)} [${config.type.toUpperCase()}] ${reqTime}ms`);
      } else {
        errorCount++;
        console.log(`${icon} Request ${i + 1}/100: ${formatBytes(payloadSize).padEnd(10)} from ${ip.padEnd(15)} [${config.type.toUpperCase()}] ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      errorCount++;
      console.log(`❌ Request ${i + 1}/100: ${formatBytes(payloadSize).padEnd(10)} from ${ip.padEnd(15)} [${config.type.toUpperCase()}] Failed - ${error.message}`);
    }

    // Delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('📊 TRAFFIC SIMULATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📈 Request Summary:`);
  console.log(`   • Total Requests: 100`);
  console.log(`   • Successful: ${successCount}`);
  console.log(`   • Failed: ${errorCount}`);
  console.log(`   • Total Time: ${totalTime}s`);
  console.log(`   • Average Rate: ${(100 / parseFloat(totalTime)).toFixed(1)} req/s`);
  
  console.log(`\n🎯 Traffic Breakdown:`);
  console.log(`   • 🟢 Normal: ${stats.byType.normal} requests`);
  console.log(`   • 🟡 Suspicious: ${stats.byType.suspicious} requests`);
  console.log(`   • 🔴 Anomalous: ${stats.byType.anomaly} requests`);
  console.log(`   • Total Data Sent: ${formatBytes(stats.totalBytes)}`);

  console.log(`\n🌐 IP Distribution:`);
  Object.entries(stats.byIP)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ip, count]) => {
      console.log(`   • ${ip}: ${count} requests`);
    });

  console.log(`\n🔍 Expected Monitoring Behavior:`);
  console.log(`   • Monitor should detect ~${stats.byType.anomaly} anomalous requests`);
  console.log(`   • Should filter out ~${stats.byType.normal} normal requests`);
  console.log(`   • May flag ~${stats.byType.suspicious} suspicious requests`);
  console.log(`   • AI should analyze only anomalous subset (${Math.round(stats.byType.anomaly / 100 * 100)}% reduction)`);
  
  console.log('\n' + '='.repeat(80) + '\n');
}

attack();

// Made with Bob

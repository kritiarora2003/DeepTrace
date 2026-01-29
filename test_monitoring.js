// Test script for the real-time monitoring system
// Verifies filtering, batching, and anomaly detection

const monitor = require('./monitor');
const batchProcessor = require('./utils/batch_processor');
const dataSources = require('./services/data_sources');

console.log('\n' + '='.repeat(80));
console.log('🧪 DEEPTRACE MONITORING SYSTEM TEST');
console.log('='.repeat(80));

async function testAnomalyDetection() {
  console.log('\n📋 Test 1: Anomaly Detection');
  console.log('-'.repeat(80));
  
  try {
    // Test metric anomaly detection
    const metricCheck = monitor.detectMetricAnomalies();
    console.log(`✅ Metric anomaly detection: ${metricCheck.anomalies.length} anomalies found`);
    console.log(`   • Has anomalies: ${metricCheck.hasAnomalies}`);
    console.log(`   • Window: ${metricCheck.window.start} to ${metricCheck.window.end}`);
    
    // Test log anomaly detection
    const logCheck = monitor.detectLogAnomalies();
    console.log(`✅ Log anomaly detection: ${logCheck.large_payloads.length} large payloads, ${logCheck.error_count} errors`);
    console.log(`   • Has anomalies: ${logCheck.hasAnomalies}`);
    
    return { metricCheck, logCheck };
  } catch (error) {
    console.error(`❌ Test 1 failed: ${error.message}`);
    return null;
  }
}

async function testLogFiltering() {
  console.log('\n📋 Test 2: Log Filtering');
  console.log('-'.repeat(80));
  
  try {
    const window = {
      start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };
    
    // Get all logs
    const allLogs = dataSources.applicationLogs.query({
      startTime: window.start,
      endTime: window.end
    });
    
    // Filter to anomalous logs
    const anomalousLogs = monitor.filterAnomalousLogs(window);
    
    const reductionPercent = ((1 - anomalousLogs.length / allLogs.length) * 100).toFixed(1);
    
    console.log(`✅ Log filtering:`);
    console.log(`   • Total logs: ${allLogs.length}`);
    console.log(`   • Anomalous logs: ${anomalousLogs.length}`);
    console.log(`   • Reduction: ${reductionPercent}%`);
    console.log(`   • Filtered out: ${allLogs.length - anomalousLogs.length} normal logs`);
    
    return { allLogs, anomalousLogs, reductionPercent };
  } catch (error) {
    console.error(`❌ Test 2 failed: ${error.message}`);
    return null;
  }
}

async function testBatchProcessing() {
  console.log('\n📋 Test 3: Batch Processing');
  console.log('-'.repeat(80));
  
  try {
    // Create sample logs
    const sampleLogs = [];
    for (let i = 0; i < 347; i++) {
      sampleLogs.push({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        level: i % 10 === 0 ? 'error' : 'info',
        request_size: i % 5 === 0 ? 6000000 : 1000,
        response_time_ms: i % 7 === 0 ? 6000 : 200,
        source_ip: `192.168.1.${i % 255}`
      });
    }
    
    // Test batch creation
    const batches = batchProcessor.createBatches(sampleLogs, 100);
    console.log(`✅ Batch creation:`);
    console.log(`   • Total logs: ${sampleLogs.length}`);
    console.log(`   • Batch size: 100`);
    console.log(`   • Batches created: ${batches.length}`);
    console.log(`   • Last batch size: ${batches[batches.length - 1].logs.length}`);
    
    // Test filtering within batches
    const anomalousCount = sampleLogs.filter(l => 
      l.level === 'error' || l.request_size > 5000000 || l.response_time_ms > 5000
    ).length;
    
    console.log(`✅ Batch filtering:`);
    console.log(`   • Anomalous logs: ${anomalousCount}`);
    console.log(`   • Would process: ${Math.min(anomalousCount, monitor.CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH * monitor.CONFIG.AI_LIMITS.MAX_BATCHES)} logs`);
    console.log(`   • Savings: ${sampleLogs.length - anomalousCount} logs not sent to AI`);
    
    return { batches, sampleLogs, anomalousCount };
  } catch (error) {
    console.error(`❌ Test 3 failed: ${error.message}`);
    return null;
  }
}

async function testConfiguration() {
  console.log('\n📋 Test 4: Configuration Validation');
  console.log('-'.repeat(80));
  
  try {
    const config = monitor.CONFIG;
    
    console.log(`✅ Configuration loaded:`);
    console.log(`   • Check interval: ${config.CHECK_INTERVAL_MS / 1000}s`);
    console.log(`   • Anomaly window: ${config.ANOMALY_WINDOW_MINUTES} minutes`);
    console.log(`   • Min anomalies to alert: ${config.THRESHOLDS.MIN_ANOMALIES_TO_ALERT}`);
    console.log(`   • Max logs per batch: ${config.AI_LIMITS.MAX_LOGS_PER_BATCH}`);
    console.log(`   • Max batches: ${config.AI_LIMITS.MAX_BATCHES}`);
    console.log(`   • Total max logs to AI: ${config.AI_LIMITS.MAX_LOGS_PER_BATCH * config.AI_LIMITS.MAX_BATCHES}`);
    
    // Validate thresholds
    const validations = [
      { name: 'CPU multiplier', value: config.THRESHOLDS.CPU_MULTIPLIER, min: 1.5, max: 5 },
      { name: 'Memory multiplier', value: config.THRESHOLDS.MEMORY_MULTIPLIER, min: 1.5, max: 5 },
      { name: 'Response time multiplier', value: config.THRESHOLDS.RESPONSE_TIME_MULTIPLIER, min: 2, max: 10 },
      { name: 'Error rate multiplier', value: config.THRESHOLDS.ERROR_RATE_MULTIPLIER, min: 5, max: 20 }
    ];
    
    console.log(`\n✅ Threshold validation:`);
    validations.forEach(v => {
      const valid = v.value >= v.min && v.value <= v.max;
      console.log(`   • ${v.name}: ${v.value} ${valid ? '✓' : '✗ (out of range)'}`);
    });
    
    return { config, validations };
  } catch (error) {
    console.error(`❌ Test 4 failed: ${error.message}`);
    return null;
  }
}

async function testDataSources() {
  console.log('\n📋 Test 5: Data Source Connectivity');
  console.log('-'.repeat(80));
  
  try {
    const window = {
      start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };
    
    // Test each data source
    const appLogs = dataSources.applicationLogs.query({
      startTime: window.start,
      endTime: window.end
    });
    console.log(`✅ Application logs: ${appLogs.length} logs available`);
    
    const metrics = dataSources.metrics.query({
      startTime: window.start,
      endTime: window.end
    });
    console.log(`✅ Metrics: ${metrics.length} data points available`);
    
    const gatewayLogs = dataSources.apiGatewayLogs.query({
      startTime: window.start,
      endTime: window.end
    });
    console.log(`✅ API Gateway logs: ${gatewayLogs.length} logs available`);
    
    const k8sEvents = dataSources.kubernetesEvents.query({
      startTime: window.start,
      endTime: window.end
    });
    console.log(`✅ Kubernetes events: ${k8sEvents.length} events available`);
    
    const baseline = dataSources.metrics.getBaseline({ service: 'search-api' });
    console.log(`✅ Baseline metrics: ${baseline ? 'Available' : 'Not available'}`);
    if (baseline) {
      console.log(`   • CPU baseline: ${baseline.cpu_percent.toFixed(1)}%`);
      console.log(`   • Memory baseline: ${baseline.memory_percent.toFixed(1)}%`);
      console.log(`   • Error rate baseline: ${(baseline.error_rate * 100).toFixed(2)}%`);
    }
    
    return { appLogs, metrics, gatewayLogs, k8sEvents, baseline };
  } catch (error) {
    console.error(`❌ Test 5 failed: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting comprehensive monitoring system tests...\n');
  
  const results = {
    anomalyDetection: await testAnomalyDetection(),
    logFiltering: await testLogFiltering(),
    batchProcessing: await testBatchProcessing(),
    configuration: await testConfiguration(),
    dataSources: await testDataSources()
  };
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const testsPassed = Object.values(results).filter(r => r !== null).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n✅ Tests passed: ${testsPassed}/${totalTests}`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 All tests passed! Monitoring system is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the MCP server: node mcp_server.js');
    console.log('   2. Start the monitor: node monitor.js');
    console.log('   3. Simulate an attack: node attacker.js');
    console.log('   4. Watch the monitor detect and investigate automatically');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('\n' + '='.repeat(80));
  
  return results;
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = {
  testAnomalyDetection,
  testLogFiltering,
  testBatchProcessing,
  testConfiguration,
  testDataSources,
  runAllTests
};

// Made with Bob

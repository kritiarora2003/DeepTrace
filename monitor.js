// Real-time Anomaly Monitoring Service
// Continuously monitors metrics and triggers investigation only when anomalies detected

const dataSources = require('./services/data_sources');
const liveDataSource = require('./services/live_data_source');
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MCP_URL = "http://localhost:3000";

// Configuration
const CONFIG = {
  // Monitoring intervals
  CHECK_INTERVAL_MS: 60000, // Check every 1 minute
  ANOMALY_WINDOW_MINUTES: 5, // Look at last 5 minutes of data
  
  // Anomaly thresholds
  THRESHOLDS: {
    CPU_MULTIPLIER: 2.0,        // Alert if CPU > 2x baseline
    MEMORY_MULTIPLIER: 2.0,     // Alert if memory > 2x baseline
    RESPONSE_TIME_MULTIPLIER: 5.0, // Alert if response time > 5x baseline
    ERROR_RATE_MULTIPLIER: 10.0,   // Alert if error rate > 10x baseline
    LARGE_PAYLOAD_SIZE: 5000000,   // 5MB threshold
    MIN_ANOMALIES_TO_ALERT: 3      // Need at least 3 anomalies to trigger
  },
  
  // AI inference limits
  AI_LIMITS: {
    MAX_LOGS_PER_BATCH: 100,    // Process max 100 logs per AI call
    MAX_BATCHES: 5,              // Max 5 batches (500 logs total)
    ONLY_ANOMALOUS_LOGS: true    // Only send anomalous logs to AI
  },
  
  // Use live data from request_logs.jsonl instead of static JSON files
  // Set to false to use pre-generated attack dataset with known anomalies
  USE_LIVE_DATA: true
};

/**
 * Get the time window for anomaly detection
 */
function getAnomalyWindow() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - CONFIG.ANOMALY_WINDOW_MINUTES * 60 * 1000);
  
  return {
    start: startTime.toISOString(),
    end: endTime.toISOString()
  };
}

/**
 * Check for metric anomalies in the recent time window
 */
function detectMetricAnomalies() {
  let window;
  
  if (CONFIG.USE_LIVE_DATA) {
    // Use sliding window for live data
    window = getAnomalyWindow();
  } else {
    // Use attack time window from pre-generated dataset
    window = {
      start: "2026-01-29T14:15:00.000Z",
      end: "2026-01-29T14:30:00.000Z"
    };
  }
  
  console.log(`\n🔍 Checking metrics from ${window.start} to ${window.end}`);
  
  const anomalies = dataSources.metrics.detectAnomalies({
    startTime: window.start,
    endTime: window.end,
    service: 'search-api'
  });
  
  return {
    anomalies,
    window,
    hasAnomalies: anomalies.length >= CONFIG.THRESHOLDS.MIN_ANOMALIES_TO_ALERT
  };
}

/**
 * Check for log anomalies (large payloads, high error rates)
 */
function detectLogAnomalies() {
  let window;
  
  if (CONFIG.USE_LIVE_DATA) {
    window = getAnomalyWindow();
  } else {
    // Use attack time window from pre-generated dataset
    window = {
      start: "2026-01-29T14:15:00.000Z",
      end: "2026-01-29T14:30:00.000Z"
    };
  }
  
  if (CONFIG.USE_LIVE_DATA) {
    // Use live data from request_logs.jsonl
    const largePayloads = liveDataSource.detectLiveAnomalies({
      startTime: window.start,
      endTime: window.end,
      threshold: CONFIG.THRESHOLDS.LARGE_PAYLOAD_SIZE
    });
    
    const errorLogs = liveDataSource.queryLiveLogs({
      startTime: window.start,
      endTime: window.end,
      level: 'error'
    });
    
    return {
      large_payloads: largePayloads,
      error_count: errorLogs.length,
      window,
      hasAnomalies: largePayloads.length > 0 || errorLogs.length > 5
    };
  } else {
    // Use static JSON files
    const largePayloads = dataSources.applicationLogs.detectAnomalies({
      startTime: window.start,
      endTime: window.end,
      threshold: CONFIG.THRESHOLDS.LARGE_PAYLOAD_SIZE
    });
    
    const errorLogs = dataSources.applicationLogs.query({
      startTime: window.start,
      endTime: window.end,
      level: 'error'
    });
    
    return {
      large_payloads: largePayloads,
      error_count: errorLogs.length,
      window,
      hasAnomalies: largePayloads.length > 0 || errorLogs.length > 10
    };
  }
}

/**
 * Filter logs to only include anomalous entries
 */
function filterAnomalousLogs(window) {
  if (CONFIG.USE_LIVE_DATA) {
    // Use live data
    const errorLogs = liveDataSource.queryLiveLogs({
      startTime: window.start,
      endTime: window.end,
      level: 'error'
    });
    
    const largePayloadLogs = liveDataSource.detectLiveAnomalies({
      startTime: window.start,
      endTime: window.end,
      threshold: CONFIG.THRESHOLDS.LARGE_PAYLOAD_SIZE
    });
    
    // Combine and deduplicate
    const anomalousLogs = [...errorLogs];
    const errorTimestamps = new Set(errorLogs.map(l => l.timestamp));
    
    largePayloadLogs.forEach(log => {
      if (!errorTimestamps.has(log.timestamp)) {
        anomalousLogs.push(log);
      }
    });
    
    anomalousLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return anomalousLogs;
  } else {
    // Use static data
    const errorLogs = dataSources.applicationLogs.query({
      startTime: window.start,
      endTime: window.end,
      level: 'error'
    });
    
    const largePayloadLogs = dataSources.applicationLogs.detectAnomalies({
      startTime: window.start,
      endTime: window.end,
      threshold: CONFIG.THRESHOLDS.LARGE_PAYLOAD_SIZE
    });
  
    // Combine and deduplicate by timestamp
    const anomalousLogs = [...errorLogs];
    const errorTimestamps = new Set(errorLogs.map(l => l.timestamp));
    
    largePayloadLogs.forEach(log => {
      if (!errorTimestamps.has(log.timestamp)) {
        anomalousLogs.push(log);
      }
    });
    
    // Sort by timestamp
    anomalousLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return anomalousLogs;
  }
}

/**
 * Batch process logs for AI inference
 */
function batchLogs(logs) {
  const batches = [];
  const maxLogs = CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH * CONFIG.AI_LIMITS.MAX_BATCHES;
  
  // Limit total logs
  const logsToProcess = logs.slice(0, maxLogs);
  
  // Split into batches
  for (let i = 0; i < logsToProcess.length; i += CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH) {
    batches.push(logsToProcess.slice(i, i + CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH));
  }
  
  return batches;
}

/**
 * Trigger investigation agent with filtered data
 */
async function triggerInvestigation(metricAnomalies, logAnomalies, window) {
  console.log('\n' + '='.repeat(80));
  console.log('🚨 ANOMALY DETECTED - TRIGGERING INVESTIGATION');
  console.log('='.repeat(80));
  console.log(`\n📊 Anomaly Summary:`);
  console.log(`   • Metric Anomalies: ${metricAnomalies.anomalies.length}`);
  console.log(`   • Large Payloads: ${logAnomalies.large_payloads.length}`);
  console.log(`   • Error Logs: ${logAnomalies.error_count}`);
  console.log(`   • Time Window: ${window.start} to ${window.end}`);
  
  try {
    // Step 1: Fetch timeline (only for anomaly window)
    console.log('\n📍 Step 1: Fetching incident timeline...');
    const timelineResult = await fetch(`${MCP_URL}/tools/fetch_incident_timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: window.start,
        end_time: window.end,
        sources: ['all']
      })
    });
    const timeline = await timelineResult.json();
    console.log(`   ✅ Timeline built: ${timeline.summary?.total_events || 0} events`);
    
    // Step 2: Filter and batch logs for AI analysis
    console.log('\n📍 Step 2: Filtering anomalous logs for AI analysis...');
    const anomalousLogs = filterAnomalousLogs(window);
    console.log(`   • Total logs in window: ${dataSources.applicationLogs.query({
      startTime: window.start,
      endTime: window.end
    }).length}`);
    console.log(`   • Filtered to anomalous logs: ${anomalousLogs.length}`);
    
    const batches = batchLogs(anomalousLogs);
    console.log(`   • Split into ${batches.length} batches for AI processing`);
    
    // Process first batch only (or aggregate results from multiple batches)
    if (batches.length > 0) {
      console.log(`   • Processing batch 1 of ${batches.length} (${batches[0].length} logs)...`);
      
      const logAnalysisResult = await fetch(`${MCP_URL}/tools/analyze_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_range: window,
          log_level: 'error', // Focus on errors
          limit: CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH
        })
      });
      const logAnalysis = await logAnalysisResult.json();
      console.log(`   ✅ AI Analysis: ${logAnalysis.ai_analysis?.attack_type || 'Unknown attack'}`);
      
      // Step 3: Root cause analysis
      console.log('\n📍 Step 3: Identifying root cause...');
      const rootCauseResult = await fetch(`${MCP_URL}/tools/identify_root_cause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: `INC-${Date.now()}`,
          include_metrics: true,
          include_logs: true,
          time_range: window
        })
      });
      const rootCause = await rootCauseResult.json();
      console.log(`   ✅ Root Cause: ${rootCause.root_cause}`);
      
      // Step 4: Generate remediation
      console.log('\n📍 Step 4: Generating remediation plan...');
      const remediationResult = await fetch(`${MCP_URL}/tools/suggest_remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root_cause: rootCause.root_cause,
          attack_type: logAnalysis.ai_analysis?.attack_type || 'Unknown',
          severity: 'critical',
          include_commands: true
        })
      });
      const remediation = await remediationResult.json();
      console.log(`   ✅ Remediation plan generated`);
      
      // Display summary
      console.log('\n' + '='.repeat(80));
      console.log('📋 INVESTIGATION COMPLETE');
      console.log('='.repeat(80));
      console.log(`\n🎯 Attack Type: ${logAnalysis.ai_analysis?.attack_type || 'Unknown'}`);
      console.log(`🔍 Root Cause: ${rootCause.root_cause}`);
      console.log(`\n🚨 IMMEDIATE ACTIONS:`);
      remediation.immediate_actions?.slice(0, 3).forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.action}`);
      });
      
      return {
        timeline,
        logAnalysis,
        rootCause,
        remediation,
        anomaly_window: window
      };
    }
    
  } catch (error) {
    console.error(`\n❌ Investigation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main monitoring loop
 */
async function startMonitoring() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 DEEPTRACE REAL-TIME ANOMALY MONITOR');
  console.log('='.repeat(80));
  console.log(`\n⚙️  Configuration:`);
  console.log(`   • Data Source: ${CONFIG.USE_LIVE_DATA ? 'Live (request_logs.jsonl)' : 'Pre-generated dataset'}`);
  console.log(`   • Check Interval: ${CONFIG.CHECK_INTERVAL_MS / 1000}s`);
  console.log(`   • Anomaly Window: ${CONFIG.USE_LIVE_DATA ? CONFIG.ANOMALY_WINDOW_MINUTES + ' minutes' : 'Attack window (14:15-14:30)'}`);
  console.log(`   • Min Anomalies to Alert: ${CONFIG.THRESHOLDS.MIN_ANOMALIES_TO_ALERT}`);
  console.log(`   • Max Logs per AI Batch: ${CONFIG.AI_LIMITS.MAX_LOGS_PER_BATCH}`);
  console.log(`   • Filter Anomalous Logs Only: ${CONFIG.AI_LIMITS.ONLY_ANOMALOUS_LOGS}`);
  console.log('\n👀 Monitoring started. Press Ctrl+C to stop.\n');
  
  let checkCount = 0;
  
  const check = async () => {
    checkCount++;
    console.log(`\n[${'='.repeat(78)}]`);
    console.log(`Check #${checkCount} at ${new Date().toISOString()}`);
    console.log(`[${'='.repeat(78)}]`);
    
    try {
      // Check for metric anomalies
      const metricCheck = detectMetricAnomalies();
      console.log(`   • Metric anomalies: ${metricCheck.anomalies.length}`);
      
      // Check for log anomalies
      const logCheck = detectLogAnomalies();
      console.log(`   • Large payloads: ${logCheck.large_payloads.length}`);
      console.log(`   • Error logs: ${logCheck.error_count}`);
      
      // Trigger investigation if anomalies detected
      if (metricCheck.hasAnomalies || logCheck.hasAnomalies) {
        console.log('\n⚠️  ANOMALIES DETECTED - Triggering investigation...');
        await triggerInvestigation(metricCheck, logCheck, metricCheck.window);
      } else {
        console.log('\n✅ No anomalies detected - System healthy');
      }
      
    } catch (error) {
      console.error(`\n❌ Monitoring check failed: ${error.message}`);
    }
  };
  
  // Run first check immediately
  await check();
  
  // Then run on interval
  setInterval(check, CONFIG.CHECK_INTERVAL_MS);
}

// Export for testing
module.exports = {
  startMonitoring,
  detectMetricAnomalies,
  detectLogAnomalies,
  filterAnomalousLogs,
  batchLogs,
  CONFIG
};

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('\n❌ Monitor failed to start:', error.message);
    process.exit(1);
  });
}

// Made with Bob

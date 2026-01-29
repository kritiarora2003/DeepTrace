// Batch Processing Utility
// Handles large volumes of logs by processing them in batches to avoid overwhelming the AI

const aiService = require('../services/ai_service');

/**
 * Split logs into batches
 */
function createBatches(logs, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < logs.length; i += batchSize) {
    batches.push({
      batch_number: Math.floor(i / batchSize) + 1,
      logs: logs.slice(i, i + batchSize),
      start_index: i,
      end_index: Math.min(i + batchSize, logs.length)
    });
  }
  return batches;
}

/**
 * Process logs in batches with AI analysis
 */
async function processBatchedLogs(logs, errorPatterns, options = {}) {
  const {
    batchSize = 100,
    maxBatches = 5,
    filterAnomalous = true,
    delayBetweenBatches = 1000 // 1 second delay to avoid overwhelming AI
  } = options;

  console.log(`\n📦 Batch Processing Configuration:`);
  console.log(`   • Total logs: ${logs.length}`);
  console.log(`   • Batch size: ${batchSize}`);
  console.log(`   • Max batches: ${maxBatches}`);
  console.log(`   • Filter anomalous: ${filterAnomalous}`);

  // Filter to anomalous logs first if requested
  let logsToProcess = logs;
  if (filterAnomalous) {
    logsToProcess = logs.filter(l => 
      l.level === 'error' || 
      l.request_size > 5000000 ||
      l.response_time_ms > 5000
    );
    console.log(`   • Filtered to ${logsToProcess.length} anomalous logs`);
  }

  // Create batches
  const batches = createBatches(logsToProcess, batchSize);
  const batchesToProcess = batches.slice(0, maxBatches);
  
  console.log(`   • Created ${batches.length} batches`);
  console.log(`   • Processing ${batchesToProcess.length} batches\n`);

  const results = [];
  const aggregatedStats = {
    total_logs_processed: 0,
    total_errors: 0,
    unique_ips: new Set(),
    attack_types: new Set(),
    batch_count: batchesToProcess.length
  };

  // Process each batch
  for (const batch of batchesToProcess) {
    console.log(`📦 Processing batch ${batch.batch_number}/${batchesToProcess.length} (${batch.logs.length} logs)...`);
    
    try {
      // Analyze this batch
      const batchAnalysis = await aiService.analyzeLogsForPatterns(
        batch.logs,
        errorPatterns,
        {
          filterAnomalous: false, // Already filtered
          maxLogs: batch.logs.length,
          batchSize: batch.logs.length
        }
      );

      results.push({
        batch_number: batch.batch_number,
        logs_in_batch: batch.logs.length,
        analysis: batchAnalysis
      });

      // Aggregate statistics
      aggregatedStats.total_logs_processed += batch.logs.length;
      aggregatedStats.total_errors += batch.logs.filter(l => l.level === 'error').length;
      batch.logs.forEach(l => aggregatedStats.unique_ips.add(l.source_ip));
      if (batchAnalysis.attack_type) {
        aggregatedStats.attack_types.add(batchAnalysis.attack_type);
      }

      console.log(`   ✅ Batch ${batch.batch_number} complete: ${batchAnalysis.attack_type || 'No attack detected'}`);

      // Delay between batches to avoid overwhelming the AI service
      if (batch.batch_number < batchesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }

    } catch (error) {
      console.error(`   ❌ Batch ${batch.batch_number} failed: ${error.message}`);
      results.push({
        batch_number: batch.batch_number,
        logs_in_batch: batch.logs.length,
        error: error.message
      });
    }
  }

  // Aggregate results from all batches
  const aggregatedAnalysis = aggregateResults(results);

  return {
    batch_results: results,
    aggregated_analysis: aggregatedAnalysis,
    statistics: {
      ...aggregatedStats,
      unique_ips: aggregatedStats.unique_ips.size,
      attack_types: Array.from(aggregatedStats.attack_types),
      batches_processed: results.filter(r => !r.error).length,
      batches_failed: results.filter(r => r.error).length
    },
    metadata: {
      total_logs_in_window: logs.length,
      logs_after_filtering: logsToProcess.length,
      batches_created: batches.length,
      batches_processed: batchesToProcess.length,
      filtering_enabled: filterAnomalous
    }
  };
}

/**
 * Aggregate results from multiple batches
 */
function aggregateResults(batchResults) {
  const successfulBatches = batchResults.filter(r => !r.error && r.analysis);
  
  if (successfulBatches.length === 0) {
    return {
      attack_type: 'Unknown',
      characteristics: 'Unable to analyze - all batches failed',
      impact: 'Unknown',
      confidence: 0
    };
  }

  // Find the most common attack type
  const attackTypes = {};
  successfulBatches.forEach(batch => {
    const type = batch.analysis.attack_type || 'Unknown';
    attackTypes[type] = (attackTypes[type] || 0) + 1;
  });

  const mostCommonAttack = Object.entries(attackTypes)
    .sort((a, b) => b[1] - a[1])[0];

  // Average confidence across batches
  const avgConfidence = successfulBatches.reduce((sum, batch) => 
    sum + (batch.analysis.confidence || 0), 0
  ) / successfulBatches.length;

  // Combine characteristics
  const characteristics = successfulBatches
    .map(b => b.analysis.characteristics)
    .filter(c => c)
    .join('; ');

  // Combine impacts
  const impacts = successfulBatches
    .map(b => b.analysis.impact)
    .filter(i => i)
    .join('; ');

  return {
    attack_type: mostCommonAttack[0],
    attack_type_frequency: mostCommonAttack[1],
    characteristics: characteristics || 'Multiple attack patterns detected',
    impact: impacts || 'Service degradation detected',
    confidence: avgConfidence,
    batches_analyzed: successfulBatches.length
  };
}

/**
 * Smart batch processing - automatically determines optimal batch size
 */
async function smartBatchProcess(logs, errorPatterns, options = {}) {
  const {
    maxBatches = 5,
    filterAnomalous = true,
    targetLogsPerBatch = 100
  } = options;

  // Filter first if requested
  let logsToProcess = logs;
  if (filterAnomalous) {
    logsToProcess = logs.filter(l => 
      l.level === 'error' || 
      l.request_size > 5000000 ||
      l.response_time_ms > 5000
    );
  }

  // Calculate optimal batch size
  const totalLogs = logsToProcess.length;
  const optimalBatchSize = Math.ceil(totalLogs / maxBatches);
  const batchSize = Math.min(optimalBatchSize, targetLogsPerBatch);

  console.log(`\n🧠 Smart Batch Processing:`);
  console.log(`   • Total logs: ${totalLogs}`);
  console.log(`   • Optimal batch size: ${batchSize}`);
  console.log(`   • Estimated batches: ${Math.ceil(totalLogs / batchSize)}`);

  return processBatchedLogs(logs, errorPatterns, {
    batchSize,
    maxBatches,
    filterAnomalous: false, // Already filtered
    delayBetweenBatches: 1000
  });
}

module.exports = {
  createBatches,
  processBatchedLogs,
  smartBatchProcess,
  aggregateResults
};

// Made with Bob

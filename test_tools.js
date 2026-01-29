// Test script to verify all MCP tools work correctly
const { tools } = require('./tools');

console.log('🧪 Testing DeepTrace MCP Tools\n');
console.log('='.repeat(80));

async function testTools() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: fetch_incident_timeline
  console.log('\n📍 Test 1: fetch_incident_timeline');
  try {
    const result = await tools.fetch_incident_timeline.execute({
      start_time: "2026-01-29T14:00:00.000Z",
      end_time: "2026-01-29T14:35:00.000Z",
      sources: ["all"]
    });
    
    if (result.timeline && result.timeline.length > 0) {
      console.log('✅ PASSED');
      console.log(`   • Timeline events: ${result.timeline.length}`);
      console.log(`   • Attack patterns: ${result.attack_patterns?.length || 0}`);
      console.log(`   • Critical events: ${result.summary?.by_severity?.critical || 0}`);
      results.passed++;
      results.tests.push({ name: 'fetch_incident_timeline', status: 'PASSED' });
    } else {
      throw new Error('No timeline events returned');
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'fetch_incident_timeline', status: 'FAILED', error: error.message });
  }

  // Test 2: analyze_logs
  console.log('\n📍 Test 2: analyze_logs');
  try {
    const result = await tools.analyze_logs.execute({
      time_range: {
        start: "2026-01-29T14:00:00.000Z",
        end: "2026-01-29T14:35:00.000Z"
      },
      log_level: "all",
      limit: 500
    });
    
    if (result.patterns && result.statistics) {
      console.log('✅ PASSED');
      console.log(`   • Logs analyzed: ${result.statistics.total_logs}`);
      console.log(`   • Error patterns: ${result.patterns.length}`);
      console.log(`   • Anomalies detected: ${result.anomalies?.length || 0}`);
      console.log(`   • AI confidence: ${result.ai_analysis?.confidence ? (result.ai_analysis.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      results.passed++;
      results.tests.push({ name: 'analyze_logs', status: 'PASSED' });
    } else {
      throw new Error('Missing patterns or statistics');
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'analyze_logs', status: 'FAILED', error: error.message });
  }

  // Test 3: identify_root_cause
  console.log('\n📍 Test 3: identify_root_cause');
  try {
    const result = await tools.identify_root_cause.execute({
      incident_id: "TEST-001",
      include_metrics: true,
      include_logs: true
    });
    
    if (result.root_cause && result.confidence_score !== undefined) {
      console.log('✅ PASSED');
      console.log(`   • Root cause: ${result.root_cause.substring(0, 60)}...`);
      console.log(`   • Attack type: ${result.attack_type}`);
      console.log(`   • Confidence: ${(result.confidence_score * 100).toFixed(1)}%`);
      console.log(`   • Evidence items: ${result.evidence?.length || 0}`);
      results.passed++;
      results.tests.push({ name: 'identify_root_cause', status: 'PASSED' });
    } else {
      throw new Error('Missing root cause or confidence score');
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'identify_root_cause', status: 'FAILED', error: error.message });
  }

  // Test 4: suggest_remediation
  console.log('\n📍 Test 4: suggest_remediation');
  try {
    const result = await tools.suggest_remediation.execute({
      root_cause: "Missing input validation on /api/search endpoint",
      attack_type: "JSON Payload Bomb",
      severity: "critical",
      include_commands: true
    });
    
    if (result.immediate_actions && result.short_term_fixes && result.long_term_improvements) {
      console.log('✅ PASSED');
      console.log(`   • Immediate actions: ${result.immediate_actions.length}`);
      console.log(`   • Short-term fixes: ${result.short_term_fixes.length}`);
      console.log(`   • Long-term improvements: ${result.long_term_improvements.length}`);
      console.log(`   • Monitoring recommendations: ${result.monitoring_recommendations?.length || 0}`);
      results.passed++;
      results.tests.push({ name: 'suggest_remediation', status: 'PASSED' });
    } else {
      throw new Error('Missing remediation actions');
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'suggest_remediation', status: 'FAILED', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${results.passed}/4`);
  console.log(`❌ Failed: ${results.failed}/4`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! DeepTrace MCP server is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  return results;
}

// Run tests
testTools().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Made with Bob

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

  // Test 5: fetch_incident_timeline with invalid time range
  console.log('\n📍 Test 5: fetch_incident_timeline (invalid time range)');
  try {
    await tools.fetch_incident_timeline.execute({
      start_time: "2026-01-29T14:35:00.000Z",
      end_time: "2026-01-29T14:00:00.000Z",
      sources: ["all"]
    });
    console.log('❌ FAILED: Should have thrown error for invalid time range');
    results.failed++;
    results.tests.push({ name: 'fetch_incident_timeline_invalid_time', status: 'FAILED', error: 'No error thrown' });
  } catch (error) {
    console.log('✅ PASSED (caught error):', error.message);
    console.log(`   • Error type: ${error.name}`);
    console.log(`   • Message: ${error.message}`);
    results.passed++;
    results.tests.push({ name: 'fetch_incident_timeline_invalid_time', status: 'PASSED' });
  }

  // Test 6: suggest_remediation with missing required fields
  console.log('\n📍 Test 6: suggest_remediation (missing required fields)');
  try {
    await tools.suggest_remediation.execute({
      // Missing root_cause and attack_type
      severity: "critical",
      include_commands: true
    });
    console.log('❌ FAILED: Should have thrown error for missing fields');
    results.failed++;
    results.tests.push({ name: 'suggest_remediation_missing_fields', status: 'FAILED', error: 'No error thrown' });
  } catch (error) {
    console.log('✅ PASSED (caught error):', error.message);
    console.log(`   • Error type: ${error.name}`);
    console.log(`   • Message: ${error.message}`);
    results.passed++;
    results.tests.push({ name: 'suggest_remediation_missing_fields', status: 'PASSED' });
  }

  // Test 7: fetch_incident_timeline with missing required fields
  console.log('\n📍 Test 7: fetch_incident_timeline (missing required fields)');
  try {
    await tools.fetch_incident_timeline.execute({
      // Missing start_time and sources
      end_time: "2026-01-29T14:35:00.000Z"
    });
    console.log('❌ FAILED: Should have thrown error for missing fields');
    results.failed++;
    results.tests.push({ name: 'fetch_incident_timeline_missing_fields', status: 'FAILED', error: 'No error thrown' });
  } catch (error) {
    console.log('✅ PASSED (caught error):', error.message);
    console.log(`   • Error type: ${error.name}`);
    console.log(`   • Message: ${error.message}`);
    results.passed++;
    results.tests.push({ name: 'fetch_incident_timeline_missing_fields', status: 'PASSED' });
  }

  // Test 8: analyze_logs with invalid log_level
  console.log('\n📍 Test 8: analyze_logs (invalid log_level)');
  try {
    await tools.analyze_logs.execute({
      time_range: {
        start: "2026-01-29T14:00:00.000Z",
        end: "2026-01-29T14:35:00.000Z"
      },
      log_level: "INVALID_LEVEL",
      limit: 100
    });
    console.log('❌ FAILED: Should have thrown error for invalid log_level');
    results.failed++;
    results.tests.push({ name: 'analyze_logs_invalid_log_level', status: 'FAILED', error: 'No error thrown' });
  } catch (error) {
    console.log('✅ PASSED (caught error):', error.message);
    console.log(`   • Error type: ${error.name}`);
    console.log(`   • Message: ${error.message}`);
    results.passed++;
    results.tests.push({ name: 'analyze_logs_invalid_log_level', status: 'PASSED' });
  }

  console.log('\n📍 Test 9: Timeline event structure');
  try {
    const result = await tools.fetch_incident_timeline.execute({
      start_time: "2026-01-29T14:00:00.000Z",
      end_time: "2026-01-29T14:35:00.000Z",
      sources: ["all"]
    });

    const event = result.timeline[0];
    if (!event.timestamp || !event.source || !event.event_type) {
      throw new Error("Timeline event missing required fields");
    }
    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'timeline_structure', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'timeline_structure', status: 'FAILED', error: error.message });
  }

  console.log('\n📍 Test 10: AI confidence sanity');
  try {
    const result = await tools.analyze_logs.execute({
      time_range: {
        start: "2026-01-29T14:00:00.000Z",
        end: "2026-01-29T14:35:00.000Z"
      },
      log_level: "all"
    });

    if (result.ai_analysis.confidence < 0 || result.ai_analysis.confidence > 1) {
      throw new Error("Confidence score out of bounds");
    }

    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'ai_confidence_sanity', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'ai_confidence_sanity', status: 'FAILED', error: error.message });
  }


  console.log('\n📍 Test 11: Root cause vulnerability keyword');
  try {
    const result = await tools.identify_root_cause.execute({
      incident_id: "TEST-002",
      include_metrics: true,
      include_logs: true
    });

    if (!result.root_cause.toLowerCase().includes("validation")) {
      throw new Error("Root cause missing expected vulnerability keyword");
    }

    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'root_cause_keyword', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'root_cause_keyword', status: 'FAILED', error: error.message });
  }

  console.log('\n📍 Test 12: Remediation priority range');
  try {
    const result = await tools.suggest_remediation.execute({
      root_cause: "Missing input validation",
      attack_type: "JSON Payload Bomb",
      severity: "critical"
    });

    const allActions = [
      ...result.immediate_actions,
      ...result.short_term_fixes,
      ...result.long_term_improvements
    ];

    if (allActions.some(a => a.priority < 1 || a.priority > 5)) {
      throw new Error("Invalid priority value detected");
    }

    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'remediation_priority_range', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'remediation_priority_range', status: 'FAILED', error: error.message });
  }

  console.log('\n📍 Test 13: Duplicate remediation detection');
  try {
    const result = await tools.suggest_remediation.execute({
      root_cause: "Missing input validation",
      attack_type: "JSON Payload Bomb",
      severity: "critical"
    });

    const actions = result.immediate_actions.map(a => a.action);
    const duplicates = actions.filter((item, index) => actions.indexOf(item) !== index);

    if (duplicates.length > 0) {
      throw new Error("Duplicate actions detected");
    }

    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'remediation_duplicates', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'remediation_duplicates', status: 'FAILED', error: error.message });
  }

    console.log('\n📍 Test 14: AI raw analysis exists');
  try {
    const result = await tools.analyze_logs.execute({
      time_range: {
        start: "2026-01-29T14:00:00.000Z",
        end: "2026-01-29T14:35:00.000Z"
      }
    });

    if (!result.ai_analysis.raw_analysis || result.ai_analysis.raw_analysis.length < 50) {
      throw new Error("AI raw output too small or missing");
    }

    console.log('✅ PASSED');
    results.passed++;
    results.tests.push({ name: 'ai_raw_output', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'ai_raw_output', status: 'FAILED', error: error.message });
  }

  console.log('\n📍 Test 15: Incident summary generation');
  try {
    const rootCause = {
      root_cause: "Missing input validation on /api/search endpoint",
      attack_type: "JSON Payload Bomb",
      confidence: 0.9
    };

    const remediation = {
      immediate_actions: [{ action: "Block malicious IP" }]
    };

    const summary = await tools.generate_incident_summary.execute({
      rootCauseAnalysis: rootCause,
      remediationPlan: remediation
    });

    if (!summary || summary.length < 40) {
      throw new Error("Summary too short or missing");
    }

    if (!summary.toLowerCase().includes("attack") &&
        !summary.toLowerCase().includes("incident")) {
      throw new Error("Summary lacks incident context");
    }

    console.log('✅ PASSED');
    console.log(`   • Summary preview: ${summary.substring(0, 80)}...`);
    results.passed++;
    results.tests.push({ name: 'incident_summary_quality', status: 'PASSED' });
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    results.failed++;
    results.tests.push({ name: 'incident_summary_quality', status: 'FAILED', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${results.passed}/15`);
  console.log(`❌ Failed: ${results.failed}/15`);
  
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


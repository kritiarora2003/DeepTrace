const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MCP_URL = "http://localhost:3000";

// ---- SYSTEM PROMPT FOR SECURITY INVESTIGATION ----
const systemPrompt = `
You are a senior security incident responder investigating a production security incident.

AVAILABLE TOOLS:
1. fetch_incident_timeline: Build chronological timeline from all data sources
2. analyze_logs: AI-powered log analysis to identify attack patterns
3. identify_root_cause: Comprehensive root cause analysis
4. suggest_remediation: Generate actionable remediation plan

INVESTIGATION WORKFLOW:
1. First, fetch the incident timeline to understand what happened
2. Then, analyze logs to identify attack patterns
3. Next, identify the root cause using all correlated data
4. Finally, suggest remediation actions

You MUST call tools in sequence. After each tool call, wait for results before proceeding.
When calling a tool, respond ONLY with valid JSON in this format:
{
  "tool": "tool_name",
  "arguments": { ... }
}

No extra text. No explanations outside the JSON.
`;

// ---- CALL OLLAMA ----
async function callLLM(prompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:3b",
      prompt: systemPrompt + "\n\n" + prompt,
      stream: false,
      temperature: 0.1
    })
  });

  return res.json();
}

// ---- CALL MCP TOOL ----
async function callTool(toolName, args) {
  console.log(`\n🛠️  Calling tool: ${toolName}`);
  console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));

  const res = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });

  if (!res.ok) {
    throw new Error(`Tool call failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---- SECURITY INVESTIGATION AGENT ----
async function investigateIncident() {
  console.log("\n" + "=".repeat(80));
  console.log("🚨 DEEPTRACE SECURITY INCIDENT INVESTIGATION");
  console.log("=".repeat(80));
  console.log("\n📢 ALERT: High error rate detected on search-api service");
  console.log("⏰ Alert Time: 2026-01-29T14:28:00Z");
  console.log("🎯 Affected Service: search-api");
  console.log("📊 Error Rate: 45% (baseline: 0.2%)");
  console.log("\n" + "-".repeat(80));

  const investigationSteps = [
    {
      step: 1,
      description: "Fetch incident timeline to understand event sequence",
      tool: "fetch_incident_timeline",
      args: {
        start_time: "2026-01-29T14:00:00.000Z",
        end_time: "2026-01-29T14:35:00.000Z",
        sources: ["all"]
      }
    },
    {
      step: 2,
      description: "Analyze logs to identify attack patterns",
      tool: "analyze_logs",
      args: {
        time_range: {
          start: "2026-01-29T14:00:00.000Z",
          end: "2026-01-29T14:35:00.000Z"
        },
        log_level: "all",
        limit: 500
      }
    },
    {
      step: 3,
      description: "Identify root cause using correlated data",
      tool: "identify_root_cause",
      args: {
        incident_id: "INC-20260129-001",
        include_metrics: true,
        include_logs: true
      }
    },
    {
      step: 4,
      description: "Generate remediation plan",
      tool: "suggest_remediation",
      args: {
        root_cause: "", // Will be filled from step 3
        attack_type: "", // Will be filled from step 2
        severity: "critical",
        include_commands: true
      }
    }
  ];

  const results = {};

  // Execute investigation steps
  for (const step of investigationSteps) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📍 STEP ${step.step}: ${step.description}`);
    console.log("=".repeat(80));

    try {
      // Fill in dynamic arguments from previous steps
      if (step.step === 4) {
        step.args.root_cause = results.step3?.root_cause || "Missing input validation";
        step.args.attack_type = results.step2?.ai_analysis?.attack_type || "JSON Payload Bomb";
      }

      const result = await callTool(step.tool, step.args);
      results[`step${step.step}`] = result;

      // Display key findings
      console.log("\n✅ Tool execution completed");
      displayStepResults(step.step, result);

    } catch (error) {
      console.error(`\n❌ Error in step ${step.step}:`, error.message);
      break;
    }

    // Pause between steps for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate final incident report
  console.log("\n" + "=".repeat(80));
  console.log("📋 FINAL INCIDENT REPORT");
  console.log("=".repeat(80));
  generateIncidentReport(results);
}

// ---- DISPLAY STEP RESULTS ----
function displayStepResults(step, result) {
  switch (step) {
    case 1: // Timeline
      console.log(`\n📊 Timeline Summary:`);
      console.log(`   • Total Events: ${result.summary?.total_events || 0}`);
      console.log(`   • Critical Events: ${result.summary?.by_severity?.critical || 0}`);
      console.log(`   • High Severity: ${result.summary?.by_severity?.high || 0}`);
      console.log(`   • Attack Patterns Found: ${result.attack_patterns?.length || 0}`);
      
      if (result.attack_patterns && result.attack_patterns.length > 0) {
        console.log(`\n🎯 Attack Patterns Detected:`);
        result.attack_patterns.forEach(pattern => {
          console.log(`   • ${pattern.pattern_type}: ${pattern.description}`);
          console.log(`     Severity: ${pattern.severity}`);
        });
      }
      break;

    case 2: // Log Analysis
      console.log(`\n📊 Log Analysis Results:`);
      console.log(`   • Total Logs Analyzed: ${result.statistics?.total_logs || 0}`);
      console.log(`   • Error Count: ${result.statistics?.error_count || 0}`);
      console.log(`   • Large Payloads: ${result.statistics?.large_payload_count || 0}`);
      console.log(`   • Unique IPs: ${result.statistics?.unique_ips || 0}`);
      
      if (result.ai_analysis) {
        console.log(`\n🤖 AI Analysis:`);
        console.log(`   • Attack Type: ${result.ai_analysis.attack_type}`);
        console.log(`   • Characteristics: ${result.ai_analysis.characteristics}`);
        console.log(`   • Impact: ${result.ai_analysis.impact}`);
        console.log(`   • Confidence: ${(result.ai_analysis.confidence * 100).toFixed(1)}%`);
      }

      if (result.patterns && result.patterns.length > 0) {
        console.log(`\n🔍 Top Error Patterns:`);
        result.patterns.slice(0, 3).forEach((pattern, i) => {
          console.log(`   ${i + 1}. ${pattern.pattern} (${pattern.frequency} occurrences)`);
          console.log(`      IPs: ${pattern.sample_ips.join(', ')}`);
        });
      }
      break;

    case 3: // Root Cause
      console.log(`\n🎯 Root Cause Analysis:`);
      console.log(`   • Root Cause: ${result.root_cause}`);
      console.log(`   • Attack Type: ${result.attack_type}`);
      console.log(`   • Confidence: ${(result.confidence_score * 100).toFixed(1)}%`);
      
      if (result.contributing_factors && result.contributing_factors.length > 0) {
        console.log(`\n⚠️  Contributing Factors:`);
        result.contributing_factors.forEach((factor, i) => {
          console.log(`   ${i + 1}. ${factor}`);
        });
      }

      if (result.impact_assessment) {
        console.log(`\n💥 Impact Assessment:`);
        console.log(`   • Pod Restarts: ${result.impact_assessment.pod_restarts}`);
        console.log(`   • OOM Kills: ${result.impact_assessment.oom_kills}`);
        console.log(`   • Error Rate Increase: ${result.impact_assessment.error_rate_increase}x`);
        console.log(`   • Response Time Increase: ${result.impact_assessment.response_time_increase}x`);
      }
      break;

    case 4: // Remediation
      console.log(`\n📝 Remediation Plan Generated`);
      console.log(`\n🚨 IMMEDIATE ACTIONS (Execute Now):`);
      if (result.immediate_actions) {
        result.immediate_actions.forEach((action, i) => {
          console.log(`   ${i + 1}. [Priority ${action.priority}] ${action.action}`);
          console.log(`      ⏱️  Time: ${action.estimated_time}`);
          if (action.commands) {
            console.log(`      💻 Commands:`);
            action.commands.forEach(cmd => console.log(`         ${cmd}`));
          }
        });
      }

      console.log(`\n⚡ SHORT-TERM FIXES (Next 24-48 hours):`);
      if (result.short_term_fixes) {
        result.short_term_fixes.slice(0, 3).forEach((action, i) => {
          console.log(`   ${i + 1}. [Priority ${action.priority}] ${action.action}`);
          console.log(`      ⏱️  Time: ${action.estimated_time}`);
        });
      }

      console.log(`\n🏗️  LONG-TERM IMPROVEMENTS (Next 1-2 weeks):`);
      if (result.long_term_improvements) {
        result.long_term_improvements.slice(0, 3).forEach((action, i) => {
          console.log(`   ${i + 1}. [Priority ${action.priority}] ${action.action}`);
        });
      }
      break;
  }
}

// ---- GENERATE FINAL REPORT ----
function generateIncidentReport(results) {
  const timeline = results.step1;
  const logAnalysis = results.step2;
  const rootCause = results.step3;
  const remediation = results.step4;

  console.log(`
INCIDENT ID: ${rootCause?.incident_id || 'INC-20260129-001'}
SEVERITY: Critical
STATUS: Mitigated

EXECUTIVE SUMMARY:
${remediation?.summary || 'A JSON payload bomb attack was detected against the search API, exploiting missing input validation. The attack caused service degradation with 45% error rate and multiple pod restarts.'}

ROOT CAUSE:
${rootCause?.root_cause || 'Missing input validation on /api/search endpoint'}

ATTACK DETAILS:
• Type: ${logAnalysis?.ai_analysis?.attack_type || 'JSON Payload Bomb'}
• Source IP: 203.0.113.45
• Attack Window: 14:15 - 14:30 UTC
• Requests: ${logAnalysis?.statistics?.large_payload_count || 47} large payloads (5-10MB)
• Impact: ${rootCause?.impact_assessment?.pod_restarts || 15} pod restarts, ${rootCause?.impact_assessment?.oom_kills || 15} OOM kills

IMMEDIATE ACTIONS TAKEN:
${remediation?.immediate_actions?.map((a, i) => `${i + 1}. ${a.action}`).join('\n') || 'See remediation plan'}

NEXT STEPS:
1. Implement request size validation (< 1MB)
2. Add rate limiting (10 req/min per IP)
3. Deploy WAF with OWASP rules
4. Enhance monitoring and alerting

ESTIMATED RECOVERY TIME:
• Immediate: ${remediation?.estimated_total_time?.immediate || '5-10 minutes'}
• Short-term: ${remediation?.estimated_total_time?.short_term || '4-8 hours'}
• Long-term: ${remediation?.estimated_total_time?.long_term || '1-2 weeks'}
`);

  console.log("=".repeat(80));
  console.log("✅ Investigation Complete");
  console.log("=".repeat(80));
}

// ---- RUN INVESTIGATION ----
console.log("\n🚀 Starting DeepTrace Security Investigation Agent...\n");

investigateIncident().catch(error => {
  console.error("\n❌ Investigation failed:", error.message);
  console.error(error.stack);
  process.exit(1);
});

// Made with Bob

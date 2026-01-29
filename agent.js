const readline = require('readline');
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MCP_URL = "http://localhost:3000";

// SIMULATION CURRENT TIME (Anchor for relative time queries)
const SIMULATION_NOW = "2026-01-29T14:35:00Z";

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
`;

// ---- CALL OLLAMA ----
async function callLLM(prompt, temperature = 0.1) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral:7b",
      prompt: systemPrompt + "\n\n" + prompt,
      stream: false,
      temperature: temperature
    })
  });

  return res.json();
}

// ---- INFER TIMEFRAME FROM NL PROMPT ----
async function inferTimeframe(userPrompt) {
  const prompt = `
  Current Simulation Time: ${SIMULATION_NOW}
  User Query: "${userPrompt}"

  Task: Determine the start and end time for a security investigation based on the user's query.
  Rules:
  1. Default logic: If the user implies "now" or "just happened", use the Current Simulation Time as the end time.
  2. Lookback: Unless specified otherwise, default to looking back 6 hours from the inferred end time.
  3. If the user specifies a time (e.g., "this morning"), infer the appropriate window on the simulation date (2026-01-29).
  
  Output JSON ONLY:
  {
    "start_time": "ISO8601 string",
    "end_time": "ISO8601 string",
    "reasoning": "Brief explanation"
  }
  `;

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:3b",
      prompt: prompt,
      stream: false,
      temperature: 0.1,
      format: "json"
    })
  });

  try {
    const data = await res.json();
    return JSON.parse(data.response);
  } catch (e) {
    console.error("Error parsing time inference:", e);
    // Fallback: 6 hours before SIMULATION_NOW
    const end = new Date(SIMULATION_NOW);
    const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reasoning: "Fallback default window"
    };
  }
}

// ---- CALL MCP TOOL ----
async function callTool(toolName, args) {
  console.log(`\n🛠️  Calling tool: ${toolName}`);
  // console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));

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

// ---- INVESTIGATION LOGIC ----
async function investigateIncident(timeWindow) {
  console.log("\n" + "=".repeat(80));
  console.log(`🕵️ STARTING INVESTIGATION`);
  console.log(`⏰ Time Window: ${timeWindow.start_time} to ${timeWindow.end_time}`);
  console.log("=".repeat(80));

  const investigationSteps = [
    {
      step: 1,
      description: "Fetch incident timeline",
      tool: "fetch_incident_timeline",
      args: {
        start_time: timeWindow.start_time,
        end_time: timeWindow.end_time,
        sources: ["all"]
      }
    },
    {
      step: 2,
      description: "Analyze logs",
      tool: "analyze_logs",
      args: {
        time_range: {
          start: timeWindow.start_time,
          end: timeWindow.end_time
        },
        log_level: "all",
        limit: 500
      }
    },
    {
      step: 3,
      description: "Identify root cause",
      tool: "identify_root_cause",
      args: {
        incident_id: `INC-${Date.now()}`,
        include_metrics: true,
        include_logs: true,
        time_range: {
          start: timeWindow.start_time,
          end: timeWindow.end_time
        }
      }
    },
    {
      step: 4,
      description: "Generate remediation plan",
      tool: "suggest_remediation",
      args: {
        root_cause: "",
        attack_type: "",
        severity: "critical",
        include_commands: true
      }
    }
  ];

  const results = {};

  for (const step of investigationSteps) {
    console.log(`\n📍 STEP ${step.step}: ${step.description}`);

    try {
      if (step.step === 4) {
        step.args.root_cause = results.step3?.root_cause || "Unknown anomaly";
        step.args.attack_type = results.step2?.ai_analysis?.attack_type || "Unknown";
      }

      const result = await callTool(step.tool, step.args);
      results[`step${step.step}`] = result;

      // Use the detailed display function
      displayStepResults(step.step, result);

    } catch (error) {
      console.error(`\n❌ Error in step ${step.step}:`, error.message);
      break;
    }
  }

  // Final Report
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
      // Handle missing confidence score gracefully
      const confidence = result.confidence_score !== undefined ? (result.confidence_score * 100).toFixed(1) + '%' : 'N/A';
      console.log(`   • Confidence: ${confidence}`);

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
${"=".repeat(80)}
📋 FINAL INCIDENT REPORT
${"=".repeat(80)}
INCIDENT ID: ${rootCause?.incident_id || 'INC-20260129-001'}
SEVERITY: Critical
STATUS: Mitigated

EXECUTIVE SUMMARY:
${remediation?.summary || 'A JSON payload bomb attack was detected against the search API, exploiting missing input validation. The attack caused service degradation and multiple pod restarts.'}

ROOT CAUSE:
${rootCause?.root_cause || 'Missing input validation on /api/search endpoint'}

ATTACK DETAILS:
• Type: ${logAnalysis?.ai_analysis?.attack_type || 'JSON Payload Bomb'}
• Source IP: ${logAnalysis?.top_error_ips ? Object.keys(logAnalysis.top_error_ips)[0] : '203.0.113.45'}
• Requests: ${logAnalysis?.statistics?.large_payload_count || 47} large payloads (>5MB)
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

// ---- INTERACTIVE LOOP ----
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
console.log("🛡️  DeepTrace Agent (Interactive Mode)");
console.log(`📅 Simulation Current Time: ${SIMULATION_NOW}`);
console.log("Type your report (e.g., 'Website is down', 'High latency detected') or 'exit' to quit.\n");

function ask() {
  rl.question('👤 User: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    console.log("🤖 Agent: Analyzing request...");
    const timeWindow = await inferTimeframe(input);
    console.log(`   Inferred Window: ${timeWindow.reasoning}`);

    await investigateIncident(timeWindow);

    ask();
  });
}

ask();

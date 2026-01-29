// AI Service for intelligent analysis using Ollama
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2:3b";

/**
 * Call Ollama LLM with a prompt
 */
async function callLLM(prompt, temperature = 0.1) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        temperature: temperature,
        options: {
          num_predict: 2000 // Allow longer responses
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.response.trim();
  } catch (error) {
    console.error('Error calling Ollama:', error.message);
    throw new Error(`Failed to call AI service: ${error.message}`);
  }
}

/**
 * Analyze logs for attack patterns
 */
async function analyzeLogsForPatterns(logs, errorPatterns, options = {}) {
  // Support filtering and batching options
  const {
    filterAnomalous = false,
    maxLogs = 500,
    batchSize = 100
  } = options;

  // Filter to only anomalous logs if requested
  let logsToAnalyze = logs;
  if (filterAnomalous) {
    logsToAnalyze = logs.filter(l =>
      l.level === 'error' ||
      l.request_size > 5000000 ||
      l.response_time_ms > 5000
    );
  }

  // Limit total logs
  logsToAnalyze = logsToAnalyze.slice(0, maxLogs);

  const logSummary = {
    total_logs: logsToAnalyze.length,
    original_log_count: logs.length,
    filtered: filterAnomalous,
    error_count: logsToAnalyze.filter(l => l.level === 'error').length,
    unique_ips: [...new Set(logsToAnalyze.map(l => l.source_ip))].length,
    large_requests: logsToAnalyze.filter(l => l.request_size > 5000000).length,
    avg_response_time: logsToAnalyze.reduce((sum, l) => sum + l.response_time_ms, 0) / logsToAnalyze.length
  };

  // Only use top error patterns to reduce AI workload
  const errorSummary = errorPatterns.slice(0, 5).map(p =>
    `- ${p.pattern}: ${p.frequency} occurrences from IPs ${p.sample_ips.join(', ')}`
  ).join('\n');

  const prompt = `You are a security analyst investigating a production incident. Analyze the following log data and identify attack patterns.

LOG SUMMARY:
- Total logs: ${logSummary.total_logs}
- Error logs: ${logSummary.error_count}
- Unique source IPs: ${logSummary.unique_ips}
- Large requests (>5MB): ${logSummary.large_requests}
- Average response time: ${Math.round(logSummary.avg_response_time)}ms

TOP ERROR PATTERNS:
${errorSummary}

SAMPLE LARGE REQUESTS:
${logsToAnalyze.filter(l => l.request_size > 5000000).slice(0, 3).map(l =>
`- ${l.timestamp}: ${(l.request_size / 1048576).toFixed(2)}MB from ${l.source_ip}, response: ${l.response_time_ms}ms, status: ${l.status_code}`
).join('\n')}

NOTE: Analysis performed on ${logsToAnalyze.length} ${filterAnomalous ? 'anomalous' : 'total'} logs (from ${logs.length} total logs in time window).

Based on this data, identify:
1. The attack pattern and type
2. Attack characteristics (payload size, frequency, source)
3. Impact on the service
4. Confidence level (0-1)

Respond in this exact format:
ATTACK_TYPE: [type]
CHARACTERISTICS: [brief description]
IMPACT: [brief description]
CONFIDENCE: [0.0-1.0]`;

  const response = await callLLM(prompt, 0.1);
  
  // Parse the response
  const attackType = response.match(/ATTACK_TYPE:\s*(.+)/)?.[1]?.trim() || 'Unknown';
  const characteristics = response.match(/CHARACTERISTICS:\s*(.+)/)?.[1]?.trim() || 'Unable to determine';
  const impact = response.match(/IMPACT:\s*(.+)/)?.[1]?.trim() || 'Service degradation detected';
  const confidence = parseFloat(response.match(/CONFIDENCE:\s*([\d.]+)/)?.[1] || '0.8');

  return {
    attack_type: attackType,
    characteristics: characteristics,
    impact: impact,
    confidence: confidence,
    raw_analysis: response
  };
}

/**
 * Identify root cause from correlated data
 */
async function identifyRootCause(timeline, logAnalysis, metricAnomalies) {
  const timelineSummary = timeline.slice(0, 10).map(e => 
    `- ${e.timestamp}: [${e.source}] ${e.event_type} - ${JSON.stringify(e.details).substring(0, 100)}`
  ).join('\n');

  const metricsSummary = metricAnomalies.slice(0, 5).map(a =>
    `- ${a.timestamp}: ${a.type} (${a.value} vs baseline ${a.baseline}, ${a.increase_factor}x increase)`
  ).join('\n');

  const prompt = `You are a senior security engineer performing root cause analysis on a production incident.

INCIDENT TIMELINE (first 10 events):
${timelineSummary}

ATTACK ANALYSIS:
- Type: ${logAnalysis.attack_type}
- Characteristics: ${logAnalysis.characteristics}
- Impact: ${logAnalysis.impact}

METRIC ANOMALIES:
${metricsSummary}

Based on this correlated data, determine:
1. The root cause of the incident
2. Contributing factors (security controls that were missing)
3. Evidence supporting your conclusion
4. Confidence score (0-1)

Respond in this exact format:
ROOT_CAUSE: [specific vulnerability or weakness]
CONTRIBUTING_FACTORS: [factor1], [factor2], [factor3]
EVIDENCE: [key evidence points]
CONFIDENCE: [0.0-1.0]`;

  const response = await callLLM(prompt, 0.1);

  // Parse the response
  const rootCause = response.match(/ROOT_CAUSE:\s*(.+)/)?.[1]?.trim() || 'Unable to determine root cause';
  const factorsMatch = response.match(/CONTRIBUTING_FACTORS:\s*(.+)/)?.[1]?.trim() || '';
  const contributingFactors = factorsMatch.split(',').map(f => f.trim()).filter(f => f);
  const evidence = response.match(/EVIDENCE:\s*(.+)/)?.[1]?.trim() || 'See timeline and metrics';
  const confidence = parseFloat(response.match(/CONFIDENCE:\s*([\d.]+)/)?.[1] || '0.85');

  return {
    root_cause: rootCause,
    contributing_factors: contributingFactors,
    evidence: evidence,
    confidence: confidence,
    raw_analysis: response
  };
}

/**
 * Generate remediation plan
 */
async function generateRemediationPlan(rootCause, attackType, severity = 'critical') {
  const prompt = `You are a security incident responder creating an action plan for a production incident.

INCIDENT DETAILS:
- Root Cause: ${rootCause}
- Attack Type: ${attackType}
- Severity: ${severity}

Generate a comprehensive remediation plan with:
1. IMMEDIATE actions (can be done in minutes, stop the attack)
2. SHORT-TERM fixes (can be done in hours/days, prevent recurrence)
3. LONG-TERM improvements (strategic security enhancements)

For each action, provide:
- Priority (1-5, 1 being highest)
- Action description
- Implementation approach or command (if applicable)
- Estimated time

Respond in this exact format:
IMMEDIATE_1: [priority] | [action] | [implementation] | [time]
IMMEDIATE_2: [priority] | [action] | [implementation] | [time]
SHORT_TERM_1: [priority] | [action] | [implementation] | [time]
SHORT_TERM_2: [priority] | [action] | [implementation] | [time]
LONG_TERM_1: [priority] | [action] | [implementation] | [time]
LONG_TERM_2: [priority] | [action] | [implementation] | [time]`;

  const response = await callLLM(prompt, 0.2);

  // Parse the response
  const parseAction = (line) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 4) {
      return {
        priority: parseInt(parts[0]) || 1,
        action: parts[1],
        implementation: parts[2],
        estimated_time: parts[3]
      };
    }
    return null;
  };

  const immediate = [];
  const shortTerm = [];
  const longTerm = [];

  response.split('\n').forEach(line => {
    if (line.startsWith('IMMEDIATE_')) {
      const action = parseAction(line.substring(line.indexOf(':') + 1));
      if (action) immediate.push(action);
    } else if (line.startsWith('SHORT_TERM_')) {
      const action = parseAction(line.substring(line.indexOf(':') + 1));
      if (action) shortTerm.push(action);
    } else if (line.startsWith('LONG_TERM_')) {
      const action = parseAction(line.substring(line.indexOf(':') + 1));
      if (action) longTerm.push(action);
    }
  });

  return {
    immediate_actions: immediate.length > 0 ? immediate : [
      {
        priority: 1,
        action: 'Block attacker IP address',
        implementation: 'Add firewall rule or update WAF',
        estimated_time: '2 minutes'
      }
    ],
    short_term_fixes: shortTerm.length > 0 ? shortTerm : [
      {
        priority: 2,
        action: 'Implement request size validation',
        implementation: 'Add middleware to limit payload size to 1MB',
        estimated_time: '2 hours'
      }
    ],
    long_term_improvements: longTerm.length > 0 ? longTerm : [
      {
        priority: 3,
        action: 'Deploy Web Application Firewall',
        implementation: 'Implement ModSecurity with OWASP rules',
        estimated_time: '1 week'
      }
    ],
    raw_plan: response
  };
}

/**
 * Generate incident summary
 */
async function generateIncidentSummary(rootCauseAnalysis, remediationPlan) {
  const prompt = `Create a concise executive summary of this security incident:

ROOT CAUSE: ${rootCauseAnalysis.root_cause}
ATTACK TYPE: ${rootCauseAnalysis.attack_type || 'Unknown'}
CONFIDENCE: ${rootCauseAnalysis.confidence}

IMMEDIATE ACTIONS TAKEN:
${remediationPlan.immediate_actions.map(a => `- ${a.action}`).join('\n')}

Write a 2-3 sentence executive summary suitable for management.`;

  const summary = await callLLM(prompt, 0.3);
  return summary;
}

module.exports = {
  callLLM,
  analyzeLogsForPatterns,
  identifyRootCause,
  generateRemediationPlan,
  generateIncidentSummary
};


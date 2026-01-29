const { z } = require("zod");
const dataSources = require("./services/data_sources");
const aiService = require("./services/ai_service");
const timelineBuilder = require("./utils/timeline_builder");

const tools = {
  /**
   * Tool 1: Fetch Incident Timeline
   * Build chronological event timeline from all data sources
   */
  fetch_incident_timeline: {
    description: "Build a chronological timeline of events from all observability sources (logs, metrics, K8s events, API gateway). Correlates data to show attack progression.",
    schema: z.object({
      start_time: z.string().describe("Start time in ISO 8601 format (e.g., 2026-01-29T14:00:00Z)"),
      end_time: z.string().describe("End time in ISO 8601 format (e.g., 2026-01-29T14:35:00Z)"),
      sources: z.array(z.enum(["logs", "metrics", "gateway", "kubernetes", "all"])).optional().describe("Data sources to include (default: all)")
    }),
    execute: async ({ start_time, end_time, sources = ["all"] }) => {
      try {
        // Determine which sources to include
        const includeAll = sources.includes("all");
        const includeLogs = includeAll || sources.includes("logs");
        const includeMetrics = includeAll || sources.includes("metrics");
        const includeGateway = includeAll || sources.includes("gateway");
        const includeK8s = includeAll || sources.includes("kubernetes");

        // Gather data from requested sources
        const sourceData = {};

        if (includeLogs) {
          sourceData.applicationLogs = dataSources.applicationLogs.query({
            startTime: start_time,
            endTime: end_time
          });
        }

        if (includeMetrics) {
          sourceData.metrics = dataSources.metrics.query({
            startTime: start_time,
            endTime: end_time
          });
        }

        if (includeGateway) {
          sourceData.apiGatewayLogs = dataSources.apiGatewayLogs.query({
            startTime: start_time,
            endTime: end_time
          });
        }

        if (includeK8s) {
          sourceData.kubernetesEvents = dataSources.kubernetesEvents.query({
            startTime: start_time,
            endTime: end_time
          });
        }

        // Build timeline
        const timeline = timelineBuilder.buildTimeline(sourceData, start_time, end_time);
        const summary = timelineBuilder.generateTimelineSummary(timeline);
        const patterns = timelineBuilder.findAttackPatterns(timeline);
        const correlationWindows = timelineBuilder.identifyCorrelationWindows(timeline);

        return {
          timeline: timeline,
          summary: summary,
          attack_patterns: patterns,
          correlation_windows: correlationWindows.map(w => ({
            start: w.start,
            end: w.end,
            event_count: w.events.length,
            severity_distribution: w.severity_counts
          })),
          metadata: {
            time_range: `${start_time} to ${end_time}`,
            sources_queried: sources,
            total_events: timeline.length
          }
        };
      } catch (error) {
        return {
          error: `Failed to fetch incident timeline: ${error.message}`,
          timeline: [],
          summary: {}
        };
      }
    }
  },

  /**
   * Tool 2: Analyze Logs
   * AI-powered log analysis to identify attack patterns and anomalies
   */
  analyze_logs: {
    description: "Perform AI-powered analysis of application logs to identify attack patterns, anomalies, and suspicious behavior. Uses LLM to detect attack signatures.",
    schema: z.object({
      time_range: z.object({
        start: z.string().describe("Start time in ISO 8601 format"),
        end: z.string().describe("End time in ISO 8601 format")
      }).describe("Time range to analyze"),
      log_level: z.enum(["error", "warn", "info", "all"]).optional().describe("Filter by log level (default: all)"),
      limit: z.number().optional().describe("Maximum number of logs to analyze (default: 500)")
    }),
    execute: async ({ time_range, log_level, limit = 500 }) => {
      try {
        // Query logs
        const logs = dataSources.applicationLogs.query({
          startTime: time_range.start,
          endTime: time_range.end,
          level: log_level === "all" ? undefined : log_level,
          limit: limit
        });

        // Get error patterns
        const errorPatterns = dataSources.applicationLogs.getErrorPatterns({
          startTime: time_range.start,
          endTime: time_range.end
        });

        // Detect anomalies (large payloads)
        const anomalies = dataSources.applicationLogs.detectAnomalies({
          startTime: time_range.start,
          endTime: time_range.end,
          threshold: 5000000 // 5MB
        });

        // Use AI to analyze patterns
        const aiAnalysis = await aiService.analyzeLogsForPatterns(logs, errorPatterns);

        // Calculate statistics
        const stats = {
          total_logs: logs.length,
          error_count: logs.filter(l => l.level === 'error').length,
          unique_ips: [...new Set(logs.map(l => l.source_ip))].length,
          unique_endpoints: [...new Set(logs.map(l => l.endpoint))].length,
          avg_response_time: Math.round(logs.reduce((sum, l) => sum + l.response_time_ms, 0) / logs.length),
          large_payload_count: anomalies.length
        };

        return {
          patterns: errorPatterns.slice(0, 10),
          anomalies: anomalies.slice(0, 20),
          statistics: stats,
          ai_analysis: {
            attack_type: aiAnalysis.attack_type,
            characteristics: aiAnalysis.characteristics,
            impact: aiAnalysis.impact,
            confidence: aiAnalysis.confidence
          },
          top_error_ips: dataSources.applicationLogs.query({
            startTime: time_range.start,
            endTime: time_range.end,
            level: 'error'
          }).reduce((acc, log) => {
            acc[log.source_ip] = (acc[log.source_ip] || 0) + 1;
            return acc;
          }, {}),
          metadata: {
            time_range: time_range,
            analyzed_logs: logs.length
          }
        };
      } catch (error) {
        return {
          error: `Failed to analyze logs: ${error.message}`,
          patterns: [],
          anomalies: [],
          statistics: {}
        };
      }
    }
  },

  /**
   * Tool 3: Identify Root Cause
   * AI-powered root cause analysis using correlated data from all sources
   */
  identify_root_cause: {
    description: "Perform comprehensive root cause analysis by correlating data from all sources. Uses AI to identify vulnerabilities, missing security controls, and attack vectors.",
    schema: z.object({
      incident_id: z.string().optional().describe("Optional incident identifier for tracking"),
      include_metrics: z.boolean().optional().describe("Include metrics analysis (default: true)"),
      include_logs: z.boolean().optional().describe("Include log analysis (default: true)"),
      time_range: z.object({
        start: z.string().describe("Incident start time"),
        end: z.string().describe("Incident end time")
      }).optional().describe("Time range (defaults to attack window 14:15-14:30)")
    }),
    execute: async ({ incident_id, include_metrics = true, include_logs = true, time_range }) => {
      try {
        // Default to attack time window if not specified
        const startTime = time_range?.start || "2026-01-29T14:15:00.000Z";
        const endTime = time_range?.end || "2026-01-29T14:30:00.000Z";

        // Fetch timeline
        const timelineData = await tools.fetch_incident_timeline.execute({
          start_time: startTime,
          end_time: endTime,
          sources: ["all"]
        });

        // Analyze logs
        let logAnalysis = null;
        if (include_logs) {
          logAnalysis = await tools.analyze_logs.execute({
            time_range: { start: startTime, end: endTime },
            log_level: "all"
          });
        }

        // Get metric anomalies
        let metricAnomalies = [];
        if (include_metrics) {
          metricAnomalies = dataSources.metrics.detectAnomalies({
            startTime: startTime,
            endTime: endTime
          });
        }

        // Get baseline for comparison
        const baseline = dataSources.metrics.getBaseline({ service: 'search-api' });

        // Use AI to identify root cause
        const rootCauseAnalysis = await aiService.identifyRootCause(
          timelineData.timeline,
          logAnalysis?.ai_analysis || {},
          metricAnomalies
        );

        // Compile evidence
        const evidence = [];

        if (logAnalysis?.anomalies?.length > 0) {
          evidence.push({
            type: 'log_analysis',
            description: `${logAnalysis.anomalies.length} large payload requests detected (>5MB)`,
            severity: 'critical',
            details: logAnalysis.anomalies.slice(0, 5)
          });
        }

        if (metricAnomalies.length > 0) {
          evidence.push({
            type: 'metrics',
            description: `${metricAnomalies.length} metric anomalies detected`,
            severity: 'critical',
            details: metricAnomalies.slice(0, 5)
          });
        }

        if (timelineData.attack_patterns?.length > 0) {
          evidence.push({
            type: 'attack_patterns',
            description: 'Attack patterns identified in timeline',
            severity: 'critical',
            details: timelineData.attack_patterns
          });
        }

        // Get K8s impact
        const k8sRestarts = dataSources.kubernetesEvents.getPodRestartSummary({
          startTime: startTime,
          endTime: endTime
        });

        return {
          incident_id: incident_id || `INC-${Date.now()}`,
          root_cause: rootCauseAnalysis.root_cause,
          contributing_factors: rootCauseAnalysis.contributing_factors,
          confidence_score: rootCauseAnalysis.confidence,
          attack_type: logAnalysis?.ai_analysis?.attack_type || 'Unknown',
          evidence: evidence,
          impact_assessment: {
            affected_service: 'search-api',
            pod_restarts: k8sRestarts.total_restarts,
            oom_kills: k8sRestarts.oom_kills,
            error_rate_increase: metricAnomalies.find(a => a.type === 'error_rate_spike')?.increase_factor || 'N/A',
            response_time_increase: metricAnomalies.find(a => a.type === 'response_time_degradation')?.increase_factor || 'N/A',
            baseline_comparison: baseline
          },
          timeline_summary: timelineData.summary,
          metadata: {
            analysis_time: new Date().toISOString(),
            time_range: { start: startTime, end: endTime },
            data_sources_analyzed: ['logs', 'metrics', 'gateway', 'kubernetes']
          }
        };
      } catch (error) {
        return {
          error: `Failed to identify root cause: ${error.message}`,
          root_cause: 'Analysis failed',
          confidence_score: 0
        };
      }
    }
  },

  /**
   * Tool 4: Suggest Remediation
   * Generate prioritized, actionable remediation plan with immediate and long-term fixes
   */
  suggest_remediation: {
    description: "Generate a comprehensive, prioritized remediation plan with immediate actions, short-term fixes, and long-term improvements. Includes specific commands and implementation guidance.",
    schema: z.object({
      root_cause: z.string().describe("The identified root cause of the incident"),
      attack_type: z.string().optional().describe("Type of attack detected"),
      severity: z.enum(["critical", "high", "medium", "low"]).optional().describe("Incident severity (default: critical)"),
      include_commands: z.boolean().optional().describe("Include executable commands (default: true)")
    }),
    execute: async ({ root_cause, attack_type = "Unknown", severity = "critical", include_commands = true }) => {
      try {
        // Generate AI-powered remediation plan
        const remediationPlan = await aiService.generateRemediationPlan(
          root_cause,
          attack_type,
          severity
        );

        // Add specific commands if requested
        if (include_commands) {
          // Enhance immediate actions with commands
          remediationPlan.immediate_actions = remediationPlan.immediate_actions.map(action => {
            if (action.action.toLowerCase().includes('block') && action.action.toLowerCase().includes('ip')) {
              return {
                ...action,
                commands: [
                  "# Block attacker IP at firewall level",
                  "sudo iptables -A INPUT -s 203.0.113.45 -j DROP",
                  "# Or update nginx config",
                  "echo 'deny 203.0.113.45;' >> /etc/nginx/blocked-ips.conf",
                  "sudo nginx -s reload"
                ]
              };
            }
            if (action.action.toLowerCase().includes('restart') || action.action.toLowerCase().includes('scale')) {
              return {
                ...action,
                commands: [
                  "# Scale up pods",
                  "kubectl scale deployment search-api --replicas=8 -n production",
                  "# Or restart deployment",
                  "kubectl rollout restart deployment/search-api -n production"
                ]
              };
            }
            return action;
          });

          // Enhance short-term fixes with implementation details
          remediationPlan.short_term_fixes = remediationPlan.short_term_fixes.map(action => {
            if (action.action.toLowerCase().includes('validation') || action.action.toLowerCase().includes('limit')) {
              return {
                ...action,
                implementation_code: `// Add Express middleware for payload size validation
app.use(express.json({ limit: '1mb' }));

// Add custom validation middleware
app.use('/api/search', (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1048576) { // 1MB
    return res.status(413).json({ error: 'Payload too large' });
  }
  next();
});`
              };
            }
            if (action.action.toLowerCase().includes('rate limit')) {
              return {
                ...action,
                implementation_code: `// Install: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later'
});

app.use('/api/search', searchLimiter);`
              };
            }
            return action;
          });
        }

        // Add monitoring recommendations
        const monitoringRecommendations = [
          {
            metric: 'Request payload size',
            threshold: '> 1MB',
            action: 'Alert and log for investigation'
          },
          {
            metric: 'Request rate per IP',
            threshold: '> 10 requests/minute',
            action: 'Trigger rate limiting'
          },
          {
            metric: 'CPU utilization',
            threshold: '> 80%',
            action: 'Auto-scale pods'
          },
          {
            metric: 'Memory utilization',
            threshold: '> 85%',
            action: 'Alert and investigate'
          },
          {
            metric: 'Error rate',
            threshold: '> 5%',
            action: 'Page on-call engineer'
          }
        ];

        // Generate executive summary
        const summary = await aiService.generateIncidentSummary(
          { root_cause, attack_type, confidence: 0.9 },
          remediationPlan
        );

        return {
          summary: summary,
          immediate_actions: remediationPlan.immediate_actions,
          short_term_fixes: remediationPlan.short_term_fixes,
          long_term_improvements: remediationPlan.long_term_improvements,
          monitoring_recommendations: monitoringRecommendations,
          estimated_total_time: {
            immediate: '5-10 minutes',
            short_term: '4-8 hours',
            long_term: '1-2 weeks'
          },
          priority_order: [
            '1. Execute immediate actions to stop ongoing attack',
            '2. Implement short-term fixes to prevent recurrence',
            '3. Plan and execute long-term security improvements',
            '4. Set up enhanced monitoring and alerting'
          ],
          metadata: {
            generated_at: new Date().toISOString(),
            severity: severity,
            root_cause: root_cause,
            attack_type: attack_type
          }
        };
      } catch (error) {
        return {
          error: `Failed to generate remediation plan: ${error.message}`,
          immediate_actions: [],
          short_term_fixes: [],
          long_term_improvements: []
        };
      }
    }
  },

  // Keep original test tools
  get_time: {
    description: "Get the current system time.",
    schema: z.object({}),
    execute: async () => {
      return { time: new Date().toISOString() };
    }
  },

  echo: {
    description: "Echo back the provided message.",
    schema: z.object({
      message: z.string().min(1).max(500)
    }),
    execute: async ({ message }) => {
      return { echoed_message: message };
    }
  }
};

module.exports = { tools };

// Made with Bob

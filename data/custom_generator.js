const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const DATA_DIR = __dirname;
const FILES = {
    logs: path.join(DATA_DIR, 'application_logs.json'),
    metrics: path.join(DATA_DIR, 'metrics.json'),
    gateway: path.join(DATA_DIR, 'api_gateway_logs.json'),
    k8s: path.join(DATA_DIR, 'kubernetes_events.json')
};

// --- SIMULATION HELPERS ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addJitter = (date, ms) => new Date(date.getTime() + randomInt(-ms, ms));

// Generate Random IPs
function generateIPs(count) {
    const ips = [];
    for (let i = 0; i < count; i++) {
        ips.push(`${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`);
    }
    return ips;
}

// Main Generation Logic
function generateCustomScenario(config) {
    console.log('\n⚙️  Generating scenario with config:', JSON.stringify(config, null, 2));

    const startTime = new Date(config.attack_start_time);
    const durationMs = config.attack_duration_minutes * 60000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const attackerIPs = generateIPs(config.attacker_count);

    const newLogs = [];
    const newMetrics = [];
    const newGateway = [];
    const newK8s = [];

    // 1. Generate Application and Gateway Logs
    let t = new Date(startTime);
    while (t < endTime) {
        // Attack intensity varies
        const burstSize = randomInt(1, 3);

        for (let i = 0; i < burstSize; i++) {
            let sizeBytes = 0;
            let errorMsg = '';
            let statusCode = 200;
            let method = 'POST';
            let endpoint = '/api/search';

            switch (config.incident_type) {
                case 'ddos_flood':
                    sizeBytes = randomInt(512, 2048); // Small packets
                    errorMsg = 'Service Unavailable';
                    statusCode = 503;
                    break;
                case 'sql_injection':
                    sizeBytes = randomInt(500, 1500);
                    errorMsg = 'SQL syntax error near check_syntax';
                    statusCode = 500;
                    endpoint = '/api/users'; // Target DB-heavy endpoint
                    break;
                default: // json_payload_bomb
                    // Payload size logic
                    const targetMB = config.avg_attack_payload_mb || 8;
                    // Variance +/- 20%
                    sizeBytes = Math.floor((targetMB * 1024 * 1024) * (0.8 + Math.random() * 0.4));
                    errorMsg = 'Payload processing timeout';
                    statusCode = randomChoice([500, 502, 504]);
                    break;
            }

            const logEntry = {
                timestamp: addJitter(t, 2000).toISOString(),
                level: 'error',
                service: 'search-api',
                endpoint: endpoint,
                method: method,
                request_size: sizeBytes,
                response_time_ms: randomInt(5000, 15000), // Slow response
                status_code: statusCode,
                source_ip: randomChoice(attackerIPs),
                user_agent: 'custom-attack-tool/1.0',
                error: errorMsg,
                nested_depth: randomInt(100, 200)
            };

            newLogs.push(logEntry);

            // Gateway log mirror
            newGateway.push({
                request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: logEntry.timestamp,
                method: logEntry.method,
                endpoint: logEntry.endpoint,
                request_size: logEntry.request_size,
                response_code: logEntry.status_code,
                response_time_ms: logEntry.response_time_ms,
                source_ip: logEntry.source_ip,
                user_agent: logEntry.user_agent
            });
        }

        // Determine next burst time (dense traffic for attacks)
        t = new Date(t.getTime() + randomInt(1000, 5000));
    }

    // 2. Generate Metrics
    const metricStart = new Date(startTime);
    const metricEnd = new Date(endTime);
    // Pad the metrics slightly before and after
    metricStart.setMinutes(metricStart.getMinutes() - 2);
    metricEnd.setMinutes(metricEnd.getMinutes() + 2);

    let mt = new Date(metricStart);
    while (mt < metricEnd) {
        // Is attack active?
        const inAttack = mt >= startTime && mt <= endTime;
        const progress = inAttack ? 1 : 0; // Simple on/off for now, or use complex ramp

        const cpu = inAttack ? Math.min(config.system_cpu_limit, 80 + Math.random() * 20) : (20 + Math.random() * 5);
        const mem = inAttack ? Math.min(config.system_memory_limit, 70 + Math.random() * 25) : (30 + Math.random() * 5);

        newMetrics.push({
            timestamp: mt.toISOString(),
            service: 'search-api',
            metrics: {
                cpu_percent: parseFloat(cpu.toFixed(1)),
                memory_percent: parseFloat(mem.toFixed(1)),
                request_rate: inAttack ? randomInt(150, 300) : randomInt(80, 120),
                response_time: {
                    p50: inAttack ? 2000 : 120,
                    p95: inAttack ? 5000 : 200,
                    p99: inAttack ? 10000 : 300
                },
                error_rate: inAttack ? 0.45 : 0.001,
                active_connections: inAttack ? randomInt(200, 500) : randomInt(50, 100)
            }
        });

        // K8s Event Chance
        if (inAttack && mem > 85 && Math.random() > 0.7) {
            newK8s.push({
                timestamp: mt.toISOString(),
                event_type: 'pod_restart',
                namespace: 'production',
                pod_name: `search-api-${randomInt(1000, 9999)}`,
                reason: 'OOMKilled',
                message: `Container exceeded memory limit (${mem.toFixed(1)}%)`,
                restart_count: 1
            });
        }

        mt = new Date(mt.getTime() + 60000); // 1 min steps
    }

    // 3. Append and Save
    const appendData = (filePath, newData) => {
        if (!fs.existsSync(filePath)) return;
        const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const combined = [...existing, ...newData];
        // Sort all by timestamp
        combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        fs.writeFileSync(filePath, JSON.stringify(combined, null, 2));
        console.log(`✅ Appended ${newData.length} entries to ${path.basename(filePath)}`);
    };

    appendData(FILES.logs, newLogs);
    appendData(FILES.metrics, newMetrics);
    appendData(FILES.gateway, newGateway);
    appendData(FILES.k8s, newK8s);
}

// --- SEQUENTIAL PROMPTING ---
const ATTACK_TYPES = ['json_payload_bomb', 'ddos_flood', 'sql_injection'];
const ATTACK_OPTIONS = {
    'a': 'json_payload_bomb',
    'b': 'ddos_flood',
    'c': 'sql_injection'
};

const questions = [
    {
        key: 'incident_type',
        question: `Incident Type:\n  a) json_payload_bomb\n  b) ddos_flood\n  c) sql_injection\nSelect [a/b/c] (default: a): `,
        default: 'a',
        transform: (val) => ATTACK_OPTIONS[val.toLowerCase()] || 'json_payload_bomb'
    },
    {
        key: 'attack_start_time',
        question: 'Attack Start Time (DD MM YYYY HH:mm, e.g., 29 01 2026 14:15): ',
        transform: (val) => {
            const parts = val.trim().split(' ');
            if (parts.length < 4) return null; // Invalid format
            const [day, month, year, time] = parts;
            const [hour, minute] = time.split(':');
            // Construct ISO string directly to preserve exact numbers as UTC
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00.000Z`;
        }
    },
    { key: 'attack_duration_minutes', question: 'Duration in minutes (default: 15): ', default: 15, type: 'int' },
    { key: 'attacker_count', question: 'Number of Attackers (default: 5): ', default: 5, type: 'int' },
    { key: 'avg_attack_payload_mb', question: 'Avg Payload Size in MB (default: 8): ', default: 8, type: 'float' },
    { key: 'system_cpu_limit', question: 'Max CPU Usage % (default: 95): ', default: 95, type: 'int' },
    { key: 'system_memory_limit', question: 'Max Memory Usage % (default: 90): ', default: 90, type: 'int' }
];

const config = {};
let currentQ = 0;

console.log("🛠️  Custom Data Generator");
console.log("Please answer the following questions to verify scenario parameters.\n");

function askQuestion() {
    if (currentQ >= questions.length) {
        rl.close();
        // Validation check for incident type mapping
        if (!config.incident_type) config.incident_type = 'json_payload_bomb';
        generateCustomScenario(config);
        return;
    }

    const q = questions[currentQ];
    rl.question(`👉 ${q.question}`, (answer) => {
        let val = answer.trim();
        if (!val && q.default !== undefined) {
            val = q.default;
        }

        // Apply Custom Transformations (Date parsing, a/b/c mapping)
        if (q.transform) {
            try {
                val = q.transform(val);
                if (!val && q.key === 'attack_start_time') throw new Error("Invalid date format");
            } catch (e) {
                console.log(`❌ Invalid input for ${q.key}. Please try again.`);
                askQuestion(); // Retry
                return;
            }
        } else {
            if (q.key === 'attack_start_time' && !val) {
                console.log("❌ Start time is required!");
                askQuestion(); // Retry
                return;
            }
        }

        if (q.type === 'int') val = parseInt(val);
        if (q.type === 'float') val = parseFloat(val);

        config[q.key] = val;
        currentQ++;
        askQuestion();
    });
}

askQuestion();

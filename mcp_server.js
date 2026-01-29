const express = require("express");
const path = require('path');


const app = express();
app.use(express.json());

// Serve static files (dashboard.html, charts, etc.) from project root
app.use(express.static(path.join(__dirname)));

// Root route: serve dashboard if available, otherwise list tools
app.get('/', (req, res) => {
    const dashboardPath = path.join(__dirname, 'dashboard.html');
    res.sendFile(dashboardPath, err => {
        if (err) {
            res.type('text').send('DeepTrace MCP Server running. Use POST /tools/:tool_name to call tools.');
        }
    });
});
const { tools } = require("./tools");
const PredictiveEngine = require('./services/predictive_engine');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
app.get("/tools", (req, res) =>{
    res.json(
        Object.entries(tools).map(([name,tools]) =>({
            name,
            description: tools.description,
            input_schema: tools.schema.shape
        }))
    )
})
app.post("/tools/:tool_name", async(req, res) =>{
    const tool = tools[req.params.tool_name];
    if(!tool){
        return res.status(404).json({ error: "Tool not found" });
    }
    try{
        const args = tool.schema.parse(req.body);
        const result = await tool.execute(args);
        res.json(result);   
    }catch(e){
        res.status(400).json({ error: e.errors ? e.errors : e.message });
    }
})

// Demo endpoint: run predictive live demo and return prediction + PNG (base64)
app.get('/demo/predict', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const engine = new PredictiveEngine();
        engine.loadMemoryFromFiles({
            applicationLogs: path.join(dataDir, 'application_logs.json'),
            apiGatewayLogs: path.join(dataDir, 'api_gateway_logs.json'),
            metrics: path.join(dataDir, 'metrics.json'),
            kubernetesEvents: path.join(dataDir, 'kubernetes_events.json')
        });
        engine.train();
        const prediction = engine.predict({ timeWindowMinutes: 60 });

        // Build recovery chart (similar to predict_live_demo)
        const metrics = require(path.join(dataDir, 'metrics.json'));
        const labels = metrics.map(m => m.timestamp.replace('T', '\n').replace('Z',''));
        const originalP95 = metrics.map(m => m.metrics.response_time.p95);

        // simple mitigation simulation: decay after peak
        const peakIndex = originalP95.reduce((bestIdx, val, idx, arr) => val > arr[bestIdx] ? idx : bestIdx, 0);
        const mitigationIndex = Math.min(peakIndex + 1, metrics.length - 1);
        const mitigatedP95 = metrics.map((m, idx) => {
            if (idx >= mitigationIndex) {
                const steps = idx - mitigationIndex + 1;
                const decay = Math.exp(-0.3 * steps);
                const baselineP95 = 200;
                return Math.max(baselineP95, baselineP95 + (m.metrics.response_time.p95 - baselineP95) * decay);
            }
            return m.metrics.response_time.p95;
        });

        const width = 1000, height = 500;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
        const configuration = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'p95 (original)', data: originalP95, borderColor: '#ff9900', backgroundColor: '#ff9900', fill: false, tension: 0.2, pointRadius: 3 },
                    { label: 'p95 (mitigated)', data: mitigatedP95, borderColor: '#00c853', backgroundColor: '#00c853', fill: false, borderDash: [6,4], tension: 0.2, pointRadius: 3 }
                ]
            },
            options: {
                plugins: { title: { display: true, text: 'Prediction & Recovery (Demo)', color: '#222' }, legend: { labels: { color: '#222' } } },
                scales: {
                    x: { ticks: { color: '#222' }, grid: { color: '#f2f2f2' } },
                    y: { ticks: { color: '#222' }, grid: { color: '#e6e6e6' } }
                },
                elements: { line: { borderWidth: 4 }, point: { radius: 5 } }
            },
            plugins: [
                {
                    id: 'custom_canvas_background_color',
                    beforeDraw: (chart) => {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, chart.width, chart.height);
                        ctx.restore();
                    }
                }
            ]
        };

        const image = await chartJSNodeCanvas.renderToBuffer(configuration);
        const imgBase64 = image.toString('base64');

        res.json({ prediction, image_base64: imgBase64 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Summary endpoint for simple dashboard
app.get('/demo/summary', async (req, res) => {
    try {
        const dataDir = path.join(__dirname, 'data');
        const metrics = require(path.join(dataDir, 'metrics.json'));

        const labels = metrics.map(m => m.timestamp);
        const cpu = metrics.map(m => m.metrics.cpu_percent);
        const p95 = metrics.map(m => m.metrics.response_time.p95);

        const engine = new PredictiveEngine();
        engine.loadMemoryFromFiles({
            applicationLogs: path.join(dataDir, 'application_logs.json'),
            apiGatewayLogs: path.join(dataDir, 'api_gateway_logs.json'),
            metrics: path.join(dataDir, 'metrics.json'),
            kubernetesEvents: path.join(dataDir, 'kubernetes_events.json')
        });
        engine.train();
        const prediction = engine.predict({ timeWindowMinutes: 60 });

        res.json({ metrics: { labels, cpu, p95 }, prediction });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mitigation endpoint: simulate applying mitigation and return adjusted metrics
app.post('/demo/mitigate', express.json(), async (req, res) => {
    try {
        const { action } = req.body || {};
        const dataDir = path.join(__dirname, 'data');
        const metrics = require(path.join(dataDir, 'metrics.json'));

        // Simple mitigation: after peak index, decay p95 and cpu
        const p95Vals = metrics.map(m => m.metrics.response_time.p95);
        const peakIndex = p95Vals.reduce((bestIdx, val, idx, arr) => val > arr[bestIdx] ? idx : bestIdx, 0);
        const mitigationIndex = Math.min(peakIndex + 1, metrics.length - 1);

        const mitigated = metrics.map((m, idx) => {
            const copy = JSON.parse(JSON.stringify(m));
            if (idx >= mitigationIndex) {
                const steps = idx - mitigationIndex + 1;
                const decay = Math.exp(-0.4 * steps);
                const baselineP95 = 200;
                copy.metrics.response_time.p95 = Math.max(baselineP95, baselineP95 + (m.metrics.response_time.p95 - baselineP95) * decay);
                copy.metrics.cpu_percent = Math.max(20, 25 + (m.metrics.cpu_percent - 25) * decay);
            }
            return copy;
        });

        const labels = mitigated.map(m => m.timestamp);
        const cpu = mitigated.map(m => m.metrics.cpu_percent);
        const p95 = mitigated.map(m => m.metrics.response_time.p95);

        res.json({ metrics: { labels, cpu, p95 }, message: 'mitigation simulated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, (req, re) =>{
    console.log("MCP Server running on http://localhost:3000");
})

// Helpful 404 for browser users
app.use((req, res) => {
    res.status(404).type('text').send('Not Found. Try POST /tools/<tool_name> or GET /tools');
});
const path = require('path');
const PredictiveEngine = require('./services/predictive_engine');

async function main() {
  const engine = new PredictiveEngine();

  engine.loadMemoryFromFiles({
    applicationLogs: path.join(__dirname, 'data', 'application_logs.json'),
    apiGatewayLogs: path.join(__dirname, 'data', 'api_gateway_logs.json'),
    metrics: path.join(__dirname, 'data', 'metrics.json'),
    kubernetesEvents: path.join(__dirname, 'data', 'kubernetes_events.json')
  });

  engine.train();

  const prediction = engine.predict({timeWindowMinutes:60});

  console.log(JSON.stringify({prediction}, null, 2));
}

main().catch(err => {
  console.error('Error running predict_demo:', err);
  process.exit(1);
});

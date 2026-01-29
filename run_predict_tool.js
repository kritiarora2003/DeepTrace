const { tools } = require('./tools');

async function run() {
  const res = await tools.predictive_threats.execute({ time_window_minutes: 60, include_briefing: false });
  console.log(JSON.stringify(res, null, 2));
}

run().catch(err => { console.error('Error:', err); process.exit(1); });

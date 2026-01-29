const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Load data files
const dataDir = path.join(__dirname, 'data');
const applicationLogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'application_logs.json'), 'utf8'));
const metrics = JSON.parse(fs.readFileSync(path.join(dataDir, 'metrics.json'), 'utf8'));
const apiGatewayLogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'api_gateway_logs.json'), 'utf8'));
const kubernetesEvents = JSON.parse(fs.readFileSync(path.join(dataDir, 'kubernetes_events.json'), 'utf8'));

// Create output directory for charts
const outputDir = path.join(__dirname, 'charts');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Chart configuration
const width = 1200;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

/**
 * Chart 1: CPU and Memory Usage Over Time
 */
async function generateResourceUsageChart() {
  const timestamps = metrics.map(m => {
    const date = new Date(m.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  });
  
  const cpuData = metrics.map(m => m.metrics.cpu_percent);
  const memoryData = metrics.map(m => m.metrics.memory_percent);
  
  // Mark attack window (14:15-14:30)
  const attackStartIndex = timestamps.findIndex(t => t.includes('14:15') || t.includes('2:15'));
  const attackEndIndex = timestamps.findIndex(t => t.includes('14:30') || t.includes('2:30'));

  const configuration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: cpuData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Memory Usage (%)',
          data: memoryData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Resource Usage During Attack (CPU & Memory)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        },
        annotation: {
          annotations: {
            attackWindow: {
              type: 'box',
              xMin: attackStartIndex >= 0 ? attackStartIndex : 15,
              xMax: attackEndIndex >= 0 ? attackEndIndex : 30,
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              borderColor: 'rgba(255, 0, 0, 0.5)',
              borderWidth: 2,
              label: {
                display: true,
                content: 'Attack Window',
                position: 'start'
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Usage (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time (UTC)'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '1_resource_usage.png'), imageBuffer);
  console.log('✓ Generated: 1_resource_usage.png');
}

/**
 * Chart 2: Response Time Degradation
 */
async function generateResponseTimeChart() {
  const timestamps = metrics.map(m => {
    const date = new Date(m.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  });
  
  const p50Data = metrics.map(m => m.metrics.response_time.p50);
  const p95Data = metrics.map(m => m.metrics.response_time.p95);
  const p99Data = metrics.map(m => m.metrics.response_time.p99);

  const configuration = {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'p50 (median)',
          data: p50Data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'p95',
          data: p95Data,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'p99',
          data: p99Data,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Response Time Degradation (40x Increase)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Response Time (ms)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time (UTC)'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '2_response_time.png'), imageBuffer);
  console.log('✓ Generated: 2_response_time.png');
}

/**
 * Chart 3: Error Rate Spike
 */
async function generateErrorRateChart() {
  const timestamps = metrics.map(m => {
    const date = new Date(m.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  });
  
  const errorRateData = metrics.map(m => m.metrics.error_rate * 100); // Convert to percentage

  const configuration = {
    type: 'bar',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Error Rate (%)',
          data: errorRateData,
          backgroundColor: errorRateData.map(rate => 
            rate > 10 ? 'rgba(255, 99, 132, 0.8)' : 
            rate > 5 ? 'rgba(255, 159, 64, 0.8)' : 
            'rgba(75, 192, 192, 0.8)'
          ),
          borderColor: errorRateData.map(rate => 
            rate > 10 ? 'rgb(255, 99, 132)' : 
            rate > 5 ? 'rgb(255, 159, 64)' : 
            'rgb(75, 192, 192)'
          ),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Error Rate Spike (225x Increase)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Error Rate (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time (UTC)'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '3_error_rate.png'), imageBuffer);
  console.log('✓ Generated: 3_error_rate.png');
}

/**
 * Chart 4: Request Size Distribution
 */
async function generateRequestSizeChart() {
  // Categorize requests by size
  const sizeCategories = {
    'Normal (<10KB)': 0,
    'Medium (10-100KB)': 0,
    'Large (100KB-1MB)': 0,
    'Very Large (1-5MB)': 0,
    'Attack (>5MB)': 0
  };

  applicationLogs.forEach(log => {
    const size = log.request_size;
    if (size < 10240) sizeCategories['Normal (<10KB)']++;
    else if (size < 102400) sizeCategories['Medium (10-100KB)']++;
    else if (size < 1048576) sizeCategories['Large (100KB-1MB)']++;
    else if (size < 5242880) sizeCategories['Very Large (1-5MB)']++;
    else sizeCategories['Attack (>5MB)']++;
  });

  const configuration = {
    type: 'doughnut',
    data: {
      labels: Object.keys(sizeCategories),
      datasets: [{
        label: 'Request Count',
        data: Object.values(sizeCategories),
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(255, 159, 64)',
          'rgb(255, 99, 132)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Request Size Distribution (47 Attack Payloads)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '4_request_size_distribution.png'), imageBuffer);
  console.log('✓ Generated: 4_request_size_distribution.png');
}

/**
 * Chart 5: Attack Timeline with Events
 */
async function generateAttackTimelineChart() {
  // Group events by minute
  const eventsByMinute = {};
  
  // Process application logs
  applicationLogs.forEach(log => {
    const minute = log.timestamp.substring(0, 16); // YYYY-MM-DDTHH:MM
    if (!eventsByMinute[minute]) {
      eventsByMinute[minute] = { errors: 0, large_payloads: 0, total: 0 };
    }
    eventsByMinute[minute].total++;
    if (log.level === 'error') eventsByMinute[minute].errors++;
    if (log.request_size > 5000000) eventsByMinute[minute].large_payloads++;
  });

  // Process K8s events
  kubernetesEvents.forEach(event => {
    const minute = event.timestamp.substring(0, 16);
    if (!eventsByMinute[minute]) {
      eventsByMinute[minute] = { errors: 0, large_payloads: 0, total: 0, pod_restarts: 0 };
    }
    if (event.event_type === 'pod_restart') {
      eventsByMinute[minute].pod_restarts = (eventsByMinute[minute].pod_restarts || 0) + 1;
    }
  });

  const sortedMinutes = Object.keys(eventsByMinute).sort();
  const labels = sortedMinutes.map(m => {
    const date = new Date(m);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  });

  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Large Payloads (>5MB)',
          data: sortedMinutes.map(m => eventsByMinute[m].large_payloads || 0),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Errors',
          data: sortedMinutes.map(m => eventsByMinute[m].errors || 0),
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgb(255, 159, 64)',
          borderWidth: 1
        },
        {
          label: 'Pod Restarts',
          data: sortedMinutes.map(m => eventsByMinute[m].pod_restarts || 0),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgb(153, 102, 255)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Attack Timeline: Events Per Minute',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Event Count'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time (UTC)'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '5_attack_timeline.png'), imageBuffer);
  console.log('✓ Generated: 5_attack_timeline.png');
}

/**
 * Chart 6: Top Attacker IPs
 */
async function generateTopIPsChart() {
  // Count requests per IP
  const ipCounts = {};
  applicationLogs.forEach(log => {
    ipCounts[log.source_ip] = (ipCounts[log.source_ip] || 0) + 1;
  });

  // Get top 10 IPs
  const topIPs = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const configuration = {
    type: 'bar',
    data: {
      labels: topIPs.map(([ip]) => ip),
      datasets: [{
        label: 'Request Count',
        data: topIPs.map(([, count]) => count),
        backgroundColor: topIPs.map(([ip]) => 
          ip === '203.0.113.45' ? 'rgba(255, 99, 132, 0.8)' : 'rgba(54, 162, 235, 0.8)'
        ),
        borderColor: topIPs.map(([ip]) => 
          ip === '203.0.113.45' ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)'
        ),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top Source IPs (Attacker: 203.0.113.45)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Request Count'
          }
        }
      }
    }
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(path.join(outputDir, '6_top_ips.png'), imageBuffer);
  console.log('✓ Generated: 6_top_ips.png');
}

/**
 * Main execution
 */
async function generateAllCharts() {
  console.log('\n🎨 Generating Attack Visualization Charts...\n');
  
  try {
    await generateResourceUsageChart();
    await generateResponseTimeChart();
    await generateErrorRateChart();
    await generateRequestSizeChart();
    await generateAttackTimelineChart();
    await generateTopIPsChart();
    
    console.log('\n✅ All charts generated successfully!');
    console.log(`📁 Charts saved to: ${outputDir}`);
    console.log('\nGenerated charts:');
    console.log('  1. 1_resource_usage.png - CPU & Memory usage during attack');
    console.log('  2. 2_response_time.png - Response time degradation (40x)');
    console.log('  3. 3_error_rate.png - Error rate spike (225x)');
    console.log('  4. 4_request_size_distribution.png - Request size categories');
    console.log('  5. 5_attack_timeline.png - Events per minute timeline');
    console.log('  6. 6_top_ips.png - Top source IPs (attacker highlighted)');
    console.log('\n💡 Tip: Open the charts/ directory to view the visualizations\n');
  } catch (error) {
    console.error('❌ Error generating charts:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateAllCharts();
}

module.exports = { generateAllCharts };

// Made with Bob

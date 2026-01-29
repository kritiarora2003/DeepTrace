// Utility to view and manage IP blacklist
const fs = require('fs');
const path = require('path');

const BLACKLIST_FILE = path.join(__dirname, 'data', 'ip_blacklist.json');

function loadBlacklist() {
  if (!fs.existsSync(BLACKLIST_FILE)) {
    console.log('❌ No blacklist file found. Run an attack to generate it.');
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
  } catch (e) {
    console.error('❌ Error reading blacklist:', e.message);
    return null;
  }
}

function displayBlacklist() {
  const blacklist = loadBlacklist();
  if (!blacklist) return;

  const ips = Object.entries(blacklist);
  
  if (ips.length === 0) {
    console.log('✅ Blacklist is empty - no malicious IPs detected yet.');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🚫 IP BLACKLIST');
  console.log('='.repeat(80));
  console.log(`\nTotal Blacklisted IPs: ${ips.length}\n`);

  // Sort by total anomalies (most dangerous first)
  ips.sort((a, b) => b[1].total_anomalies - a[1].total_anomalies);

  console.log('IP Address'.padEnd(20) + 'Anomalies'.padEnd(12) + 'Incidents'.padEnd(12) + 'First Seen'.padEnd(25) + 'Last Seen');
  console.log('-'.repeat(80));

  ips.forEach(([ip, data]) => {
    const firstSeen = new Date(data.first_seen).toLocaleString();
    const lastSeen = new Date(data.last_seen).toLocaleString();
    
    console.log(
      ip.padEnd(20) +
      data.total_anomalies.toString().padEnd(12) +
      data.incidents.toString().padEnd(12) +
      firstSeen.padEnd(25) +
      lastSeen
    );
  });

  console.log('\n' + '='.repeat(80));
  
  // Statistics
  const totalAnomalies = ips.reduce((sum, [_, data]) => sum + data.total_anomalies, 0);
  const totalIncidents = ips.reduce((sum, [_, data]) => sum + data.incidents, 0);
  const avgAnomaliesPerIP = (totalAnomalies / ips.length).toFixed(1);
  
  console.log('\n📊 Statistics:');
  console.log(`   • Total Anomalies Detected: ${totalAnomalies}`);
  console.log(`   • Total Incidents: ${totalIncidents}`);
  console.log(`   • Average Anomalies per IP: ${avgAnomaliesPerIP}`);
  
  // Top offenders
  console.log('\n🔴 Top 5 Offenders:');
  ips.slice(0, 5).forEach(([ip, data], i) => {
    console.log(`   ${i + 1}. ${ip}: ${data.total_anomalies} anomalies across ${data.incidents} incidents`);
  });
  
  console.log('\n');
}

function clearBlacklist() {
  if (fs.existsSync(BLACKLIST_FILE)) {
    fs.unlinkSync(BLACKLIST_FILE);
    console.log('✅ Blacklist cleared successfully.');
  } else {
    console.log('ℹ️  No blacklist file to clear.');
  }
}

function removeIP(ip) {
  const blacklist = loadBlacklist();
  if (!blacklist) return;

  if (blacklist[ip]) {
    delete blacklist[ip];
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
    console.log(`✅ Removed ${ip} from blacklist.`);
  } else {
    console.log(`❌ IP ${ip} not found in blacklist.`);
  }
}

function exportBlacklist(format = 'json') {
  const blacklist = loadBlacklist();
  if (!blacklist) return;

  const ips = Object.keys(blacklist);
  
  if (format === 'txt') {
    // Export as plain text list
    const outputFile = path.join(__dirname, 'data', 'blacklist.txt');
    fs.writeFileSync(outputFile, ips.join('\n'));
    console.log(`✅ Exported ${ips.length} IPs to ${outputFile}`);
  } else if (format === 'iptables') {
    // Export as iptables commands
    const outputFile = path.join(__dirname, 'data', 'blacklist_iptables.sh');
    const commands = ips.map(ip => `iptables -A INPUT -s ${ip} -j DROP`).join('\n');
    fs.writeFileSync(outputFile, '#!/bin/bash\n# Auto-generated IP blacklist\n\n' + commands);
    console.log(`✅ Exported iptables rules to ${outputFile}`);
  } else if (format === 'nginx') {
    // Export as nginx deny rules
    const outputFile = path.join(__dirname, 'data', 'blacklist_nginx.conf');
    const rules = ips.map(ip => `deny ${ip};`).join('\n');
    fs.writeFileSync(outputFile, '# Auto-generated IP blacklist\n\n' + rules);
    console.log(`✅ Exported nginx rules to ${outputFile}`);
  } else {
    console.log('✅ Blacklist is already in JSON format at:', BLACKLIST_FILE);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'clear':
    clearBlacklist();
    break;
  case 'remove':
    if (args[1]) {
      removeIP(args[1]);
    } else {
      console.log('Usage: node view_blacklist.js remove <ip_address>');
    }
    break;
  case 'export':
    exportBlacklist(args[1] || 'json');
    break;
  case 'help':
    console.log(`
IP Blacklist Management Tool

Usage:
  node view_blacklist.js              View blacklist
  node view_blacklist.js clear        Clear entire blacklist
  node view_blacklist.js remove <ip>  Remove specific IP
  node view_blacklist.js export <fmt> Export blacklist (txt|iptables|nginx)
  node view_blacklist.js help         Show this help

Examples:
  node view_blacklist.js
  node view_blacklist.js remove 203.0.113.45
  node view_blacklist.js export txt
  node view_blacklist.js export iptables
    `);
    break;
  default:
    displayBlacklist();
}

// Made with Bob

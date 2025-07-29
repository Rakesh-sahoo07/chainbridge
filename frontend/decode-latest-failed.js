const ethers = require('ethers');

const txData = '0xda907d083cb5f3b9ae4053c3bbaa4c42a874f01c1a9f6289bec0f6ed0c2b41d7cd5d825e31611371ac54683a98d4cc6ee0449d3a98b1af5afe69ba3542ea73101c2b7bd0000000000000000000000000c02165a362fae2a55d4341e71e262d6ad1c8f30100000000000000000000000000000000000000000000000000000000000f42400000000000000000000000007a265db61e004f4242fb322fa72f8a52d2b06664000000000000000000000000000000000000000000000000000000006888f0c9';

// Parse the transaction data
const iface = new ethers.Interface([
  'function initiateSwap(bytes32 swapId, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock)'
]);

const decoded = iface.parseTransaction({ data: txData });
console.log('LATEST FAILED TRANSACTION ANALYSIS (20min buffer):');
console.log('SwapId:', decoded.args[0]);
console.log('Hashlock:', decoded.args[1]); 
console.log('Recipient:', decoded.args[2]);
console.log('Amount:', decoded.args[3].toString());
console.log('Token:', decoded.args[4]);
console.log('Timelock:', decoded.args[5].toString());
console.log('Timelock as date:', new Date(Number(decoded.args[5]) * 1000).toISOString());

const currentTime = Math.floor(Date.now() / 1000);
const actualTimelock = Number(decoded.args[5]);
const timeDiff = actualTimelock - currentTime;

console.log('\n⏰ CURRENT TIMING STATUS:');
console.log('Current time now:', currentTime);
console.log('Current date now:', new Date().toISOString());
console.log('Timelock - Current now:', timeDiff, 'seconds');
console.log('Minutes from now:', (timeDiff / 60).toFixed(2));

console.log('\n🔍 CONTRACT VALIDATION ANALYSIS:');
console.log('Rule 1 - Must be in future:', timeDiff > 0 ? '✅ PASS' : '❌ FAIL');
console.log('Rule 2 - Must be >= 5 min (300s):', timeDiff >= 300 ? '✅ PASS' : '❌ FAIL');
console.log('Rule 3 - Must be <= 24h (86400s):', timeDiff <= 86400 ? '✅ PASS' : '❌ FAIL');

if (timeDiff < 300) {
  console.log('\n❌ PROBLEM: Timelock is only', timeDiff, 'seconds in future, but contract requires >= 300 seconds');
  console.log('🔧 SOLUTION: Need to increase the buffer or there\'s a timing sync issue');
}
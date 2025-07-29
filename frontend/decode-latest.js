const ethers = require('ethers');

const txData = '0xda907d08575656f99c068e34cb0c9cd3f593f5ff56bd60f36fce86c864d8d6e505e8ce1119ca1cec93be9f47d5b5cc3a03f207e3a81f18965bfa7bbcb4326609d8ddaa27000000000000000000000000c02165a362fae2a55d4341e71e262d6ad1c8f30100000000000000000000000000000000000000000000000000000000000f42400000000000000000000000007a265db61e004f4242fb322fa72f8a52d2b06664000000000000000000000000000000000000000000000000000000006888ec7e';

// Parse the transaction data
const iface = new ethers.Interface([
  'function initiateSwap(bytes32 swapId, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock)'
]);

const decoded = iface.parseTransaction({ data: txData });
console.log('LATEST FAILED TRANSACTION ANALYSIS:');
console.log('SwapId:', decoded.args[0]);
console.log('Hashlock:', decoded.args[1]); 
console.log('Recipient:', decoded.args[2]);
console.log('Amount:', decoded.args[3].toString());
console.log('Token:', decoded.args[4]);
console.log('Timelock:', decoded.args[5].toString());
console.log('Timelock as date:', new Date(Number(decoded.args[5]) * 1000).toISOString());
console.log('Current time:', Math.floor(Date.now() / 1000));
console.log('Current date:', new Date().toISOString());
const timeDiff = Number(decoded.args[5]) - Math.floor(Date.now() / 1000);
console.log('Timelock - Current:', timeDiff, 'seconds');
console.log('Minutes from now:', timeDiff / 60);
console.log('Is timelock in past?', timeDiff < 0);
console.log('Is timelock < 5 minutes?', timeDiff < 300);

// Analyze the specific validation rules
console.log('\n🔍 CONTRACT VALIDATION ANALYSIS:');
console.log('Rule 1 - Must be in future:', timeDiff > 0 ? '✅ PASS' : '❌ FAIL');
console.log('Rule 2 - Must be >= 5 min (300s):', timeDiff >= 300 ? '✅ PASS' : '❌ FAIL');
console.log('Rule 3 - Must be <= 24h (86400s):', timeDiff <= 86400 ? '✅ PASS' : '❌ FAIL');
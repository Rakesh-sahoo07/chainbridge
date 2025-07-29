const ethers = require('ethers');

const txData = '0xda907d08d991f94223f106c35a6883e881cf80475039563025c6166cc07e9fed06ef6cf80b81996a0609dd174081ef2ede33301b4b5b6be7dc3c0ca3162e65aeb7398609000000000000000000000000c02165a362fae2a55d4341e71e262d6ad1c8f30100000000000000000000000000000000000000000000000000000000000f42400000000000000000000000007a265db61e004f4242fb322fa72f8a52d2b06664000000000000000000000000000000000000000000000000000000006888ecee';

// Parse the transaction data
const iface = new ethers.Interface([
  'function initiateSwap(bytes32 swapId, bytes32 hashlock, address recipient, uint256 amount, address token, uint256 timelock)'
]);

const decoded = iface.parseTransaction({ data: txData });
console.log('CURRENT FAILED TRANSACTION ANALYSIS:');
console.log('SwapId:', decoded.args[0]);
console.log('Hashlock:', decoded.args[1]); 
console.log('Recipient:', decoded.args[2]);
console.log('Amount:', decoded.args[3].toString());
console.log('Token:', decoded.args[4]);
console.log('Timelock:', decoded.args[5].toString());
console.log('Timelock as date:', new Date(Number(decoded.args[5]) * 1000).toISOString());

// From the logs we know:
// currentTime: 1753803114 (when fresh timelock was generated)
// So let's check the timing
const loggedCurrentTime = 1753803114;
const actualTimelock = Number(decoded.args[5]);

console.log('\n🕒 TIMING ANALYSIS:');
console.log('Logged current time (when generated):', loggedCurrentTime);
console.log('Actual timelock sent:', actualTimelock);
console.log('Time difference:', actualTimelock - loggedCurrentTime, 'seconds');
console.log('Expected for 15min buffer:', 15 * 60, 'seconds');
console.log('Actual buffer was:', actualTimelock - loggedCurrentTime, 'seconds');

// Let's see what the current blockchain time might be
const currentTime = Math.floor(Date.now() / 1000);
console.log('\n⏰ CURRENT STATUS:');
console.log('Current time now:', currentTime);
console.log('Timelock - Current now:', actualTimelock - currentTime, 'seconds');
console.log('Is valid now?', actualTimelock - currentTime >= 300);

// Let's check if there might be a type issue
console.log('\n🔍 TYPE ANALYSIS:');
console.log('Timelock type:', typeof actualTimelock);
console.log('Timelock as hex:', '0x' + actualTimelock.toString(16));
console.log('Is integer?', Number.isInteger(actualTimelock));
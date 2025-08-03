import { useState } from 'react';
import { Aptos } from '@aptos-labs/ts-sdk';
import { useWallet } from '../contexts/WalletContext';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { ethers } from 'ethers';

export const useAptosContract = () => {
  const { aptosClient, walletState } = useWallet();
  const [loading, setLoading] = useState(false);

  const initiateSwap = async (
    swapId: string,
    hashlock: string,
    recipient: string,
    amount: string,
    timelock: number,
    coinType: 'APT' | 'mUSDC' = 'APT'
  ) => {
    if (!aptosClient || !walletState.aptos.connected) {
      throw new Error('Aptos client not available or wallet not connected');
    }

    console.log('🔧 Aptos initiateSwap called with:', {
      swapId: swapId.slice(0, 16) + '...',
      hashlock: hashlock.slice(0, 16) + '...',
      recipient: recipient.slice(0, 16) + '...',
      amount,
      timelock
    });

    try {
      setLoading(true);
      
      // Convert amount based on coin type
      const decimals = coinType === 'APT' ? 8 : 6; // APT has 8 decimals, mUSDC has 6
      const multiplier = Math.pow(10, decimals);
      const amountInSmallestUnit = Math.floor(parseFloat(amount) * multiplier);
      console.log(`💰 Amount in ${coinType === 'APT' ? 'octas' : 'micro-USDC'}:`, amountInSmallestUnit);
      
      // Pad Ethereum address to 64 characters for Aptos
      const paddedRecipient = recipient.replace('0x', '').padStart(64, '0');
      const aptosRecipient = '0x' + paddedRecipient;
      console.log('📍 Padded recipient address:', aptosRecipient);

      // Check account balance first to avoid insufficient balance errors
      const senderAddress = walletState.aptos.address;
      if (senderAddress) {
        const balance = await getAccountBalance(senderAddress);
        const balanceInSmallestUnit = Math.floor(parseFloat(balance) * multiplier);
        console.log('💰 Account balance check:', {
          address: senderAddress,
          balance: balance,
          balanceInSmallestUnit: balanceInSmallestUnit,
          requiredForTx: amountInSmallestUnit,
          coinType: coinType,
          sufficientBalance: balanceInSmallestUnit >= amountInSmallestUnit
        });
        
        if (balanceInSmallestUnit < amountInSmallestUnit) {
          throw new Error(`Insufficient ${coinType} balance. Required: ${amountInSmallestUnit}, Available: ${balanceInSmallestUnit}`);
        }
      }

      // Create transaction in Petra wallet's expected EntryFunctionPayload format
      // Move contract expects vector<u8> for bytes32 fields (swapId, hashlock)
      const functionName = coinType === 'APT' ? 'initiate_swap_apt' : 'initiate_swap_musdc';
      const transaction = {
        arguments: [
          Array.from(ethers.getBytes(swapId)), // swap_id as vector<u8> for Move contract
          Array.from(ethers.getBytes(hashlock)), // hashlock as vector<u8> for Move contract
          aptosRecipient, // recipient address as string
          amountInSmallestUnit.toString(), // amount as string (in smallest unit)
          timelock.toString() // timelock as string
        ],
        function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::generic_cross_chain_swap::${functionName}`,
        type: 'entry_function_payload',
        type_arguments: [], // empty for this function
        // Add explicit gas configuration to avoid out-of-gas errors
        gas_unit_price: '100', // 100 octas per gas unit (standard)
        max_gas_amount: '500000' // Increased gas limit for contract interactions
      };

      console.log('🔧 Created Move-compatible transaction:', transaction);
      console.log('📋 Arguments format:', {
        swapId: `Array of ${Array.from(ethers.getBytes(swapId)).length} bytes`,
        hashlock: `Array of ${Array.from(ethers.getBytes(hashlock)).length} bytes`,
        recipient: aptosRecipient,
        amount: amountInSmallestUnit.toString(),
        timelock: timelock.toString()
      });
      return transaction;
    } catch (error) {
      console.error('Failed to initiate Aptos swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeSwap = async (swapId: string, secret: string, coinType: 'APT' | 'mUSDC' = 'APT') => {
    if (!aptosClient || !walletState.aptos.connected) {
      throw new Error('Aptos client not available or wallet not connected');
    }

    try {
      setLoading(true);

      // Create transaction in Petra wallet's expected EntryFunctionPayload format
      // Move contract expects vector<u8> for bytes32 fields
      const functionName = coinType === 'APT' ? 'complete_swap_apt' : 'complete_swap_musdc';
      const transaction = {
        arguments: [
          Array.from(ethers.getBytes(swapId)), // swap_id as vector<u8> for Move contract
          Array.from(ethers.getBytes(secret))  // secret as vector<u8> for Move contract
        ],
        function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::generic_cross_chain_swap::${functionName}`,
        type: 'entry_function_payload',
        type_arguments: [],
        // Add explicit gas configuration to avoid out-of-gas errors
        gas_unit_price: '100', // 100 octas per gas unit (standard)
        max_gas_amount: '300000' // Gas limit for complete_swap function
      };

      return transaction;
    } catch (error) {
      console.error('Failed to complete Aptos swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refundSwap = async (swapId: string, coinType: 'APT' | 'mUSDC' = 'APT') => {
    if (!aptosClient || !walletState.aptos.connected) {
      throw new Error('Aptos client not available or wallet not connected');
    }

    try {
      setLoading(true);

      // Create transaction in Petra wallet's expected EntryFunctionPayload format
      // Move contract expects vector<u8> for bytes32 fields
      const functionName = coinType === 'APT' ? 'refund_apt' : 'refund_musdc';
      const transaction = {
        arguments: [
          Array.from(ethers.getBytes(swapId)) // swap_id as vector<u8> for Move contract
        ],
        function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::generic_cross_chain_swap::${functionName}`,
        type: 'entry_function_payload',
        type_arguments: [],
        // Add explicit gas configuration to avoid out-of-gas errors
        gas_unit_price: '100', // 100 octas per gas unit (standard)
        max_gas_amount: '250000' // Gas limit for refund function
      };

      return transaction;
    } catch (error) {
      console.error('Failed to refund Aptos swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getSwapDetails = async (swapId: string) => {
    if (!aptosClient) throw new Error('Aptos client not available');

    try {
      console.log('🔍 Checking swap details for swapId:', swapId);
      
      // Try to get swap details using view function
      // NOTE: View functions expect hex strings, not byte arrays
      const response = await aptosClient.view({
        payload: {
          function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::generic_cross_chain_swap::get_swap_details`,
          functionArguments: [swapId], // Use hex string directly, not byte array
          typeArguments: [],
        }
      });

      console.log('📋 Swap details response:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to get Aptos swap details:', error);
      console.error('🔍 This might indicate the swap does not exist yet');
      throw error;
    }
  };

  const verifySwapExists = async (swapId: string): Promise<boolean> => {
    try {
      console.log('🔍 Verifying swap exists for swapId:', swapId);
      
      // The investigation showed that SwapInitiated events are emitted successfully
      // but view function calls fail. This might be a timing issue or view function bug.
      // Let's add more detailed logging and multiple retry attempts
      
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts} to verify swap...`);
          await getSwapDetails(swapId);
          console.log('✅ Swap exists and is accessible');
          return true;
        } catch (error) {
          attempts++;
          console.log(`❌ Attempt ${attempts} failed:`, error instanceof Error ? error.message : 'Unknown error');
          
          if (attempts < maxAttempts) {
            console.log(`⏳ Waiting 3 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      console.log('❌ All verification attempts failed');
      console.log('💡 Note: Transaction may have succeeded but view function has issues');
      console.log('💡 Consider the swap created if initiate_swap transaction was successful');
      
      return false;
    } catch (error) {
      console.log('❌ Swap verification failed - swap may not exist yet');
      return false;
    }
  };

  const getAccountBalance = async (accountAddress: string) => {
    if (!aptosClient) throw new Error('Aptos client not available');

    try {
      const balance = await aptosClient.getAccountAPTAmount({
        accountAddress
      });
      return (balance / 100000000).toString(); // Convert octas to APT
    } catch (error) {
      console.error('Failed to get APT balance:', error);
      return '0';
    }
  };

  const submitTransaction = async (transaction: any) => {
    if (!window.aptos) throw new Error('Petra wallet not available');

    try {
      console.log('🔄 Submitting transaction to Petra wallet...');
      console.log('📋 Transaction details:', {
        function: transaction.function,
        gasUnitPrice: transaction.gas_unit_price,
        maxGasAmount: transaction.max_gas_amount,
        argumentsCount: transaction.arguments?.length
      });
      
      const response = await window.aptos.signAndSubmitTransaction(transaction);
      console.log('📝 Transaction submitted:', response.hash);
      
      if (aptosClient && response.hash) {
        console.log('⏳ Waiting for transaction confirmation on Aptos blockchain...');
        const result = await aptosClient.waitForTransaction({
          transactionHash: response.hash
        });
        console.log('✅ Transaction confirmed on blockchain:', {
          hash: result.hash,
          success: result.success,
          version: result.version,
          gasUsed: result.gas_used,
          vmStatus: result.vm_status
        });
        
        // Check if transaction actually succeeded and provide detailed error analysis
        if (!result.success) {
          console.error('❌ Transaction failed on blockchain:', result);
          
          // Analyze common error patterns based on Aptos docs
          let errorMessage = `Transaction failed: ${result.vm_status || 'Unknown error'}`;
          
          if (result.vm_status && result.vm_status.includes('INSUFFICIENT_BALANCE')) {
            errorMessage += '\n💡 Solution: Account needs more APT to cover gas fees. Add more APT to your wallet.';
          } else if (result.vm_status && result.vm_status.includes('OUT_OF_GAS')) {
            errorMessage += '\n💡 Solution: Transaction ran out of gas. Try increasing max_gas_amount or simplify the transaction.';
          } else if (result.vm_status && result.vm_status.includes('SEQUENCE_NUMBER')) {
            errorMessage += '\n💡 Solution: Sequence number issue. Wait a moment and try again.';
          } else if (result.vm_status && result.vm_status.includes('INVALID_ARGUMENT')) {
            errorMessage += '\n💡 Solution: Check function arguments format - ensure bytes32 fields are converted to vector<u8>.';
          } else if (result.vm_status && result.vm_status.includes('E_SWAP_NOT_EXISTS')) {
            errorMessage += '\n💡 Analysis: This is the E_SWAP_NOT_EXISTS error we\'ve been investigating.';
            errorMessage += '\n💡 Possible causes:';
            errorMessage += '\n   1. Move contract storage timing issue - swap not fully committed yet';
            errorMessage += '\n   2. SwapId format mismatch between initiate and complete functions';
            errorMessage += '\n   3. Contract bug in swap lookup logic';
            errorMessage += '\n💡 Next steps: Check if initiate_swap transaction was truly successful and emitted SwapInitiated event.';
          }
          
          throw new Error(errorMessage);
        }
        
        // Add extra wait to ensure state is updated
        console.log('⏳ Allowing extra time for blockchain state update...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second extra wait
        
        return result;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Failed to submit Aptos transaction:', error);
      
      // Enhance error reporting with Aptos-specific guidance
      if (error instanceof Error) {
        let enhancedMessage = error.message;
        
        if (error.message.includes('User rejected')) {
          enhancedMessage += '\n💡 User cancelled the transaction in Petra wallet.';
        } else if (error.message.includes('Network')) {
          enhancedMessage += '\n💡 Network connectivity issue. Check your internet connection and try again.';
        } else if (error.message.includes('gas')) {
          enhancedMessage += '\n💡 Gas-related error. The transaction may need more gas or account balance.';
        }
        
        throw new Error(enhancedMessage);
      }
      
      throw error;
    }
  };

  return {
    loading,
    initiateSwap,
    completeSwap,
    refundSwap,
    getSwapDetails,
    verifySwapExists,
    getAccountBalance,
    submitTransaction,
  };
};
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
    timelock: number
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
      
      // Convert amount to octas (APT has 8 decimals)
      const amountInOctas = Math.floor(parseFloat(amount) * 100000000);
      console.log('💰 Amount in octas:', amountInOctas);
      
      // Pad Ethereum address to 64 characters for Aptos
      const paddedRecipient = recipient.replace('0x', '').padStart(64, '0');
      const aptosRecipient = '0x' + paddedRecipient;
      console.log('📍 Padded recipient address:', aptosRecipient);

      const transaction = await aptosClient.transaction.build.simple({
        sender: walletState.aptos.address!,
        data: {
          function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::cross_chain_swap_aptos::initiate_swap`,
          typeArguments: [],
          functionArguments: [
            Array.from(ethers.getBytes(swapId)), // swap_id as bytes
            Array.from(ethers.getBytes(hashlock)), // hashlock as bytes
            aptosRecipient, // recipient address
            amountInOctas, // amount in octas
            timelock // timelock timestamp
          ],
        },
      });

      // This would need to be signed by the user's wallet
      // For now, we'll return the transaction for the wallet to sign
      return transaction;
    } catch (error) {
      console.error('Failed to initiate Aptos swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeSwap = async (swapId: string, secret: string) => {
    if (!aptosClient || !walletState.aptos.connected) {
      throw new Error('Aptos client not available or wallet not connected');
    }

    try {
      setLoading(true);

      const transaction = await aptosClient.transaction.build.simple({
        sender: walletState.aptos.address!,
        data: {
          function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::cross_chain_swap_aptos::complete_swap`,
          typeArguments: [],
          functionArguments: [
            Array.from(ethers.getBytes(swapId)), // swap_id as bytes
            Array.from(ethers.getBytes(secret)) // secret as bytes
          ],
        },
      });

      return transaction;
    } catch (error) {
      console.error('Failed to complete Aptos swap:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refundSwap = async (swapId: string) => {
    if (!aptosClient || !walletState.aptos.connected) {
      throw new Error('Aptos client not available or wallet not connected');
    }

    try {
      setLoading(true);

      const transaction = await aptosClient.transaction.build.simple({
        sender: walletState.aptos.address!,
        data: {
          function: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::cross_chain_swap_aptos::refund`,
          typeArguments: [],
          functionArguments: [
            Array.from(ethers.getBytes(swapId)) // swap_id as bytes
          ],
        },
      });

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
      // This would query the contract state for swap details
      // For now, we'll simulate the response
      const resource = await aptosClient.getAccountResource({
        accountAddress: CONTRACT_ADDRESSES.aptos.crossChainSwap,
        resourceType: `${CONTRACT_ADDRESSES.aptos.crossChainSwap}::cross_chain_swap_aptos::SwapRegistry`
      });

      return resource;
    } catch (error) {
      console.error('Failed to get Aptos swap details:', error);
      throw error;
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
      const response = await window.aptos.signAndSubmitTransaction(transaction);
      
      if (aptosClient) {
        const result = await aptosClient.waitForTransaction({
          transactionHash: response.hash
        });
        return result;
      }
      
      return response;
    } catch (error) {
      console.error('Failed to submit Aptos transaction:', error);
      throw error;
    }
  };

  return {
    loading,
    initiateSwap,
    completeSwap,
    refundSwap,
    getSwapDetails,
    getAccountBalance,
    submitTransaction,
  };
};
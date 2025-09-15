'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractArtifact from '../contracts/PreSale.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = contractArtifact.abi;

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [currentPhase, setCurrentPhase] = useState('0');
  const [currentPrice, setCurrentPrice] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokenAmount, setTokenAmount] = useState('');
  const [requiredETH, setRequiredETH] = useState('0');
  const [loading, setLoading] = useState(false);
  const [totalSold, setTotalSold] = useState('0');

  // Fallback provider to Hardhat node
  const fallbackProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  const loadContractData = async (contractInstance: ethers.Contract, userAccount: string) => {
    try {
      const phase = await contractInstance.currentPhase();
      const price = await contractInstance.getCurrentPrice();
      const balance = await contractInstance.getTokenBalance(userAccount);
      const sold = await contractInstance.totalTokensSold();

      setCurrentPhase(phase.toString());
      setCurrentPrice(ethers.formatEther(price));
      setTokenBalance(ethers.formatEther(balance));
      setTotalSold(ethers.formatEther(sold));
    } catch (error) {
      console.error('Error loading contract data:', error);
      setCurrentPhase('0');
      setCurrentPrice('0');
      setTokenBalance('0');
      setTotalSold('0');
    }
  };

  const connectWallet = async () => {
    try {
      let signer;
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        if (network.chainId !== 31337) {
          // Switch to Hardhat network
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          });
        }

        const accounts = await provider.send('eth_requestAccounts', []);
        signer = await provider.getSigner();
        setAccount(accounts[0]);
      } else {
        // Fallback signer
        signer = fallbackProvider.getSigner(0);
        const addr = await signer.getAddress();
        setAccount(addr);
        alert('MetaMask not found, using fallback Hardhat account 0');
      }

      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);

      await loadContractData(contractInstance, await signer.getAddress());
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    }
  };

  // Calculate required ETH
  useEffect(() => {
    const calculateETH = async () => {
      if (contract && tokenAmount && parseFloat(tokenAmount) > 0) {
        try {
          const tokenWei = ethers.parseEther(tokenAmount);
          const ethRequired = await contract.calculateETHForTokens(tokenWei);
          setRequiredETH(ethers.formatEther(ethRequired));
        } catch {
          setRequiredETH('0');
        }
      } else {
        setRequiredETH('0');
      }
    };
    calculateETH();
  }, [tokenAmount, contract]);

  const buyTokens = async () => {
    if (!contract || !tokenAmount || parseFloat(tokenAmount) <= 0) {
      alert('Please enter a valid token amount');
      return;
    }
    try {
      setLoading(true);
      const tokenWei = ethers.parseEther(tokenAmount);
      const ethRequired = ethers.parseEther(requiredETH);

      const tx = await contract.buyTokensAmount(tokenWei, { value: ethRequired });
      await tx.wait();
      alert('Tokens purchased successfully!');
      await loadContractData(contract, account);
      setTokenAmount('');
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      alert('Failed to buy tokens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setContract(null);
    setCurrentPhase('0');
    setCurrentPrice('0');
    setTokenBalance('0');
    setTotalSold('0');
    setTokenAmount('');
    setRequiredETH('0');
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto p-6 bg-white">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Token PreSale</h1>

        <div className="border border-gray-300 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Wallet</h2>
          {account ? (
            <div>
              <p className="text-gray-600 mb-2">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <p className="text-gray-600 mb-3">Your Tokens: {tokenBalance}</p>
              <button onClick={disconnectWallet} className="bg-gray-600 text-white px-4 py-2 hover:bg-gray-500 text-sm">Disconnect</button>
            </div>
          ) : (
            <button onClick={connectWallet} className="bg-gray-800 text-white px-4 py-2 hover:bg-gray-700">Connect Wallet</button>
          )}
        </div>

        {account && (
          <div className="border border-gray-300 p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">PreSale Information</h2>
            <div className="space-y-1">
              <p className="text-gray-600">Current Phase: {currentPhase}</p>
              <p className="text-gray-600">Price per Token: {currentPrice} ETH</p>
              <p className="text-gray-600">Total Tokens Sold: {totalSold}</p>
            </div>
          </div>
        )}

        {account && (
          <div className="border border-gray-300 p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Buy Tokens</h2>
            <div className="mb-4">
              <label className="block text-gray-600 mb-2">Token Amount:</label>
              <input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="Enter token amount" className="w-full border border-gray-300 p-2 focus:border-gray-500 outline-none"
                step="0.001" min="0" />
            </div>
            {requiredETH !== '0' && tokenAmount && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200">
                <p className="text-gray-700 font-medium">Required ETH: {requiredETH}</p>
              </div>
            )}
            <button onClick={buyTokens} disabled={loading || !tokenAmount || parseFloat(tokenAmount) <= 0}
              className={`w-full px-4 py-3 text-white font-medium ${loading || !tokenAmount || parseFloat(tokenAmount) <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700'}`}>
              {loading ? 'Purchasing...' : 'Buy Tokens'}
            </button>
          </div>
        )}

        {!account && (
          <div className="border border-gray-300 p-4 bg-gray-50">
            <h3 className="text-gray-700 font-semibold mb-2">Instructions:</h3>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• Install MetaMask browser extension</li>
              <li>• Connect to localhost:8545 network</li>
              <li>• Import test account from Hardhat node</li>
              <li>• Click "Connect Wallet" to start</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

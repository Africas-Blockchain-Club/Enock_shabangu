import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import EthRewardPoolAbi from "./contracts/EthRewardPool.json"; 
import "./App.css";


const CONTRACT_ADDRESS = "0x80Ac49198ad789E7F4F3B43e2f5175d8F37d282e"; 
const SEPOLIA_CHAIN_ID = "0xaa36a7"; 
//state management
function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState({ join: false, distribute: false, reset: false, connect: false });
  const [isOwner, setIsOwner] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [userHasJoined, setUserHasJoined] = useState(false);

  const [stats, setStats] = useState({
    balance: "0",
    round: "0",
    lastWinner: "None",
    participants: [],
  });

  const fetchData = useCallback(async (instance) => {
    try {
      const [participants, bal, rId, start, duration, ownerAddr] = await Promise.all([
        instance.getParticipants(),
        instance.getPoolBalance(),
        instance.roundId(),
        instance.roundStart(),
        instance.ROUND_DURATION(),
        instance.owner()
      ]);

      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(start) + Number(duration) - now;
      setTimeLeft(remaining > 0 ? remaining : 0);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentAddr = await signer.getAddress();
      
      setIsOwner(ownerAddr.toLowerCase() === currentAddr.toLowerCase());
      
      
      const lastRoundUserJoined = await instance.lastJoinedRound(currentAddr);
      setUserHasJoined(Number(lastRoundUserJoined) === Number(rId));

      let winner = "Waiting for Round...";
      if (Number(rId) > 1) {
        winner = await instance.getRewardRecipient(Number(rId) - 1);
      }

      setStats({
        participants,
        balance: ethers.formatEther(bal),
        round: rId.toString(),
        lastWinner: winner === ethers.ZeroAddress ? "No Winner" : winner,
      });
    } catch (err) {
      console.error("Blockchain Fetch Error:", err);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  const connectWallet = async () => {
    setLoading(prev => ({ ...prev, connect: true }));
    try {
      if (!window.ethereum) return alert("MetaMask not found");
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const instance = new ethers.Contract(CONTRACT_ADDRESS, EthRewardPoolAbi, signer);

      setAccount(address);
      setContract(instance);
      fetchData(instance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, connect: false }));
    }
  };

  const handleAction = async (actionType) => {
    setLoading(prev => ({ ...prev, [actionType]: true }));
    try {
      let tx;
      if (actionType === 'join') {
        tx = await contract.joinPool({ value: ethers.parseEther("0.01"), gasLimit: 150000 });
      } else if (actionType === 'distribute') {
        tx = await contract.distributeReward({ gasLimit: 300000 });
      } else if (actionType === 'reset') {
        tx = await contract.emergencyReset({ gasLimit: 100000 });
      }
      
      await tx.wait();
      setTimeout(() => fetchData(contract), 1500);
    } catch (err) {
      console.error("Transaction Error:", err);
      alert(err.reason || "Transaction failed. If the pool is empty and time is 0:00, use Emergency Reset.");
    } finally {
      setLoading(prev => ({ ...prev, [actionType]: false }));
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="centered-wrapper">
      <nav className="navbar">
        <div className="brand">ETH<span>POOL</span></div>
        {!account ? (
          <button className="connect-btn" onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div className="user-pill">
            ● {account.slice(0,6)}...{account.slice(-4)}
            {isOwner && <span className="owner-badge">Owner</span>}
          </div>
        )}
      </nav>

      <div className="dashboard-grid">
        <div className="stat-card">
          <label>Total Pool</label>
          <div className="value">{stats.balance} ETH</div>
        </div>

        <div className="stat-card">
          <label>Round Timer</label>
          <div className={`value ${timeLeft === 0 ? "expired" : "timer"}`}>
            {timeLeft > 0 ? formatTime(timeLeft) : "0:00"}
          </div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${(timeLeft / 600) * 100}%` }}></div>
          </div>
        </div>

        <div className="main-display">
          <h2>Round #{stats.round}</h2>
          
          <div className="winner-box">
            <label>Previous Winner</label>
            <p className="winner-address">{stats.lastWinner}</p>
          </div>
          
          <div className="action-area">
            {/* JOIN BUTTON */}
            <button 
              className="action-btn join-btn" 
              onClick={() => handleAction('join')}
              disabled={
                loading.join || 
                !account || 
                userHasJoined || 
                (timeLeft === 0 && stats.participants.length > 0) 
              }
            >
              {loading.join ? "Processing..." : 
               userHasJoined ? "Entered ✓" :
               (timeLeft > 0 || stats.participants.length === 0) ? "Join Pool (0.01 ETH)" : "Wait for Reset"}
            </button>

            {/* ADMIN CONTROLS:Distribute and Reset */}
            {isOwner && (
              <div className="admin-group">
                {stats.participants.length > 0 ? (
                  <button 
                    className="action-btn admin-btn" 
                    onClick={() => handleAction('distribute')}
                    disabled={loading.distribute || timeLeft > 0}
                  >
                    {loading.distribute ? "Rewarding..." : "Distribute & Start New"}
                  </button>
                ) : (
                  <button 
                    className="action-btn reset-btn" 
                    onClick={() => handleAction('reset')}
                    disabled={loading.reset || timeLeft > 0}
                  >
                    {loading.reset ? "Resetting..." : "Emergency Reset"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="participants-card">
          <h3>Players ({stats.participants.length})</h3>
          <div className="address-list">
            {stats.participants.map((p, i) => (
              <div key={i} className={`address-item ${p.toLowerCase() === account.toLowerCase() ? 'me' : ''}`}>
                {p.slice(0,12)}...{p.slice(-10)}
              </div>
            ))}
            {stats.participants.length === 0 && <div className="empty-msg">No players yet. Be the first!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
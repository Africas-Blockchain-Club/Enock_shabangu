import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";
import EnterLottery from "./components/EnterLottery";
import Withdraw from "./components/Withdraw";
import WinningNumbers from "./components/WinningNumbers";

export default function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contractRead, setContractRead] = useState(null);
  const [contractWrite, setContractWrite] = useState(null);

  const [lotteryState, setLotteryState] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [poolBalance, setPoolBalance] = useState("0.0");
  const [userWinnings, setUserWinnings] = useState(0n);

  const [autoDrawing, setAutoDrawing] = useState(false);

  
  // CONNECT WALLET                
  

  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask");

    const _provider = new ethers.BrowserProvider(window.ethereum);
    const _signer = await _provider.getSigner();
    const _address = await _signer.getAddress();

    const readContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      _provider
    );

    const writeContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      _signer
    );

    setAccount(_address);
    setProvider(_provider);
    setSigner(_signer);
    setContractRead(readContract);
    setContractWrite(writeContract);
  }

  
  // REFRESH DATA 
  

  const refreshData = useCallback(async () => {
    if (!contractRead || !provider || !account) return;

    try {
      const [balance, state, remaining, winnings] = await Promise.all([
        provider.getBalance(CONTRACT_ADDRESS),
        contractRead.state(),
        contractRead.getTimeUntilNextDraw(),
        contractRead.winnings(account),
      ]);

      setPoolBalance(ethers.formatEther(balance));
      setLotteryState(Number(state));
      setTimeLeft(Number(remaining));
      setUserWinnings(BigInt(winnings.toString()));
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }, [contractRead, provider, account]);

  
  // AUTO TIMER + AUTO DRAW   
  

  useEffect(() => {
    if (!contractRead || !contractWrite) return;

    const interval = setInterval(async () => {
      try {
        const [remaining, state] = await Promise.all([
          contractRead.getTimeUntilNextDraw(),
          contractRead.state(),
        ]);

        const time = Number(remaining);
        const currentState = Number(state);

        setTimeLeft(time);
        setLotteryState(currentState);

        // SAFE AUTO DRAW
        if (
          time === 0 &&
          currentState === 0 && // OPEN
          !autoDrawing
        ) {
          setAutoDrawing(true);

          try {
            const tx = await contractWrite.draw();
            await tx.wait();
          } catch (err) {
            console.log(
              "Auto draw skipped:",
              err.reason || err.message
            );
          }

          setAutoDrawing(false);
        }
      } catch (err) {
        console.error("Timer error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contractRead, contractWrite, autoDrawing]);

 
  // CONTRACT EVENT LISTENERS     
  

  useEffect(() => {
    if (!contractRead) return;

    const update = () => refreshData();

    contractRead.on("Entered", update);
    contractRead.on("PrizeDistributed", update);
    contractRead.on("WinningNumbers", update);

    return () => {
      contractRead.removeAllListeners();
    };
  }, [contractRead, refreshData]);

  
  // INITIAL LOAD 
 

  useEffect(() => {
    refreshData();
  }, [refreshData]);

 //ui
  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-blue-500">
          VAULT LOTTO
        </h1>

        {!account ? (
          <button
            onClick={connectWallet}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl font-bold"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            {account.slice(0, 6)}...
            {account.slice(-4)}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-slate-800 p-8 rounded-3xl">
            <h2 className="text-gray-400 text-xs uppercase mb-2">
              Jackpot Pool
            </h2>
            <p className="text-6xl font-black">
              {poolBalance} ETH
            </p>

            <h2 className="text-gray-400 text-xs uppercase mt-6 mb-2">
              Draw Timer
            </h2>
            <p className="text-5xl font-mono">
              {timeLeft > 0
                ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
                    .toString()
                    .padStart(2, "0")}`
                : "0:00"}
            </p>

            <div className="mt-4 text-sm">
              Status:{" "}
              <span className="font-bold">
                {lotteryState === 0
                  ? "OPEN"
                  : "CALCULATING"}
              </span>
            </div>
          </div>

          <WinningNumbers provider={provider} />
        </div>

        <div className="space-y-6">
          <EnterLottery
            signer={signer}
            lotteryState={lotteryState}
            onSuccess={refreshData}
          />

          <Withdraw
            signer={signer}
            userWinnings={userWinnings}
            onSuccess={refreshData}
          />
        </div>
      </main>
    </div>
  );
}

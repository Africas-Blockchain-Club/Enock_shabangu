import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export default function Withdraw({
  signer,
  userWinnings,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  async function claimWinnings() {
    if (!signer) return alert("Connect wallet first");
    if (loading) return;

    try {
      setLoading(true);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const tx = await contract.claim();
      await tx.wait();

      alert("Winnings claimed successfully!");

      if (onSuccess) {
        await onSuccess(); // refresh  data
      }
    } catch (err) {
      console.error("Claim failed:", err);

      alert(
        err?.reason ||
          err?.message ||
          "Transaction failed"
      );
    }

    setLoading(false);
  }

  // Ensure safe BigInt handling
  const winningsBigInt =
    typeof userWinnings === "bigint"
      ? userWinnings
      : 0n;

  const formattedWinnings =
    winningsBigInt > 0n
      ? ethers.formatEther(winningsBigInt)
      : "0.0";

  return (
    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">
        Your Winnings
      </h3>

      <p className="text-4xl font-black text-green-400 mb-6">
        {formattedWinnings} ETH
      </p>

      <button
        onClick={claimWinnings}
        disabled={winningsBigInt === 0n || loading}
        className="w-full py-4 rounded-2xl bg-green-600 font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {loading
          ? "Claiming..."
          : winningsBigInt === 0n
          ? "NO WINNINGS"
          : "WITHDRAW"}
      </button>
    </div>
  );
}

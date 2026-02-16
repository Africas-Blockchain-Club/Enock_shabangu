import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export default function EnterLottery({
  signer,
  lotteryState,
  onSuccess,
}) {
  const [numbers, setNumbers] = useState(Array(7).fill(""));
  const [loading, setLoading] = useState(false);

  const handleChange = (index, value) => {
    const updated = [...numbers];
    updated[index] = value;
    setNumbers(updated);
  };

  async function enterLottery() {
    if (!signer) return alert("Connect wallet first");
    if (loading) return;

    // Validate numbers
    const parsed = numbers.map((n) => Number(n));
    if (
      parsed.some((n) => isNaN(n) || n < 1 || n > 49)
    ) {
      return alert("Numbers must be between 1 and 49");
    }

    setLoading(true);

    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const price = await contract.ticketPrice();

      const tx = await contract.enter(parsed, {
        value: price,
      });

      await tx.wait();

      alert("Ticket purchased!");
      setNumbers(Array(7).fill(""));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Entry failed:", err);
      alert(err?.reason || err?.message || "Transaction failed");
    }

    setLoading(false);
  }

  return (
    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
      <h3 className="text-xl font-bold mb-4">
        Pick 7 Numbers (1–49)
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {numbers.map((num, i) => (
          <input
            key={i}
            type="number"
            min="1"
            max="49"
            value={num}
            onChange={(e) =>
              handleChange(i, e.target.value)
            }
            className="bg-slate-900 border border-slate-600 p-3 rounded-xl text-center font-bold"
          />
        ))}
      </div>

      <button
        onClick={enterLottery}
        disabled={lotteryState !== 0 || loading}
        className="w-full py-4 rounded-2xl bg-blue-600 font-bold hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading
          ? "Processing..."
          : lotteryState === 0
          ? "BUY TICKET"
          : "DRAWING..."}
      </button>
    </div>
  );
}

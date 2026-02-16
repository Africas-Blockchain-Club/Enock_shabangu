import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contract";

export default function WinningNumbers({ provider }) {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchWinningNumbers(contract) {
    try {
      setLoading(true);

      const result = await contract.getWinningNumbers();

      if (!result || result.length === 0) {
        setNumbers([]);
        return;
      }

      // Convert BigInt safely
      const formatted = result.map((num) =>
        Number(num.toString())
      );

      setNumbers(formatted);
    } catch (err) {
      console.log("No winning numbers yet.");
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!provider) return;

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    // Initial fetch
    fetchWinningNumbers(contract);

    // Listen for new draw event
    const handleNewNumbers = () => {
      fetchWinningNumbers(contract);
    };

    contract.on("WinningNumbers", handleNewNumbers);

    return () => {
      contract.off("WinningNumbers", handleNewNumbers);
    };
  }, [provider]);

  return (
    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">
        Last Winning Numbers
      </h3>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : numbers.length === 0 ? (
        <p className="text-gray-500">
          No draw completed yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {numbers.map((num, index) => (
            <div
              key={index}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg shadow-lg"
            >
              {num}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

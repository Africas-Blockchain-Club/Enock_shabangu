export const CONTRACT_ADDRESS = "0xBe89A562d0bF0d554f4cfB57c83B69B4b1E54483";

export const CONTRACT_ABI = [
  "event Entered(address indexed player)",
  "event PrizeDistributed(uint256 totalPrizePool, uint256 rollover)",
  "event WinningNumbers(uint8[7] numbers)",
  "function enter(uint8[7] numbers) external payable",
  "function draw() external",
  "function state() view returns (uint8)",
  "function rolloverPool() view returns (uint256)",
  "function winnings(address user) view returns (uint256)",
  "function getTimeUntilNextDraw() view returns (uint256)",
  "function getWinningNumbers() view returns (uint8[7])",
  "function ticketPrice() view returns (uint256)",
  "function claim() external"
];
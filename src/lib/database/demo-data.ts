import type { Asset } from "@/types/domain/asset";
import type { Transaction } from "@/types/domain/transaction";
import type { Goal } from "@/types/domain/goal";
import type { FixedDeposit } from "@/types/domain/fixed-deposit";
import type { NPSAccount, NPSContribution } from "@/types/domain/nps";
import type { PPFAccount } from "@/types/domain/ppf";
import type { BankAccount } from "@/types/domain/bank-account";
import type { Liability } from "@/types/domain/liability";
import type { WatchlistItem } from "@/types/domain/watchlist";
import type { PortfolioSnapshot } from "@/types/domain/snapshot";

/**
 * DEMO / DEVELOPMENT SEED DATA — fictional, not the user's real financial
 * information (see MASTER PROMPT "Demo Data"). This module is the fallback
 * data source repositories use when no Supabase project is configured
 * (isDemoMode() === true). It is an in-memory mutable store, module-scoped,
 * and resets on server restart — a real Supabase project is required for
 * anything to persist. It exists purely so the app is explorable out of
 * the box; it is NOT a second production data path.
 */

let idCounter = 1000;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const nowISO = now.toISOString();

export const demoAssets: Asset[] = [
  { id: "asset-hdfc", symbol: "HDFCBANK", name: "HDFC Bank Ltd", assetType: "stock_in", currency: "INR", exchange: "NSE", sector: "Financial Services", country: "India", isin: "INE040A01034", currentPrice: 1725.4, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(400), updatedAt: nowISO },
  { id: "asset-infy", symbol: "INFY", name: "Infosys Ltd", assetType: "stock_in", currency: "INR", exchange: "NSE", sector: "Information Technology", country: "India", isin: "INE009A01021", currentPrice: 1842.15, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(400), updatedAt: nowISO },
  { id: "asset-aapl", symbol: "AAPL", name: "Apple Inc.", assetType: "stock_us", currency: "USD", exchange: "NASDAQ", sector: "Technology", country: "United States", isin: "US0378331005", currentPrice: 231.2, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(380), updatedAt: nowISO },
  { id: "asset-niftybees", symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", assetType: "etf", currency: "INR", exchange: "NSE", sector: null, country: "India", isin: "INF204KB14I2", currentPrice: 268.9, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(350), updatedAt: nowISO },
  { id: "asset-parag", symbol: "PARAGFLEXI", name: "Parag Parikh Flexi Cap Fund", assetType: "mutual_fund", currency: "INR", exchange: null, sector: null, country: "India", isin: null, currentPrice: 82.35, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(500), updatedAt: nowISO },
  { id: "asset-btc", symbol: "BTC", name: "Bitcoin", assetType: "crypto", currency: "INR", exchange: null, sector: null, country: null, isin: null, currentPrice: 8_650_000, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(300), updatedAt: nowISO },
  { id: "asset-eth", symbol: "ETH", name: "Ethereum", assetType: "crypto", currency: "INR", exchange: null, sector: null, country: null, isin: null, currentPrice: 310_000, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(300), updatedAt: nowISO },
  { id: "asset-tcs", symbol: "TCS", name: "Tata Consultancy Services", assetType: "stock_in", currency: "INR", exchange: "NSE", sector: "Information Technology", country: "India", isin: "INE467B01029", currentPrice: 4120.0, currentPriceUpdatedAt: nowISO, isActive: true, notes: null, createdAt: daysAgo(200), updatedAt: nowISO },
];

export const demoTransactions: Transaction[] = [
  { id: "txn-1", assetId: "asset-hdfc", transactionType: "BUY", quantity: 30, price: 1420, fees: 45, taxes: 12, transactionDate: daysAgo(390), broker: "Zerodha", notes: null, createdAt: daysAgo(390), updatedAt: daysAgo(390) },
  { id: "txn-2", assetId: "asset-hdfc", transactionType: "BUY", quantity: 20, price: 1550, fees: 32, taxes: 9, transactionDate: daysAgo(250), broker: "Zerodha", notes: null, createdAt: daysAgo(250), updatedAt: daysAgo(250) },
  { id: "txn-3", assetId: "asset-hdfc", transactionType: "SELL", quantity: 15, price: 1680, fees: 28, taxes: 8, transactionDate: daysAgo(60), broker: "Zerodha", notes: "Partial profit booking", createdAt: daysAgo(60), updatedAt: daysAgo(60) },
  { id: "txn-4", assetId: "asset-infy", transactionType: "BUY", quantity: 40, price: 1510, fees: 40, taxes: 11, transactionDate: daysAgo(340), broker: "Zerodha", notes: null, createdAt: daysAgo(340), updatedAt: daysAgo(340) },
  { id: "txn-5", assetId: "asset-infy", transactionType: "BUY", quantity: 20, price: 1690, fees: 22, taxes: 6, transactionDate: daysAgo(120), broker: "Zerodha", notes: null, createdAt: daysAgo(120), updatedAt: daysAgo(120) },
  { id: "txn-6", assetId: "asset-aapl", transactionType: "BUY", quantity: 12, price: 178.5, fees: 5, taxes: 0, transactionDate: daysAgo(300), broker: "IBKR", notes: null, createdAt: daysAgo(300), updatedAt: daysAgo(300) },
  { id: "txn-7", assetId: "asset-aapl", transactionType: "BUY", quantity: 8, price: 205.2, fees: 4, taxes: 0, transactionDate: daysAgo(150), broker: "IBKR", notes: null, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
  { id: "txn-8", assetId: "asset-niftybees", transactionType: "BUY", quantity: 500, price: 220, fees: 60, taxes: 15, transactionDate: daysAgo(330), broker: "Zerodha", notes: null, createdAt: daysAgo(330), updatedAt: daysAgo(330) },
  { id: "txn-9", assetId: "asset-niftybees", transactionType: "BUY", quantity: 300, price: 245, fees: 38, taxes: 10, transactionDate: daysAgo(180), broker: "Zerodha", notes: null, createdAt: daysAgo(180), updatedAt: daysAgo(180) },
  { id: "txn-10", assetId: "asset-parag", transactionType: "BUY", quantity: 2500, price: 62.4, fees: 0, taxes: 0, transactionDate: daysAgo(480), broker: "Direct - MFU", notes: "SIP lumpsum top-up", createdAt: daysAgo(480), updatedAt: daysAgo(480) },
  { id: "txn-11", assetId: "asset-parag", transactionType: "BUY", quantity: 800, price: 74.1, fees: 0, taxes: 0, transactionDate: daysAgo(90), broker: "Direct - MFU", notes: null, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
  { id: "txn-12", assetId: "asset-btc", transactionType: "BUY", quantity: 0.08, price: 5_400_000, fees: 400, taxes: 0, transactionDate: daysAgo(280), broker: "CoinDCX", notes: null, createdAt: daysAgo(280), updatedAt: daysAgo(280) },
  { id: "txn-13", assetId: "asset-btc", transactionType: "BUY", quantity: 0.04, price: 7_100_000, fees: 250, taxes: 0, transactionDate: daysAgo(100), broker: "CoinDCX", notes: null, createdAt: daysAgo(100), updatedAt: daysAgo(100) },
  { id: "txn-14", assetId: "asset-eth", transactionType: "BUY", quantity: 1.2, price: 210_000, fees: 300, taxes: 0, transactionDate: daysAgo(260), broker: "CoinDCX", notes: null, createdAt: daysAgo(260), updatedAt: daysAgo(260) },
  { id: "txn-15", assetId: "asset-tcs", transactionType: "BUY", quantity: 10, price: 3850, fees: 30, taxes: 8, transactionDate: daysAgo(150), broker: "Zerodha", notes: null, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
];

export const demoGoals: Goal[] = [
  { id: "goal-1", name: "Emergency Fund", targetAmount: 600_000, currentAmount: 420_000, targetDate: daysAgo(-180), category: "Safety", description: "6 months of expenses in a liquid fund", createdAt: daysAgo(400), updatedAt: nowISO },
  { id: "goal-2", name: "Japan Trip", targetAmount: 350_000, currentAmount: 140_000, targetDate: daysAgo(-300), category: "Travel", description: null, createdAt: daysAgo(200), updatedAt: nowISO },
  { id: "goal-3", name: "Down Payment", targetAmount: 4_000_000, currentAmount: 900_000, targetDate: daysAgo(-1100), category: "Home", description: "2BHK down payment target", createdAt: daysAgo(500), updatedAt: nowISO },
];

export const demoFixedDeposits: FixedDeposit[] = [
  { id: "fd-1", institution: "HDFC Bank", principal: 300_000, interestRate: 7.1, startDate: daysAgo(400), maturityDate: daysAgo(-330), tenureMonths: 24, payoutType: "cumulative", maturityAmount: null, status: "active", withdrawalDate: null, withdrawalAmount: null, notes: null, createdAt: daysAgo(400), updatedAt: nowISO },
  { id: "fd-2", institution: "SBI", principal: 150_000, interestRate: 6.8, startDate: daysAgo(200), maturityDate: daysAgo(-165), tenureMonths: 12, payoutType: "cumulative", maturityAmount: null, status: "active", withdrawalDate: null, withdrawalAmount: null, notes: null, createdAt: daysAgo(200), updatedAt: nowISO },
  { id: "fd-3", institution: "ICICI Bank", principal: 200_000, interestRate: 7.25, startDate: daysAgo(60), maturityDate: daysAgo(-1005), tenureMonths: 36, payoutType: "cumulative", maturityAmount: null, status: "active", withdrawalDate: null, withdrawalAmount: null, notes: "Senior citizen scheme for parent, tracked here for the family view", createdAt: daysAgo(60), updatedAt: nowISO },
];

export const demoNPSAccounts: NPSAccount[] = [
  {
    id: "nps-1",
    tier: "Tier I",
    pensionFundManager: "HDFC Pension Fund",
    schemePreference: "Auto Choice — Moderate (LC50)",
    pran: null,
    currentCorpus: 480_000,
    expectedAnnualReturn: 10,
    monthlyContribution: 8000,
    annualContributionIncrease: 8,
    retirementYear: new Date().getFullYear() + 25,
    createdAt: daysAgo(500),
    updatedAt: nowISO,
  },
  {
    id: "nps-2",
    tier: "Tier II",
    pensionFundManager: "HDFC Pension Fund",
    schemePreference: "Active Choice",
    pran: null,
    currentCorpus: 60_000,
    expectedAnnualReturn: 9,
    monthlyContribution: 2000,
    annualContributionIncrease: 0,
    retirementYear: null,
    createdAt: daysAgo(200),
    updatedAt: nowISO,
  },
];

export const demoNPSContributions: NPSContribution[] = [
  { id: "npsc-1", npsAccountId: "nps-1", contributionDate: daysAgo(30), employeeAmount: 4000, employerAmount: 4000, notes: null, createdAt: daysAgo(30) },
  { id: "npsc-2", npsAccountId: "nps-1", contributionDate: daysAgo(60), employeeAmount: 4000, employerAmount: 4000, notes: null, createdAt: daysAgo(60) },
  { id: "npsc-3", npsAccountId: "nps-1", contributionDate: daysAgo(90), employeeAmount: 4000, employerAmount: 4000, notes: null, createdAt: daysAgo(90) },
];

export const demoWatchlist: WatchlistItem[] = [
  { id: "wl-1", assetId: "asset-tcs", asset: demoAssets.find((a) => a.id === "asset-tcs")!, targetPrice: 3600, stopLoss: null, note: "Add on dips below 3600", createdAt: daysAgo(90), updatedAt: nowISO },
];

export const demoPPFAccounts: PPFAccount[] = [
  { id: "ppf-1", accountNumber: null, currentBalance: 540_000, totalContributed: 450_000, totalWithdrawn: 0, interestRate: 7.1, openDate: daysAgo(1800), yearlyContribution: 150_000, notes: null, createdAt: daysAgo(1800), updatedAt: nowISO },
];

export const demoBankAccounts: BankAccount[] = [
  { id: "bank-1", bankName: "HDFC Bank", accountType: "savings", currentBalance: 85_000, notes: null, createdAt: daysAgo(500), updatedAt: nowISO },
  { id: "bank-2", bankName: "ICICI Bank", accountType: "salary", currentBalance: 35_000, notes: null, createdAt: daysAgo(400), updatedAt: nowISO },
];

// Simple synthetic snapshot history so Analytics/Performance charts have
// something to render out of the box. A real project would accumulate
// these organically (see snapshot.service.ts).
// Deliberately empty — see price-history.repository.ts. Never fabricated;
// this fills in as you use Refresh Prices / Edit Asset's price field.
export const demoPriceHistory: import("@/types/domain/price-history").PriceHistoryPoint[] = [];

export const demoSnapshots: PortfolioSnapshot[] = Array.from({ length: 40 }, (_, i) => {
  const daysBack = (39 - i) * 9;
  const drift = 1 + (39 - daysBack / 9) * 0.006;
  const noise = 1 + Math.sin(i / 3) * 0.015;
  const netWorth = 3_150_000 * drift * noise;
  return {
    id: `snap-${i}`,
    snapshotDate: daysAgo(daysBack),
    netWorth: Math.round(netWorth),
    investedCapital: 2_450_000,
    securitiesValue: Math.round(netWorth * 0.58),
    realizedPnl: 42_000,
    unrealizedPnl: Math.round(netWorth * 0.58 - 2_450_000 * 0.75),
    fdValue: 650_000,
    npsValue: Math.round(470_000 + i * 350),
    ppfValue: 540_000,
    cashValue: 120_000,
    allocationSnapshot: {} as PortfolioSnapshot["allocationSnapshot"],
    createdAt: `${daysAgo(daysBack)}T00:00:00Z`,
  };
});

export const demoLiabilities: Liability[] = [
  { id: "liability-1", name: "HDFC Credit Card", liabilityType: "credit_card", amountOwed: 22_000, interestRate: 42, notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

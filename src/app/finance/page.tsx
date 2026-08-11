"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Search,
  FileSpreadsheet,
  ArrowDownToLine,
  RefreshCw,
  Tag,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Pill,
  Users,
} from "lucide-react";

export default function FinanceTrackerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchFinanceData();
    }
  }, [status, router]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchFinanceData();
    };
    window.addEventListener("medtrack:refresh", handleRefresh);
    return () => {
      window.removeEventListener("medtrack:refresh", handleRefresh);
    };
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance");
      if (res.ok) {
        const data = await res.json();
        setFinanceData(data);
      }
    } catch (err) {
      console.error("Finance data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") return null;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F] animate-spin flex items-center justify-center text-teal-400">
          <DollarSign className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-[#1E3A5F]">Loading Financial Analytics...</p>
      </div>
    );
  }

  const summary = financeData?.summary || {
    todayRevenue: 0,
    todayUnits: 0,
    todayDiscounts: 0,
    weekRevenue: 0,
    weekUnits: 0,
    monthRevenue: 0,
    monthUnits: 0,
    totalRevenue: 0,
    totalUnits: 0,
    totalDiscounts: 0,
    transactionCount: 0,
  };

  const rawTransactions: any[] = financeData?.transactions || [];

  // Filter transactions by timeFilter and searchQuery
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMon);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const filteredTransactions = rawTransactions.filter((tx) => {
    const txTime = new Date(tx.createdAt).getTime();

    // Time filter check
    if (timeFilter === "today" && txTime < startOfToday.getTime()) return false;
    if (timeFilter === "week" && txTime < startOfWeek.getTime()) return false;
    if (timeFilter === "month" && txTime < startOfMonth.getTime()) return false;

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const medName = tx.medicineName?.toLowerCase() || "";
      const userName = tx.userName?.toLowerCase() || "";
      const batchStr = tx.batchDetails?.map((b: any) => b.batchNumber).join(" ").toLowerCase() || "";
      return medName.includes(q) || userName.includes(q) || batchStr.includes(q);
    }

    return true;
  });

  // Export Sales Report CSV Function
  const handleExportSalesCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = [
      "Transaction ID",
      "Exact Date & Time",
      "Medicine Name",
      "Units Sold",
      "Unit Price (₹)",
      "Subtotal (₹)",
      "Discount (%)",
      "Discount Amount (₹)",
      "Net Sale Amount (₹)",
      "Deducted Batches",
      "Staff Credentials",
    ];

    const rows = filteredTransactions.map((tx) => {
      const formattedDate = new Date(tx.createdAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const batchStr = tx.batchDetails?.map((b: any) => `${b.batchNumber} (${b.deductedQuantity}u)`).join("; ") || "N/A";

      return [
        `"${tx.id}"`,
        `"${formattedDate}"`,
        `"${tx.medicineName.replace(/"/g, '""')}"`,
        tx.quantity,
        tx.unitPrice.toFixed(2),
        (tx.subtotal || tx.quantity * tx.unitPrice).toFixed(2),
        `${tx.discountPercent || 0}%`,
        (tx.discountAmount || 0).toFixed(2),
        tx.totalPrice.toFixed(2),
        `"${batchStr}"`,
        `"${tx.userName.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `MedTrack_Finance_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
              Financial Intelligence & Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F] tracking-tight mt-1 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-teal-600" />
            <span>Finance Tracker & Sales Revenue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Real-time financial tracking capturing exact sale timestamps, discount percentages, and revenue logs.
          </p>
        </div>

        <button
          onClick={handleExportSalesCSV}
          disabled={filteredTransactions.length === 0}
          className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Export Sales CSV Report</span>
        </button>
      </div>

      {/* Primary KPI Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-teal-700 font-mono">
              ₹{summary.todayRevenue.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-600 font-bold">{summary.todayUnits} Units Sold</span>
              {summary.todayDiscounts > 0 && (
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  -₹{summary.todayDiscounts.toFixed(2)} Disc
                </span>
              )}
            </div>
          </div>
        </div>

        {/* This Week's Sales */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Week's Revenue</span>
            <div className="p-2.5 rounded-xl bg-cyan-50 text-[#1BA6C4]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-[#1E3A5F] font-mono">
              ₹{summary.weekRevenue.toFixed(2)}
            </span>
            <p className="text-xs text-slate-600 font-bold mt-1">{summary.weekUnits} Total Units Sold</p>
          </div>
        </div>

        {/* This Month's Sales */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Month's Revenue</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-[#1E3A5F] font-mono">
              ₹{summary.monthRevenue.toFixed(2)}
            </span>
            <p className="text-xs text-slate-600 font-bold mt-1">{summary.monthUnits} Total Units Sold</p>
          </div>
        </div>

        {/* All-Time Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">All-Time Net Sales</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-emerald-700 font-mono">
              ₹{summary.totalRevenue.toFixed(2)}
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-bold">
              <span>{summary.transactionCount} Sales Logged</span>
              <span className="text-amber-800">(-₹{summary.totalDiscounts.toFixed(2)} Savings)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Segmented Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-extrabold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === "all"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              All Time ({summary.transactionCount})
            </button>
            <button
              onClick={() => setTimeFilter("today")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === "today"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter("week")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === "week"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter("month")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeFilter === "month"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              This Month
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by medicine, staff, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Pill className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-extrabold text-[#1E3A5F]">No Sales Transactions Found</p>
              <p className="text-xs text-slate-500 font-medium">
                {searchQuery || timeFilter !== "all"
                  ? "Try adjusting your search query or time filter tab."
                  : "Dispense medicines in the POS or Batch Selection popup to log sales here."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date & Exact Time</th>
                  <th className="py-3 px-3">Medicine Name</th>
                  <th className="py-3 px-3 text-center">Units</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-3 text-right">Net Bill Amount</th>
                  <th className="py-3 px-3">Batches Deducted</th>
                  <th className="py-3 px-3">Staff Credentials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.map((tx) => {
                  const txDate = new Date(tx.createdAt);
                  const formattedDate = txDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = txDate.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });

                  const subtotalVal = tx.subtotal || tx.quantity * tx.unitPrice;
                  const discPct = tx.discountPercent || 0;
                  const discAmt = tx.discountAmount || 0;

                  return (
                    <tr key={tx.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-[#1E3A5F] block">{formattedDate}</span>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formattedTime}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-extrabold text-[#1E3A5F] text-sm block">{tx.medicineName}</span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                        {tx.quantity} Units
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ₹{tx.unitPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ₹{subtotalVal.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {discPct > 0 ? (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                              -{discPct}%
                            </span>
                            <span className="block text-[10px] text-amber-800 font-medium mt-0.5">
                              -₹{discAmt.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">0%</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-teal-700 text-sm font-mono">
                          ₹{tx.totalPrice.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          {tx.batchDetails?.map((b: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200"
                            >
                              #{b.batchNumber} (-{b.deductedQuantity}u)
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {tx.userName}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

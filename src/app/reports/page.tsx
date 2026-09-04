"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  ClipboardList,
  Trash2,
  Download,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SaleRow {
  id: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
  patientName: string | null;
  doctorName: string | null;
  batchDetails: string | null;
  createdAt: string;
  staffName: string | null;
}

interface WastageRow {
  id: number;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  reason: string;
  performedByName: string | null;
  date: string;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}
function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

function parseBatchSummary(raw: string | null): string {
  if (!raw) return "—";
  try {
    const arr = JSON.parse(raw) as Array<{ batchNumber: string; deductedQuantity: number }>;
    return arr.map((b) => `${b.batchNumber}(−${b.deductedQuantity})`).join(", ");
  } catch { return raw; }
}

const REASON_LABELS: Record<string, string> = {
  expired:      "Expired",
  damaged:      "Damaged",
  contaminated: "Contaminated",
  recalled:     "Recalled",
  other:        "Other",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"sales" | "wastage">("sales");

  // ── Filters
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [medicine,    setMedicine]    = useState("");
  const [reason,      setReason]      = useState(""); // wastage only

  // ── Data
  const [salesData,   setSalesData]   = useState<SaleRow[]>([]);
  const [wastageData, setWastageData] = useState<WastageRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");

  // ── Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Fetch helpers
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate)   params.set("endDate",   endDate);
      if (medicine)  params.set("medicine",  medicine);
      const res = await fetch(`/api/sales-log?${params}`);
      if (res.ok) setSalesData(await res.json());
      else setErrorMsg("Failed to load sales data.");
    } catch { setErrorMsg("Network error loading sales."); }
    finally  { setLoading(false); }
  }, [startDate, endDate, medicine]);

  const fetchWastage = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate)   params.set("endDate",   endDate);
      if (medicine)  params.set("medicine",  medicine);
      if (reason)    params.set("reason",    reason);
      const res = await fetch(`/api/wastage?${params}`);
      if (res.ok) setWastageData(await res.json());
      else setErrorMsg("Failed to load wastage data.");
    } catch { setErrorMsg("Network error loading wastage."); }
    finally  { setLoading(false); }
  }, [startDate, endDate, medicine, reason]);

  // Initial load + refetch when tab changes
  useEffect(() => {
    if (status !== "authenticated") return;
    if (tab === "sales")   fetchSales();
    else                   fetchWastage();
  }, [status, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    if (tab === "sales") fetchSales();
    else                 fetchWastage();
  }

  function handleClearFilters() {
    setStartDate(""); setEndDate(""); setMedicine(""); setReason("");
    // Re-fetch without filters after state clears (needs timeout for state flush)
    setTimeout(() => {
      if (tab === "sales") fetchSales();
      else                 fetchWastage();
    }, 0);
  }

  // ── CSV exports
  function exportSalesCsv() {
    const headers = ["Date", "Time", "Medicine", "Batch(es)", "Qty", "Unit Price (₹)", "Subtotal (₹)", "Discount %", "Total (₹)", "Patient", "Doctor", "Staff"];
    const rows = salesData.map((s) => [
      fmtDate(s.createdAt),
      fmtTime(s.createdAt),
      s.medicineName,
      parseBatchSummary(s.batchDetails),
      s.quantity,
      Number(s.unitPrice).toFixed(2),
      Number(s.subtotal).toFixed(2),
      s.discountPercent,
      Number(s.totalPrice).toFixed(2),
      s.patientName ?? "",
      s.doctorName  ?? "",
      s.staffName   ?? "",
    ]);
    const dateTag = startDate && endDate ? `_${startDate}_to_${endDate}` : "";
    downloadCsv(`MedTrack_Sales_Report${dateTag}.csv`, headers, rows);
  }

  function exportWastageCsv() {
    const headers = ["Date", "Time", "Medicine", "Batch", "Qty Written Off", "Reason", "Staff"];
    const rows = wastageData.map((w) => [
      fmtDate(w.date),
      fmtTime(w.date),
      w.medicineName,
      w.batchNumber,
      w.quantity,
      REASON_LABELS[w.reason] ?? w.reason,
      w.performedByName ?? "",
    ]);
    const dateTag = startDate && endDate ? `_${startDate}_to_${endDate}` : "";
    downloadCsv(`MedTrack_Wastage_Report${dateTag}.csv`, headers, rows);
  }

  // ── PDF print (browser print dialog with print-only styles injected)
  function printReport() {
    window.print();
  }

  // ── Summary totals
  const salesTotalQty = salesData.reduce((s, r) => s + r.quantity, 0);
  const salesTotalAmt = salesData.reduce((s, r) => s + Number(r.totalPrice), 0);
  const wastageTotal  = wastageData.reduce((s, r) => s + r.quantity, 0);

  const hasFilters = startDate || endDate || medicine || reason;

  if (status === "loading") return null;

  return (
    <>
      {/* ── Print-only styles injected inline ─────────────────────────────── */}
      <style>{`
        @media print {
          body > *:not(#report-print-area) { display: none !important; }
          #report-print-area { display: block !important; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
          table { border-collapse: collapse; width: 100%; font-size: 10px; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
        }
        @media screen {
          #report-print-area { display: none; }
        }
      `}</style>

      {/* ── Print-only area (hidden on screen, shown when printing) ────────── */}
      <div id="report-print-area">
        <h2 style={{ fontFamily: "Arial, sans-serif", marginBottom: 4 }}>
          MedTrack — {tab === "sales" ? "Sales Report" : "Wastage Report"}
        </h2>
        <p style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#555", marginBottom: 12 }}>
          {startDate && endDate ? `Period: ${startDate} to ${endDate}` : "All dates"}
          {medicine ? ` · Medicine: ${medicine}` : ""}
          {reason ? ` · Reason: ${REASON_LABELS[reason] ?? reason}` : ""}
          {" · "} Generated: {new Date().toLocaleString("en-IN")}
        </p>

        {tab === "sales" ? (
          <table>
            <thead>
              <tr>
                {["Date", "Time", "Medicine", "Batch(es)", "Qty", "Unit ₹", "Total ₹", "Patient", "Staff"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesData.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.createdAt)}</td>
                  <td>{fmtTime(s.createdAt)}</td>
                  <td>{s.medicineName}</td>
                  <td>{parseBatchSummary(s.batchDetails)}</td>
                  <td>{s.quantity}</td>
                  <td>₹{Number(s.unitPrice).toFixed(2)}</td>
                  <td>₹{Number(s.totalPrice).toFixed(2)}</td>
                  <td>{s.patientName ?? "—"}</td>
                  <td>{s.staffName ?? "—"}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold", background: "#f8fafc" }}>
                <td colSpan={4}>TOTAL</td>
                <td>{salesTotalQty}</td>
                <td></td>
                <td>₹{salesTotalAmt.toFixed(2)}</td>
                <td colSpan={2}>{salesData.length} transactions</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                {["Date", "Time", "Medicine", "Batch", "Qty Written Off", "Reason", "Staff"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wastageData.map((w) => (
                <tr key={w.id}>
                  <td>{fmtDate(w.date)}</td>
                  <td>{fmtTime(w.date)}</td>
                  <td>{w.medicineName}</td>
                  <td>{w.batchNumber}</td>
                  <td>{w.quantity}</td>
                  <td>{REASON_LABELS[w.reason] ?? w.reason}</td>
                  <td>{w.performedByName ?? "—"}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: "bold", background: "#f8fafc" }}>
                <td colSpan={4}>TOTAL UNITS WRITTEN OFF</td>
                <td>{wastageTotal}</td>
                <td colSpan={2}>{wastageData.length} records</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Screen UI ─────────────────────────────────────────────────────── */}
      <div className="space-y-6 pb-10 no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F] tracking-tight flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-teal-600" />
              <span>Reports</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              View, filter and export Sales and Wastage records.
            </p>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={tab === "sales" ? exportSalesCsv : exportWastageCsv}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={printReport}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => { setTab("sales"); setMedicine(""); setReason(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              tab === "sales"
                ? "bg-white text-teal-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Sales Report
          </button>
          <button
            onClick={() => { setTab("wastage"); setMedicine(""); setReason(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              tab === "wastage"
                ? "bg-white text-rose-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Wastage Report
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">
            <Search className="w-4 h-4 text-teal-600" />
            <span>Filter Records</span>
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Date range */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            {/* Medicine name */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Medicine</label>
              <input
                type="text"
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
                placeholder="e.g. Paracetamol"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            {/* Reason — wastage only */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Reason
                {tab === "sales" && (
                  <span className="ml-1 text-[10px] text-slate-400 font-normal">(Wastage only)</span>
                )}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={tab === "sales"}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">All reasons</option>
                {Object.entries(REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              {loading ? "Loading…" : "Apply Filters"}
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── SALES TAB ─────────────────────────────────────────────────── */}
        {tab === "sales" && (
          <div className="space-y-4">
            {/* Summary bar */}
            {salesData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Transactions</span>
                  <span className="text-2xl font-extrabold text-[#1E3A5F]">{salesData.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Units Dispensed</span>
                  <span className="text-2xl font-extrabold text-teal-700">{salesTotalQty}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs text-xs col-span-2 sm:col-span-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Revenue</span>
                  <span className="text-2xl font-extrabold text-teal-700">₹{salesTotalAmt.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <p className="text-center py-10 text-slate-500 text-xs font-bold">Loading…</p>
            ) : salesData.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-extrabold text-[#1E3A5F]">No sales records found.</p>
                <p className="text-xs text-slate-500">Try adjusting your filters or date range.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          {["Date & Time", "Medicine", "Batch(es)", "Qty", "Unit ₹", "Total ₹", "Patient", "Staff"].map((h) => (
                            <th key={h} className="px-4 py-3 font-extrabold text-[#1E3A5F] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesData.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                              {fmtDate(s.createdAt)}
                              <span className="block text-[10px] text-slate-400">{fmtTime(s.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-[#1E3A5F]">{s.medicineName}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{parseBatchSummary(s.batchDetails)}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{s.quantity}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700">₹{Number(s.unitPrice).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-teal-700">
                              ₹{Number(s.totalPrice).toFixed(2)}
                              {Number(s.discountPercent) > 0 && (
                                <span className="block text-[10px] text-amber-600 font-bold">-{s.discountPercent}%</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{s.patientName ?? <span className="text-slate-400 italic">Walk-in</span>}</td>
                            <td className="px-4 py-3 text-slate-600">{s.staffName ?? "—"}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-teal-50 border-t-2 border-teal-200">
                          <td colSpan={3} className="px-4 py-3 font-extrabold text-[#1E3A5F] text-xs uppercase">Total</td>
                          <td className="px-4 py-3 text-center font-extrabold text-teal-700">{salesTotalQty}</td>
                          <td></td>
                          <td className="px-4 py-3 text-right font-extrabold text-teal-700">₹{salesTotalAmt.toFixed(2)}</td>
                          <td colSpan={2} className="px-4 py-3 text-slate-500 text-[11px]">{salesData.length} transactions</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {salesData.map((s) => (
                    <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-extrabold text-[#1E3A5F] text-sm">{s.medicineName}</p>
                          <p className="text-slate-500 font-medium mt-0.5">
                            {fmtDate(s.createdAt)} · {fmtTime(s.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-teal-700">₹{Number(s.totalPrice).toFixed(2)}</span>
                          {Number(s.discountPercent) > 0 && (
                            <span className="block text-[10px] text-amber-600 font-bold">-{s.discountPercent}%</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                        <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Qty</span>{s.quantity} units</div>
                        <div><span className="text-slate-400 font-bold uppercase text-[9px] block">Patient</span>{s.patientName ?? "Walk-in"}</div>
                        <div className="col-span-2"><span className="text-slate-400 font-bold uppercase text-[9px] block">Batch(es)</span>{parseBatchSummary(s.batchDetails)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WASTAGE TAB ───────────────────────────────────────────────── */}
        {tab === "wastage" && (
          <div className="space-y-4">
            {/* Summary bar */}
            {wastageData.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Records</span>
                  <span className="text-2xl font-extrabold text-[#1E3A5F]">{wastageData.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Units Written Off</span>
                  <span className="text-2xl font-extrabold text-rose-600">{wastageTotal}</span>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <p className="text-center py-10 text-slate-500 text-xs font-bold">Loading…</p>
            ) : wastageData.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-extrabold text-[#1E3A5F]">No wastage records found.</p>
                <p className="text-xs text-slate-500">Try adjusting your filters or date range.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          {["Date & Time", "Medicine", "Batch", "Qty Written Off", "Reason", "Staff"].map((h) => (
                            <th key={h} className="px-4 py-3 font-extrabold text-[#1E3A5F] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {wastageData.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                              {fmtDate(w.date)}
                              <span className="block text-[10px] text-slate-400">{fmtTime(w.date)}</span>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-[#1E3A5F]">{w.medicineName}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{w.batchNumber}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-black text-rose-600 text-sm">−{w.quantity}</span>
                              <span className="block text-[10px] text-slate-400">units</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                w.reason === "expired"       ? "bg-rose-100 text-rose-800 border-rose-200"
                                : w.reason === "damaged"     ? "bg-amber-100 text-amber-800 border-amber-200"
                                : w.reason === "contaminated"? "bg-orange-100 text-orange-800 border-orange-200"
                                : w.reason === "recalled"    ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {REASON_LABELS[w.reason] ?? w.reason}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{w.performedByName ?? "—"}</td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-rose-50 border-t-2 border-rose-200">
                          <td colSpan={3} className="px-4 py-3 font-extrabold text-[#1E3A5F] text-xs uppercase">Total Written Off</td>
                          <td className="px-4 py-3 text-center font-extrabold text-rose-600">−{wastageTotal}</td>
                          <td colSpan={2} className="px-4 py-3 text-slate-500 text-[11px]">{wastageData.length} records</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {wastageData.map((w) => (
                    <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#1E3A5F] text-sm">{w.medicineName}</span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">Batch {w.batchNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            w.reason === "expired"        ? "bg-rose-100 text-rose-800 border-rose-200"
                            : w.reason === "damaged"      ? "bg-amber-100 text-amber-800 border-amber-200"
                            : w.reason === "contaminated" ? "bg-orange-100 text-orange-800 border-orange-200"
                            : w.reason === "recalled"     ? "bg-purple-100 text-purple-800 border-purple-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {REASON_LABELS[w.reason] ?? w.reason}
                          </span>
                        </div>
                        <p className="text-slate-500 font-medium">
                          {fmtDate(w.date)} · {fmtTime(w.date)} · {w.performedByName ?? "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-lg font-black text-rose-600">−{w.quantity}</span>
                        <span className="block text-[10px] text-slate-500 font-bold">units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  Boxes,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Clock,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Users,
  BarChart2,
} from "lucide-react";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    totalBatches: 0,
    totalStockUnits: 0,
    expiredCount: 0,
    urgentCount: 0,
    warningCount: 0,
    noticeCount: 0,
    reorderCount: 0,
  });

  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"check" | "stockIn">("check");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchDashboardData(true);
    }
  }, [status, router]);

  useEffect(() => {
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener("medtrack:refresh", handleRefresh);
    return () => window.removeEventListener("medtrack:refresh", handleRefresh);
  }, []);

  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [medRes, alertRes, restockRes] = await Promise.all([
        fetch("/api/medicines"),
        fetch("/api/batches/alerts"),
        fetch("/api/restock-status"),
      ]);

      const meds    = medRes.ok    ? await medRes.json()    : [];
      const alerts  = alertRes.ok  ? await alertRes.json()  : [];
      const restocks = restockRes.ok ? await restockRes.json() : [];

      const expired = alerts.filter((a: any) => a.level === "expired");
      const urgent  = alerts.filter((a: any) => a.level === "urgent");
      const warning = alerts.filter((a: any) => a.level === "warning");
      const notice  = alerts.filter((a: any) => a.level === "notice");
      const totalUnits = meds.reduce((sum: number, m: any) => sum + (Number(m.totalStock) || 0), 0);

      setStats({
        totalMedicines: Array.isArray(meds) ? meds.length : 0,
        totalBatches:   Array.isArray(alerts) ? alerts.length : 0,
        totalStockUnits: totalUnits,
        expiredCount: expired.length,
        urgentCount:  urgent.length,
        warningCount: warning.length,
        noticeCount:  notice.length,
        reorderCount: restocks.length,
      });

      if (Array.isArray(alerts)) {
        setRecentAlerts(alerts.filter((a: any) => a.level !== null).slice(0, 5));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") return null;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F] animate-spin flex items-center justify-center text-teal-400">
          <Pill className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-[#1E3A5F]">Loading Pharmacy Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-cyan-gradient border border-cyan-300/40 p-6 sm:p-8 overflow-hidden shadow-xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 text-white border border-white/30">
                FEFO Order Enforced
              </span>
              <span className="text-xs text-white/90 font-medium">Shop ID #{session?.user?.shopId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hello, {session?.user?.name || "Pharmacist"} 👋
            </h1>
            <p className="text-xs sm:text-sm text-white/90 font-medium">
              Batch-level medicine stock tracking active. Dispensing automatically picks the nearest expiry batch to eliminate financial loss.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Link
              href="/inventory"
              className="px-4 py-2.5 rounded-2xl bg-white text-[#1BA6C4] hover:bg-slate-50 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.02]"
            >
              <Boxes className="w-4 h-4 text-[#1BA6C4]" />
              <span>Inventory &amp; Dispensing</span>
            </Link>

            <button
              onClick={() => { setScannerMode("stockIn"); setScannerOpen(true); }}
              className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/30 transition-colors cursor-pointer backdrop-blur-sm"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Scan Delivery</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Medicines */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Medicines</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1E3A5F]">{stats.totalMedicines}</span>
            <span className="text-xs text-slate-500 font-medium">({stats.totalStockUnits} units)</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">{stats.totalBatches} active batches tracked</p>
        </div>

        {/* Expired Batches */}
        <Link
          href="/alerts"
          className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2 hover:border-rose-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Expired Batches</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{stats.expiredCount}</span>
            <span className="text-xs text-rose-600/80 font-bold">Batches</span>
          </div>
          <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
            <span>Remove from shelf</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Expiring ≤ 30 Days */}
        <Link
          href="/alerts"
          className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-2 hover:border-amber-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Expiring ≤ 30 Days</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">{stats.urgentCount + stats.warningCount}</span>
            <span className="text-xs text-amber-700/80 font-bold">Batches</span>
          </div>
          <p className="text-[11px] text-amber-800 font-semibold">
            {stats.urgentCount} urgent (1–7 days), {stats.warningCount} warning
          </p>
        </Link>

        {/* Low Stock Alerts */}
        <Link
          href="/restock"
          className="p-5 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-2 hover:border-teal-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-teal-700">{stats.reorderCount}</span>
            <span className="text-xs text-teal-700/80 font-bold">Medicines</span>
          </div>
          <p className="text-[11px] text-teal-800 font-bold flex items-center gap-1">
            <span>Below reorder threshold</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </Link>
      </div>

      {/* Two-Column Layout: Quick Navigation & Expiry Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Module Shortcuts */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-[#1E3A5F] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Quick Navigation</span>
          </h2>

          <div className="space-y-3">
            <Link
              href="/inventory"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F]">FEFO Point of Sale</h3>
                  <p className="text-xs text-slate-500">Dispense nearest expiry batch first</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            </Link>

            <Link
              href="/inventory"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F]">Medicine Catalog &amp; Batches</h3>
                  <p className="text-xs text-slate-500">Add medicines, barcodes &amp; batches</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            </Link>

            <Link
              href="/patients"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F]">Patient Records</h3>
                  <p className="text-xs text-slate-500">View patient history &amp; invoices</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            </Link>

            <Link
              href="/restock"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F]">Restock</h3>
                  <p className="text-xs text-slate-500">Replenish low-stock medicines</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            </Link>

            <Link
              href="/reports"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E3A5F]">Reports</h3>
                  <p className="text-xs text-slate-500">Sales &amp; Wastage reports with CSV / PDF export</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Right: Critical Expiry Watch */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#1E3A5F] flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>Critical Expiry Watch (Next 30 Days)</span>
            </h2>
            <Link href="/alerts" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1">
              <span>View All Alerts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                <p className="text-sm font-extrabold text-[#1E3A5F]">No Critical Expiries Detected</p>
                <p className="text-xs text-slate-500">All unexpired batches have more than 30 days remaining.</p>
              </div>
            ) : (
              recentAlerts.map((alert, idx) => {
                const daysLeftVal =
                  typeof alert.daysLeft === "number"
                    ? alert.daysLeft
                    : typeof alert.daysRemaining === "number"
                    ? alert.daysRemaining
                    : 0;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          alert.level === "expired"  ? "bg-rose-50 text-rose-600"
                          : alert.level === "urgent"  ? "bg-rose-50 text-rose-500"
                          : alert.level === "warning" ? "bg-amber-50 text-amber-600"
                          : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#1E3A5F] truncate">{alert.medicineName}</span>
                          <span className="font-mono text-xs text-slate-500 shrink-0">#{alert.batchNumber}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          Expires: <strong className="text-slate-800">{alert.expiryDate}</strong> • Supplier: {alert.supplier}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className="text-xs font-bold text-slate-700">{alert.quantity} units</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                          alert.level === "expired" ? "bg-rose-600 text-white"
                          : alert.level === "urgent"  ? "bg-rose-500 text-white"
                          : alert.level === "warning" ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {alert.level === "expired"
                          ? "EXPIRED"
                          : daysLeftVal <= 0
                          ? "EXPIRES TODAY"
                          : `${daysLeftVal} Days Left`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <BarcodeScannerModal
          mode={scannerMode}
          onClose={() => setScannerOpen(false)}
          onSelectMode={(m) => setScannerMode(m)}
        />
      )}
    </div>
  );
}

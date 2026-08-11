"use client";

import { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  QrCode,
  AlertTriangle,
  Trash2,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Layers,
  Info,
  PlusCircle,
  DollarSign,
  Tag,
  Calendar,
} from "lucide-react";

interface InstructionManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export default function InstructionManualModal({
  isOpen,
  onClose,
  initialTab = "dashboard",
}: InstructionManualModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      const origTouch = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
        document.body.style.touchAction = origTouch;
        document.documentElement.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: "dashboard", label: "1. Dashboard & KPIs", icon: LayoutDashboard },
    { id: "dispense", label: "2. FEFO & Batch Dispense", icon: ShoppingCart },
    { id: "finance", label: "3. Finance Tracker & Discounts", icon: DollarSign },
    { id: "inventory", label: "4. Inventory & Batches", icon: Boxes },
    { id: "barcode", label: "5. Barcode & Remote Scan", icon: QrCode },
    { id: "alerts", label: "6. Expiry & Restock Alerts", icon: AlertTriangle },
    { id: "wastage", label: "7. Wastage & Quarantining", icon: Trash2 },
    { id: "fda", label: "8. openFDA Drug Reference", icon: Search },
    { id: "audit", label: "9. Audit & Exports", icon: FileSpreadsheet },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overscroll-none max-h-[100dvh] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-[calc(100dvh-0.75rem)] sm:h-auto sm:max-h-[90vh] overflow-hidden min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1E3A5F] text-white px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 shadow-md min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-1 sm:pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-extrabold uppercase bg-teal-400/20 text-teal-300 border border-teal-400/30 whitespace-nowrap">
                  User Instruction Manual
                </span>
                <span className="text-[8px] sm:text-[10px] text-slate-300 font-medium whitespace-nowrap">MedTrack v2.0</span>
              </div>
              <h2 className="text-xs sm:text-xl font-black text-white tracking-tight truncate mt-0.5">
                Pharmacy Dashboard & FEFO System Guide
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 ml-1"
            title="Close Manual"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body Layout */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar / Top Pill Bar on Mobile */}
          <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-1.5 sm:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col shrink-0 scrollbar-none gap-1 touch-pan-x min-w-0">
            <p className="hidden md:block px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Documentation Topics
            </p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${
                    isActive
                      ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                      : "text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Main Detail Content Panel */}
          <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-white text-slate-800 text-xs sm:text-sm leading-relaxed overscroll-contain min-h-0">
            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 1
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-teal-600" />
                    <span>Dashboard & System Overview</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Central command center monitoring real-time stock levels, batch expiries, and reorder triggers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="font-extrabold text-[#1E3A5F] flex items-center gap-1.5 text-xs">
                      <Boxes className="w-4 h-4 text-teal-600" />
                      <span>Total Stock KPI</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Shows total unique medicine count and overall physical units tracked in active inventory.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                    <h4 className="font-extrabold text-rose-900 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Expired Batches Count</span>
                    </h4>
                    <p className="text-xs text-rose-800">
                      Instantly alerts you of stock that has surpassed its expiry date and must be moved to Wastage.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Clock className="w-4 h-4 text-amber-700" />
                      <span>Expiring ≤ 30 Days</span>
                    </h4>
                    <p className="text-xs text-amber-800">
                      Counts batches expiring within 1-7 days (Urgent) and 8-30 days (Warning) so you can prioritize sales or returns.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                    <h4 className="font-extrabold text-teal-900 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Low Stock Reorders</span>
                    </h4>
                    <p className="text-xs text-teal-800">
                      Automatically detects medicines whose total stock is below the minimum safety threshold.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 space-y-2">
                  <h4 className="font-extrabold flex items-center gap-2 text-sm text-[#1E3A5F]">
                    <Sparkles className="w-4 h-4 text-[#1BA6C4]" />
                    <span>How Multi-Shop Isolation & Roles Work</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 font-medium">
                    <li>Each logged-in account operates under a specific <strong>Shop ID</strong>. Stock, sales, and audit logs are fully isolated.</li>
                    <li><strong>Owner Accounts</strong> can access audit logs, financial reports, and export stock CSVs.</li>
                    <li><strong>Staff Accounts</strong> have full access to POS dispensing, barcode scanning, stock-in, and wastage logging.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: DISPENSE & BATCH POPUP */}
            {activeTab === "dispense" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 2
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-teal-600" />
                    <span>FEFO Dispensing & Batch Selection Flow</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    MedTrack enforces First-Expiry, First-Out (FEFO) dispensing to eliminate financial loss and ensure patient safety.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[#1E3A5F]">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Step-by-Step Dispensing Workflow</span>
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 font-medium">
                    <li>
                      <strong>Search or Scan Medicine:</strong> Search by medicine name, generic name, or scan barcode at POS (<code>/sell</code>).
                    </li>
                    <li>
                      <strong>Select Medicine (Opens Batch Selection Pop-up):</strong> Clicking a medicine opens the <strong>Batch Selection Pop-up Modal</strong> showing all available batches with batch numbers, expiry dates, unexpired (🟢) vs expired (🔴) badges, supplier, and current stock.
                    </li>
                    <li>
                      <strong>Pick Batch or Auto FEFO:</strong> Choose a specific batch card, or click <em>"⚡ Auto FEFO (Nearest Expiry)"</em>.
                    </li>
                    <li>
                      <strong>Enter Quantity & Price (Opens Normal Dispense Modal):</strong> The <strong>Normal Dispense Pop-up</strong> opens pre-focused on the selected batch. Enter quantity and selling price per unit. Total bill amount is calculated live.
                    </li>
                    <li>
                      <strong>Confirm Dispense & View Receipt:</strong> Click <em>"Confirm Dispense & Log Sale"</em>. Stock is deducted, FEFO order is logged, and a clean digital sale receipt is displayed.
                    </li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-xs text-rose-800 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Strict Patient Safety Rules</span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium">
                    The FEFO algorithm automatically <strong>blocks expired batches from sales</strong>. If a medicine only has expired stock remaining, the system will prevent sales and guide staff to write it off in the Wastage module.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: FINANCE TRACKER & DISCOUNTS */}
            {activeTab === "finance" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 3
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-teal-600" />
                    <span>Finance Tracker & Discounts</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Comprehensive financial dashboard tracking revenue metrics, discount write-offs, and transaction analytics.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                    <h4 className="font-extrabold text-teal-900 flex items-center gap-1.5 text-xs">
                      <DollarSign className="w-4 h-4 text-teal-700" />
                      <span>Revenue Analytics</span>
                    </h4>
                    <p className="text-xs text-teal-800">
                      Monitor Today's, Weekly, Monthly, and Total Revenue generated from FEFO pharmacy sales.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <h4 className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-xs">
                      <Tag className="w-4 h-4 text-emerald-700" />
                      <span>Discounts & Pricing Write-offs</span>
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Track total customer discounts granted during dispensing to evaluate profit margins and promotion costs.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="font-extrabold text-[#1E3A5F] flex items-center gap-1.5 text-xs">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span>Time Period Filters</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Filter transaction tables seamlessly between All Time, Today, This Week, and This Month views.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1">
                    <h4 className="font-extrabold text-cyan-900 flex items-center gap-1.5 text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-[#1BA6C4]" />
                      <span>Transaction Ledger & Exports</span>
                    </h4>
                    <p className="text-xs text-cyan-800">
                      View itemized sales breakdown with batch numbers, quantities, unit prices, and export financial data to CSV.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[#1E3A5F]">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>How to Access Finance Reports</span>
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">
                    Navigate to <strong>Finance (<code>/finance</code>)</strong> in the top navigation bar. Financial metrics auto-update in real time whenever a sale is completed at POS.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: INVENTORY */}
            {activeTab === "inventory" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 4
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Boxes className="w-6 h-6 text-teal-600" />
                    <span>Inventory Catalog & Batch Management</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Manage master medicine catalog, auto-classify drug schedules, and stock-in new delivery batches.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-teal-600" />
                      <span>Adding a New Medicine</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Navigate to <strong>Inventory (<code>/inventory</code>)</strong> and click <em>"+ Add New Medicine"</em>. Fill in name, manufacturer, barcode, unit selling price, and safety reorder threshold.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>Automatic Drug Schedule Classification</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      MedTrack includes an intelligent drug classifier algorithm. When you type medicine names containing controlled substances (e.g. Alprazolam, Tramadol, Morphine), the system auto-selects <strong>Schedule H, H1, or X</strong> according to Indian Drugs & Cosmetics regulations. OTC products are set to <strong>OTC</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-teal-600" />
                      <span>Stocking In New Batches</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Expand any medicine row on the Inventory page and click <em>"+ Stock In Batch"</em> (or use <strong>Stock In Scanner</strong>). Enter batch number, expiry date, quantity received, supplier, and unit cost price.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: BARCODE & REMOTE SCAN */}
            {activeTab === "barcode" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 5
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-teal-600" />
                    <span>Barcode & Remote Phone Scanning</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Supports desktop webcam scanning, physical USB barcode scanners, and wireless mobile phone barcode transmission.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-teal-600" />
                      <span>Check Stock Mode</span>
                    </h4>
                    <p className="text-xs text-slate-700">
                      Scans barcodes on packaging to immediately lookup medicine total stock, batch breakdown, and expiry dates without manual typing.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-2">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-[#1BA6C4]" />
                      <span>Stock In Mode</span>
                    </h4>
                    <p className="text-xs text-slate-700">
                      Scans delivery barcodes to automatically open the Stock In form pre-filled with medicine barcode details for rapid inventory receiving.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[#1E3A5F]">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Remote Mobile Phone Scan Feature</span>
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">
                    Don’t have a desktop webcam or handheld scanner? Open the Barcode Scanner modal and click <em>"Use Phone Camera"</em>. Scan the QR code with your mobile phone camera to open <code>/remote-scan</code>. Any barcode scanned on your phone will automatically transmit wirelessly in real time to your desktop session!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 6: ALERTS & RESTOCK */}
            {activeTab === "alerts" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 6
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <span>Expiry Alerts & Supplier Restocking</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Color-coded timeline alerts for batch expiries and supplier reorder management.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-[#1E3A5F] uppercase tracking-wider">
                    Expiry Risk Level Indicators:
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-rose-900">🔴 EXPIRED (0 Days Left)</span>
                      <span className="text-rose-700 text-[11px] font-medium">Must quarantine & log wastage immediately.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-rose-800">🔴 URGENT (1 - 7 Days Left)</span>
                      <span className="text-rose-700 text-[11px] font-medium">High risk of expiring soon. Prioritize selling.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-amber-900">🟠 WARNING (8 - 30 Days Left)</span>
                      <span className="text-amber-800 text-[11px] font-medium">Prepare return to supplier or clearance.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#1E3A5F]">🔵 NOTICE (31 - 90 Days Left)</span>
                      <span className="text-slate-600 text-[11px] font-medium">Under active observation.</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs">Supplier Restock Module (<code>/restock</code>)</h4>
                  <p className="text-xs text-slate-700">
                    Medicines whose total stock falls below their configured reorder threshold appear on the Restock page. View suggested reorder quantities, supplier contacts, and batch receiving history.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 7: WASTAGE */}
            {activeTab === "wastage" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 7
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-rose-600" />
                    <span>Wastage Logging & Quarantining</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Write off expired, damaged, or recalled batch stock for audit compliance and financial records.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                    <h4 className="font-extrabold text-rose-900 text-xs flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Logging Wastage Step-by-Step</span>
                    </h4>
                    <ol className="list-decimal pl-5 space-y-1 text-xs text-rose-800 font-medium">
                      <li>Go to <strong>Wastage (<code>/wastage</code>)</strong>.</li>
                      <li>Select the medicine and specific batch number containing unusable units.</li>
                      <li>Enter quantity to write off and select reason (<em>EXPIRED</em>, <em>DAMAGED</em>, <em>RECALLED</em>, <em>OTHER</em>).</li>
                      <li>Click <em>"Confirm Wastage Write-Off"</em>.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs">Stock Deduction & Audit Trail</h4>
                    <p className="text-xs text-slate-600">
                      Wastage transactions permanently deduct units from the target batch, write a record to the system audit trail, and calculate total financial write-off loss for accounting.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: OPENFDA REFERENCE */}
            {activeTab === "fda" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 8
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Search className="w-6 h-6 text-teal-600" />
                    <span>openFDA Drug Reference Search</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Live lookup for official active ingredients, drug class indications, warnings, and contraindications.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-teal-600" />
                    <span>How to Use openFDA Search</span>
                  </h4>
                  <p className="text-xs text-slate-700">
                    Navigate to <strong>FDA Reference (<code>/reference</code>)</strong>. Type any brand name or generic compound (e.g. <em>Amoxicillin</em>, <em>Metformin</em>, <em>Atorvastatin</em>). The module queries openFDA regulatory databases in real time to display package inserts, active ingredients, boxed warnings, dosage forms, and manufacturer details.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 9: AUDIT & EXPORTS */}
            {activeTab === "audit" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    Section 9
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                    <span>Audit Log Trail & CSV Data Export</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Comprehensive compliance log recording stock-in, sales, stock adjustments, and CSV downloads for store owners.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>Tamper-Evident System Audit Trail</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      Available to Store Owners under <strong>Audit & Exports (<code>/audit</code>)</strong>. Automatically logs all user activities: sales transactions, new medicine creations, batch stock-ins, deletions, and wastage write-offs with exact timestamps and staff credentials.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5">
                    <h4 className="font-extrabold text-teal-900 text-xs flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                      <span>One-Click CSV Data Export</span>
                    </h4>
                    <p className="text-xs text-teal-800">
                      Export full active inventory lists, batch expiry schedules, sales reports, and audit logs to standard Excel/CSV spreadsheets anytime for accounting or regulatory inspections.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Need more assistance? Contact store administrator.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#1E3A5F] hover:bg-[#152a45] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer text-center"
          >
            Got It! Close Manual
          </button>
        </div>
      </div>
    </div>
  );
}

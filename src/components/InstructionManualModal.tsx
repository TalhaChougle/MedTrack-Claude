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
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Clock,
  ShieldCheck,
  ArrowRight,
  Layers,
  Info,
  PlusCircle,
  Users,
  Mail,
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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
        document.documentElement.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: "dashboard",  label: "1. Dashboard & KPIs",          icon: LayoutDashboard },
    { id: "dispense",   label: "2. FEFO Dispensing",            icon: ShoppingCart },
    { id: "inventory",  label: "3. Inventory & Batches",        icon: Boxes },
    { id: "barcode",    label: "4. Barcode Scanning",           icon: QrCode },
    { id: "patients",   label: "5. Patient Records",            icon: Users },
    { id: "alerts",     label: "6. Expiry Alerts & Restock",   icon: AlertTriangle },
    { id: "email",      label: "7. Email Notifications",        icon: Mail },
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
                <span className="text-[8px] sm:text-[10px] text-slate-300 font-medium whitespace-nowrap">MedTrack</span>
              </div>
              <h2 className="text-xs sm:text-xl font-black text-white tracking-tight truncate mt-0.5">
                Pharmacy Inventory &amp; Patient Management System
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

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Sidebar / Top Pill Bar on Mobile */}
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

          {/* Main Content Panel */}
          <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-white text-slate-800 text-xs sm:text-sm leading-relaxed overscroll-contain min-h-0">

            {/* ── TAB 1: DASHBOARD ── */}
            {activeTab === "dashboard" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 1</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-teal-600" />
                    Dashboard &amp; System Overview
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Central command center monitoring real-time stock levels, batch expiries, and reorder triggers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="font-extrabold text-[#1E3A5F] flex items-center gap-1.5 text-xs">
                      <Boxes className="w-4 h-4 text-teal-600" />Total Stock KPI
                    </h4>
                    <p className="text-xs text-slate-600">Shows total unique medicine count and overall physical units across all active batches.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                    <h4 className="font-extrabold text-rose-900 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />Expired Batches
                    </h4>
                    <p className="text-xs text-rose-800">Instantly alerts you to stock past its expiry date. Click to view on the Alerts page.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Clock className="w-4 h-4 text-amber-700" />Expiring ≤ 30 Days
                    </h4>
                    <p className="text-xs text-amber-800">Counts batches expiring within 7 days (Urgent) and 8–30 days (Warning) so you can prioritize sales.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                    <h4 className="font-extrabold text-teal-900 flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />Low Stock Alerts
                    </h4>
                    <p className="text-xs text-teal-800">Detects medicines whose total stock is below the configured reorder threshold. Links to Restock page.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 space-y-2">
                  <h4 className="font-extrabold flex items-center gap-2 text-sm text-[#1E3A5F]">
                    <Sparkles className="w-4 h-4 text-[#1BA6C4]" />Quick Navigation shortcuts
                  </h4>
                  <p className="text-xs text-slate-700 font-medium">
                    The dashboard&apos;s Quick Navigation panel links directly to FEFO Point of Sale, Inventory, Patient Records, and Restock for one-click access to the most-used workflows.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 2: FEFO DISPENSING ── */}
            {activeTab === "dispense" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 2</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-teal-600" />FEFO Dispensing &amp; Batch Selection
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    MedTrack enforces First-Expiry, First-Out (FEFO) dispensing to eliminate financial loss and ensure patient safety.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-[#1E3A5F]">
                    <Sparkles className="w-4 h-4 text-teal-600" />Step-by-Step Dispensing Workflow
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-700 font-medium">
                    <li><strong>Search or Scan Medicine:</strong> Search by name, or scan a barcode using the scanner buttons in the top nav.</li>
                    <li><strong>Select Medicine:</strong> Clicking a medicine opens the <strong>Batch Selection popup</strong> showing all batches with expiry dates and stock levels.</li>
                    <li><strong>Pick a Batch or Auto-FEFO:</strong> Choose a specific batch, or click <em>&ldquo;⚡ Auto FEFO (Nearest Expiry)&rdquo;</em>.</li>
                    <li><strong>Enter Quantity, Price &amp; Patient:</strong> Fill in quantity, unit price, optional discount, patient name, and doctor name.</li>
                    <li><strong>Confirm Dispense:</strong> Click <em>&ldquo;Confirm Dispense &amp; Log Sale&rdquo;</em>. Stock is deducted and a receipt is shown.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-xs text-rose-800 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />Strict Patient Safety Rule
                  </div>
                  <p className="text-xs text-rose-800 font-medium">
                    The FEFO engine automatically <strong>blocks expired batches</strong> from sale. If only expired stock remains, the system prevents the transaction and prompts you to log wastage from the Alerts page.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-teal-600" />Discount Support
                  </h4>
                  <p className="text-xs text-slate-600">
                    Apply a percentage discount during dispensing. The system calculates the discount amount and final net bill live before you confirm.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 3: INVENTORY ── */}
            {activeTab === "inventory" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 3</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Boxes className="w-6 h-6 text-teal-600" />Inventory Catalog &amp; Batch Management
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Manage the master medicine catalog and track all stock batches with expiry dates.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-teal-600" />Adding a New Medicine
                    </h4>
                    <p className="text-xs text-slate-600">
                      Go to <strong>Inventory</strong> and click <em>&ldquo;+ Register New Medicine&rdquo;</em>. Fill in name, manufacturer, optional barcode, drug schedule, unit selling price, and the low-stock alert threshold.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600" />Automatic Drug Schedule Classification
                    </h4>
                    <p className="text-xs text-slate-600">
                      When you type a medicine name the system auto-classifies it as <strong>OTC, Schedule H, H1, or X</strong> based on Indian Drugs &amp; Cosmetics regulations. You can override the suggestion.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-teal-600" />Adding a New Batch
                    </h4>
                    <p className="text-xs text-slate-600">
                      Expand any medicine row and click <em>&ldquo;+ Add Batch&rdquo;</em> (or use the <strong>Stock In</strong> scanner button in the nav). Enter the batch number, expiry date, quantity, supplier, and cost price.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <h4 className="font-extrabold text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />Low-Stock Alert Threshold
                    </h4>
                    <p className="text-xs text-amber-800">
                      Expand a medicine row and use the <strong>Low Stock Alert Threshold</strong> panel to set how many units trigger an alert. Each medicine has its own configurable threshold.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: BARCODE SCANNING ── */}
            {activeTab === "barcode" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 4</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-teal-600" />Barcode Scanning
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Use your webcam or a physical USB barcode scanner to quickly identify medicines and process deliveries.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-teal-600" />Check Stock Mode
                    </h4>
                    <p className="text-xs text-slate-700">
                      Scans a barcode to instantly look up that medicine&apos;s stock, batch breakdown, and expiry dates — no typing needed.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-2">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-[#1BA6C4]" />Stock In Mode
                    </h4>
                    <p className="text-xs text-slate-700">
                      Scans a delivery barcode to open the Add Batch form pre-filled with medicine details for faster inventory receiving.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-teal-600" />Manual Search Fallback
                  </h4>
                  <p className="text-xs text-slate-600">
                    If a barcode is unavailable or unscannable, use the <strong>search bar on the FEFO POS page</strong> to find a medicine by name or manufacturer. Manual search is always available as a fallback.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-teal-600" />Where to Find the Scanner
                  </h4>
                  <p className="text-xs text-slate-600">
                    The scanner buttons (<em>Check</em> and <em>Stock In</em>) appear in the top navigation bar on every page for quick access without leaving your current workflow.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 5: PATIENT RECORDS ── */}
            {activeTab === "patients" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 5</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Users className="w-6 h-6 text-teal-600" />Patient Records
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Maintain a simple pharmacy-focused patient record linked to their purchase history.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-teal-600" />Registering a Patient Automatically
                    </h4>
                    <p className="text-xs text-slate-600">
                      Patients are registered automatically when you enter a name in the <strong>Patient Name</strong> field during dispensing at the FEFO POS. No separate registration step is needed.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" />Viewing Patient History
                    </h4>
                    <p className="text-xs text-slate-600">
                      Go to <strong>Patient Records</strong> in the navigation. Each patient card shows total purchases and total spent. Click <em>&ldquo;View Past Invoices&rdquo;</em> to see a full printable invoice history.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />Printing Invoices
                    </h4>
                    <p className="text-xs text-slate-600">
                      Open a patient&apos;s invoice history and click the <strong>Print</strong> button to generate a formatted pharmacy receipt suitable for handing to the patient.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: EXPIRY ALERTS & RESTOCK ── */}
            {activeTab === "alerts" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 6</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />Expiry Alerts &amp; Restock
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Monitor batch shelf life and replenish low-stock medicines before they run out.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-[#1E3A5F] uppercase tracking-wider">Expiry Risk Levels:</h4>
                  <div className="space-y-2">
                    {[
                      { color: "rose", label: "🔴 EXPIRED", desc: "Must be quarantined. Log wastage using the Log Wastage button on the alert card." },
                      { color: "rose", label: "🔴 URGENT (1–7 Days)", desc: "High risk. Prioritize selling or return to supplier." },
                      { color: "amber", label: "🟠 WARNING (8–30 Days)", desc: "Last window to return to supplier for credit." },
                      { color: "teal",  label: "🔵 NOTICE (31–60 Days)", desc: "Under observation. No urgent action needed." },
                    ].map((item) => (
                      <div key={item.label} className={`p-3 rounded-xl bg-${item.color}-50 border border-${item.color}-200 flex items-start justify-between text-xs gap-2`}>
                        <span className={`font-extrabold text-${item.color}-900 shrink-0`}>{item.label}</span>
                        <span className={`text-${item.color}-800 text-[11px] font-medium text-right`}>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5">
                  <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-teal-600" />Restocking Low-Stock Medicines
                  </h4>
                  <p className="text-xs text-slate-700">
                    Navigate to <strong>Restock</strong>. Each low-stock medicine shows current stock vs threshold. Click <em>&ldquo;Add Stock&rdquo;</em> to enter a new batch (batch number, quantity, expiry date, supplier) and immediately update the inventory.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <h4 className="font-extrabold text-rose-900 text-xs">Logging Wastage from Alert Cards</h4>
                  <p className="text-xs text-rose-800">
                    On the Alerts page, each expired or near-expired batch card has a <em>&ldquo;Log Wastage&rdquo;</em> button. Enter units to write off and the reason. This deducts the units from inventory and records the write-off.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 7: EMAIL NOTIFICATIONS ── */}
            {activeTab === "email" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="border-b border-slate-200 pb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">Section 7</span>
                  <h3 className="text-xl font-extrabold text-[#1E3A5F] mt-1 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-[#1BA6C4]" />Email Notifications
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Automated email alerts keep pharmacy staff informed when stock gets critically low.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#1BA6C4]" />Low-Stock Email Alert
                    </h4>
                    <p className="text-xs text-slate-700">
                      When a medicine&apos;s stock reaches or drops below its configured threshold during a sale, MedTrack automatically sends an email to the configured pharmacy staff address — no manual action needed.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-teal-600" />Configuring the Alert Email Address
                    </h4>
                    <p className="text-xs text-slate-600">
                      Go to <strong>Expiry Alerts</strong> → <em>&ldquo;Email Alert Settings &amp; Logs&rdquo;</em> tab. Enter the pharmacy staff email address and toggle which alert types are active. Click <em>&ldquo;Save Alert Settings&rdquo;</em>.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs">Duplicate Alert Prevention</h4>
                    <p className="text-xs text-slate-600">
                      The system suppresses repeated emails while stock stays below threshold. A fresh alert is sent only after stock recovers above the threshold and then drops again — preventing inbox flooding.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="font-extrabold text-[#1E3A5F] text-xs">Viewing the Email Log</h4>
                    <p className="text-xs text-slate-600">
                      The same settings tab shows a log of all dispatched alerts with their <span className="font-bold text-emerald-700">SENT</span> or <span className="font-bold text-rose-700">FAILED</span> status, subject line, recipient, and timestamp.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

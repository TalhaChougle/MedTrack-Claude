"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  PlusCircle,
  Search,
  Pill,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  X,
  Trash2,
  ShoppingCart,
  Bell,
  Save,
  Sparkles,
} from "lucide-react";
import { autoClassifySchedule } from "@/lib/scheduleClassifier";
import BatchDispenseModal from "@/components/BatchDispenseModal";

// ─── Sell-page FEFO preview types ────────────────────────────────────────────
interface FEFOAllocation {
  batchNumber: string;
  expiryDate: string;
  supplier: string;
  currentQty: number;
  takeQty: number;
}

// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────
function InventoryInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Tab state — driven by ?tab= query param so direct links work
  const [tab, setTab] = useState<"inventory" | "dispense">(
    searchParams.get("tab") === "dispense" ? "dispense" : "inventory"
  );

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Inventory tab state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("ALL");
  const [expandedMedId, setExpandedMedId] = useState<number | null>(null);
  const [dispenseMedModal, setDispenseMedModal] = useState<any | null>(null);
  const [deleteConfirmMed, setDeleteConfirmMed] = useState<any>(null);
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState<any>(null);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [newMedData, setNewMedData] = useState({
    name: "", manufacturer: "", barcode: "", schedule: "OTC", unitPrice: "", reorderThreshold: "10",
  });
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<any>(null);
  const [newBatchData, setNewBatchData] = useState({
    batchNumber: "", quantity: "", expiryDate: "", supplier: "", costPrice: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [thresholdDrafts, setThresholdDrafts] = useState<
    Record<number, { value: string; saving: boolean; error: string; success: string }>
  >({});

  // ── Dispense tab state ───────────────────────────────────────────────────────
  const [dispenseQuery, setDispenseQuery] = useState("");
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [medBatches, setMedBatches] = useState<any[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [customUnitPrice, setCustomUnitPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [dispenseError, setDispenseError] = useState("");
  const [saleResult, setSaleResult] = useState<any>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated") fetchInventoryData();
  }, [status, router]);

  // Refresh on medtrack:refresh events
  useEffect(() => {
    const handler = () => fetchInventoryData();
    window.addEventListener("medtrack:refresh", handler);
    return () => window.removeEventListener("medtrack:refresh", handler);
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "dispense") setTab("dispense");
    else setTab("inventory");
  }, [searchParams]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (addMedOpen || addBatchOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, [addMedOpen, addBatchOpen]);

  // Auto-fill supplier/cost from last batch
  useEffect(() => {
    if (!addBatchOpen || !selectedMedForBatch) return;
    const matching = batchesList.filter((b) => b.medicineId === selectedMedForBatch.id);
    if (!matching.length) return;
    const last = [...matching].sort((a, b) =>
      new Date(b.receivedDate || b.expiryDate || 0).getTime() -
      new Date(a.receivedDate || a.expiryDate || 0).getTime()
    )[0];
    if (!last) return;
    setNewBatchData((prev) => ({
      ...prev,
      supplier: prev.supplier?.trim() ? prev.supplier : last.supplier || "",
      costPrice: prev.costPrice !== "" ? prev.costPrice : last.costPrice != null ? String(last.costPrice) : "",
    }));
  }, [addBatchOpen, selectedMedForBatch, batchesList]);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [medRes, batchRes] = await Promise.all([
        fetch("/api/medicines"),
        fetch("/api/batches"),
      ]);
      if (medRes.ok) setMedicinesList(await medRes.json());
      if (batchRes.ok) setBatchesList(await batchRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // ── Threshold helpers ────────────────────────────────────────────────────────
  const initThresholdDraft = (med: { id: number; reorderThreshold?: number }) => {
    setThresholdDrafts((prev) => {
      if (prev[med.id]) return prev;
      return { ...prev, [med.id]: { value: String(med.reorderThreshold ?? 10), saving: false, error: "", success: "" } };
    });
  };

  const handleSaveThreshold = async (medId: number) => {
    const draft = thresholdDrafts[medId];
    if (!draft) return;
    const parsed = parseInt(draft.value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setThresholdDrafts((p) => ({ ...p, [medId]: { ...p[medId], error: "Must be 0 or greater.", success: "" } }));
      return;
    }
    setThresholdDrafts((p) => ({ ...p, [medId]: { ...p[medId], saving: true, error: "", success: "" } }));
    try {
      const res = await fetch(`/api/medicines/${medId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorderThreshold: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setThresholdDrafts((p) => ({ ...p, [medId]: { ...p[medId], saving: false, error: data.error || "Failed to save.", success: "" } }));
      } else {
        setThresholdDrafts((p) => ({ ...p, [medId]: { ...p[medId], saving: false, error: "", success: "Saved!" } }));
        await fetchInventoryData();
      }
    } catch {
      setThresholdDrafts((p) => ({ ...p, [medId]: { ...p[medId], saving: false, error: "Network error.", success: "" } }));
    }
  };

  // ── Inventory handlers ───────────────────────────────────────────────────────
  const handleDeleteMedicine = async (medId: number) => {
    setActionLoading(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const res = await fetch(`/api/medicines/${medId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Failed to delete medicine.");
      else {
        setSuccessMsg(data.message || "Medicine deleted.");
        setDeleteConfirmMed(null);
        fetchInventoryData();
        window.dispatchEvent(new Event("medtrack:refresh"));
      }
    } catch { setErrorMsg("Error deleting medicine."); }
    finally { setActionLoading(false); }
  };

  const handleDeleteBatch = async (batchId: number) => {
    setActionLoading(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const res = await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Failed to delete batch.");
      else {
        setSuccessMsg(data.message || "Batch deleted.");
        setDeleteConfirmBatch(null);
        fetchInventoryData();
        window.dispatchEvent(new Event("medtrack:refresh"));
      }
    } catch { setErrorMsg("Error deleting batch."); }
    finally { setActionLoading(false); }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const res = await fetch("/api/medicines", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMedData),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Failed to add medicine.");
      else {
        setSuccessMsg(`Medicine '${data.name}' added!`);
        setAddMedOpen(false);
        setNewMedData({ name: "", manufacturer: "", barcode: "", schedule: "OTC", unitPrice: "", reorderThreshold: "10" });
        fetchInventoryData();
      }
    } catch { setErrorMsg("Network error adding medicine."); }
    finally { setActionLoading(false); }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForBatch) return;
    setActionLoading(true); setErrorMsg(""); setSuccessMsg("");
    try {
      const res = await fetch("/api/batches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: selectedMedForBatch.id, ...newBatchData }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Failed to add batch.");
      else {
        setSuccessMsg(`Batch '${data.batchNumber}' added for ${selectedMedForBatch.name}!`);
        setAddBatchOpen(false);
        setNewBatchData({ batchNumber: "", quantity: "", expiryDate: "", supplier: "", costPrice: "" });
        fetchInventoryData();
      }
    } catch { setErrorMsg("Network error adding batch."); }
    finally { setActionLoading(false); }
  };

  // ── Dispense tab helpers ─────────────────────────────────────────────────────
  const handleSelectMedicine = async (med: any) => {
    setSelectedMed(med);
    setDispenseError(""); setSaleResult(null);
    setDiscountPercent("0"); setPatientName(""); setDoctorName("");
    setBatchModalOpen(true);
    const initialPrice = med.unitPrice > 0 ? med.unitPrice.toString() : "";
    setCustomUnitPrice(initialPrice);
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const all = await res.json();
        const filtered = all.filter((b: any) => b.medicineId === med.id && b.quantity > 0);
        setMedBatches(filtered);
        if ((!med.unitPrice || med.unitPrice === 0) && filtered.length > 0 && filtered[0].costPrice > 0) {
          setCustomUnitPrice(filtered[0].costPrice.toString());
        }
      }
    } catch { console.error("Failed to load batches for dispense."); }
  };

  const calculateFEFOPreview = (): { allocation: FEFOAllocation[]; expiredBatches: any[]; validBatches: any[] } => {
    const reqQty = parseInt(quantity) || 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const validBatches = medBatches.filter((b) => b.expiryDate >= todayStr && b.quantity > 0);
    const expiredBatches = medBatches.filter((b) => b.expiryDate < todayStr && b.quantity > 0);
    if (reqQty <= 0 || !validBatches.length) return { allocation: [], expiredBatches, validBatches };
    let remaining = reqQty;
    const allocation: FEFOAllocation[] = [];
    for (const b of validBatches) {
      if (remaining <= 0) break;
      const take = Math.min(b.quantity, remaining);
      allocation.push({ batchNumber: b.batchNumber, expiryDate: b.expiryDate, supplier: b.supplier, currentQty: b.quantity, takeQty: take });
      remaining -= take;
    }
    return { allocation, expiredBatches, validBatches };
  };

  const handleExecuteDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    const reqQty = parseInt(quantity);
    if (isNaN(reqQty) || reqQty <= 0) { setDispenseError("Please enter a valid positive quantity."); return; }
    setDispenseLoading(true); setDispenseError(""); setSaleResult(null);
    try {
      const res = await fetch("/api/sell", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: selectedMed.id,
          quantity: reqQty,
          unitPrice: parseFloat(customUnitPrice) || 0,
          discountPercent: parseFloat(discountPercent) || 0,
          patientName: patientName.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setDispenseError(data.error || "Dispense transaction failed.");
      else {
        setSaleResult(data);
        setPatientName(""); setDoctorName("");
        window.dispatchEvent(new Event("medtrack:refresh"));
        // Refresh both lists
        const [medRes, batchRes] = await Promise.all([fetch("/api/medicines"), fetch("/api/batches")]);
        if (medRes.ok) {
          const freshMeds = await medRes.json();
          setMedicinesList(freshMeds);
          const updated = freshMeds.find((m: any) => m.id === selectedMed.id);
          if (updated) setSelectedMed(updated);
        }
        if (batchRes.ok) {
          const allB = await batchRes.json();
          setBatchesList(allB);
          setMedBatches(allB.filter((b: any) => b.medicineId === selectedMed.id && b.quantity > 0));
        }
      }
    } catch { setDispenseError("Network error processing dispense."); }
    finally { setDispenseLoading(false); }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const filteredMeds = medicinesList.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      (m.name.toLowerCase().includes(q) ||
       m.manufacturer.toLowerCase().includes(q) ||
       (m.barcode && m.barcode.includes(q))) &&
      (scheduleFilter === "ALL" || m.schedule === scheduleFilter)
    );
  });

  const dispenseSearchResults = medicinesList.filter((m) => {
    const q = dispenseQuery.toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) ||
           m.manufacturer?.toLowerCase().includes(q) ||
           (m.barcode && m.barcode.includes(q));
  });

  const fefoData = calculateFEFOPreview();
  const previewAllocation = fefoData.allocation;
  const expiredBatchesInStock = fefoData.expiredBatches;

  const posReqQty = parseInt(quantity) || 0;
  const posUnitPrice = parseFloat(customUnitPrice) || 0;
  const posDiscPct = Math.max(0, Math.min(100, parseFloat(discountPercent) || 0));
  const posSubtotal = posReqQty * posUnitPrice;
  const posDiscAmount = Math.round((posSubtotal * (posDiscPct / 100)) * 100) / 100;
  const posNetTotal = Math.max(0, Math.round((posSubtotal - posDiscAmount) * 100) / 100);

  // ── Tab navigation helper ────────────────────────────────────────────────────
  const switchTab = (t: "inventory" | "dispense") => {
    setTab(t);
    router.replace(`/inventory${t === "dispense" ? "?tab=dispense" : ""}`, { scroll: false });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A5F] tracking-tight flex items-center gap-3">
            <Boxes className="w-8 h-8 text-teal-600" />
            <span>Inventory &amp; Dispensing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage medicine catalog, batches, stock, and FEFO dispensing — all in one place.
          </p>
        </div>

        {tab === "inventory" && (
          <button
            onClick={() => { setErrorMsg(""); setSuccessMsg(""); setAddMedOpen(true); }}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Medicine</span>
          </button>
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => switchTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            tab === "inventory"
              ? "bg-white text-teal-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:bg-white/60"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Inventory
        </button>
        <button
          onClick={() => switchTab("dispense")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            tab === "dispense"
              ? "bg-white text-teal-700 shadow-xs border border-slate-200"
              : "text-slate-600 hover:bg-white/60"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          FEFO Dispense
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          INVENTORY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "inventory" && (
        <div className="space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by medicine name, barcode, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 font-medium shadow-xs"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none max-w-full w-full sm:w-auto shrink-0">
              {["ALL", "OTC", "H", "H1", "X"].map((sch) => (
                <button
                  key={sch}
                  onClick={() => setScheduleFilter(sch)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    scheduleFilter === sch ? "bg-[#1E3A5F] text-white shadow-2xs" : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sch === "ALL" ? "All Schedules" : `Schedule ${sch}`}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine List */}
          {loading ? (
            <p className="text-center py-10 text-slate-500 text-xs font-bold">Loading catalog...</p>
          ) : filteredMeds.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <Pill className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-[#1E3A5F]">No Medicines Found</h3>
              <p className="text-xs text-slate-500 font-medium">
                {searchQuery ? "Try clearing your search query." : "Register your first medicine to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMeds.map((med) => {
                const isExpanded = expandedMedId === med.id;
                const medBatchesInv = batchesList.filter((b) => b.medicineId === med.id);
                const isLowStock = med.totalStock < med.reorderThreshold;
                const isLowStockEq = med.totalStock <= med.reorderThreshold;

                return (
                  <div
                    key={med.id}
                    className={`bg-white border rounded-3xl overflow-hidden transition-all ${
                      isExpanded ? "border-teal-500 shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Row Header */}
                    <div
                      onClick={() => {
                        const opening = expandedMedId !== med.id;
                        setExpandedMedId(isExpanded ? null : med.id);
                        if (opening) initThresholdDraft({ id: med.id, reorderThreshold: med.reorderThreshold });
                      }}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none min-w-0"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-100 text-[#1E3A5F] shrink-0 mt-0.5 sm:mt-0">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h3 className="text-base font-extrabold text-[#1E3A5F] truncate">{med.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                              med.schedule === "OTC" ? "bg-teal-50 text-teal-800 border border-teal-200"
                              : med.schedule === "H" || med.schedule === "H1" ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}>
                              Schedule {med.schedule}
                            </span>
                            {med.barcode ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200 shrink-0">⚡ Barcoded</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">✍️ Manual</span>
                            )}
                            {isLowStockEq && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">⚠ LOW STOCK</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                            {med.manufacturer} • Barcode: {med.barcode || "None"} • ₹{med.unitPrice}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-left md:text-right">
                          <div className="flex items-center gap-1.5 md:justify-end">
                            <span className={`text-xl font-black ${isLowStock ? "text-amber-600" : "text-teal-700"}`}>{med.totalStock}</span>
                            <span className="text-xs text-slate-500 font-bold">Units</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block font-semibold">{medBatchesInv.length} Active Batches</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDispenseMedModal(med); }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-1 cursor-pointer"
                            title="Dispense"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-teal-600" />
                            <span>Dispense</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMedForBatch(med); setErrorMsg(""); setAddBatchOpen(true); }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-teal-800 text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
                            <span>Add Batch</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmMed(med); }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Batches Drawer */}
                    {isExpanded && (
                      <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Active Batches for {med.name}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">Sorted by Expiry ASC</span>
                        </div>

                        {medBatchesInv.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">No active batches logged yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {medBatchesInv.map((b) => {
                              const todayStr = new Date().toISOString().split("T")[0];
                              const isExpired = b.expiryDate < todayStr;
                              return (
                                <div key={b.id} className={`p-3.5 rounded-2xl border space-y-2 text-xs shadow-2xs ${isExpired ? "bg-rose-50/70 border-rose-300" : "bg-white border-slate-200"}`}>
                                  <div className="flex items-center justify-between font-mono">
                                    <span className="font-bold text-[#1E3A5F]">{b.batchNumber}</span>
                                    {isExpired ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-200 text-rose-900 border border-rose-300">🔴 EXPIRED</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">🟢 VALID</span>
                                    )}
                                  </div>
                                  <div className="text-slate-600 space-y-0.5 text-[11px] font-medium">
                                    <p>Quantity: <strong className={isExpired ? "text-rose-700" : "text-slate-800"}>{b.quantity} Units</strong></p>
                                    <p>Expiry: <span className={isExpired ? "text-rose-700 font-extrabold line-through" : "text-teal-800 font-bold"}>{b.expiryDate}</span></p>
                                    <p>Supplier: {b.supplier}</p>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                      <p>Cost: ₹{b.costPrice}/unit</p>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmBatch({ ...b, medicineName: med.name }); }}
                                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />Delete Batch
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Per-medicine Low Stock Alert Threshold */}
                        {(() => {
                          const td = thresholdDrafts[med.id];
                          if (!td) return null;
                          return (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                                <h4 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">Low Stock Alert Threshold</h4>
                              </div>
                              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                                <p className="text-[11px] text-amber-800 font-medium">
                                  Send a low-stock alert when stock reaches or falls below this number. Currently: <strong>{med.totalStock} units</strong> in stock.
                                  {med.totalStock <= (parseInt(td.value) || 0) && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-extrabold text-[10px]">⚠ AT OR BELOW THRESHOLD</span>
                                  )}
                                </p>
                                <div className="flex items-end gap-3">
                                  <div className="flex-1">
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Alert when stock is this many units or less:</label>
                                    <input
                                      type="number" min="0" step="1" value={td.value}
                                      onChange={(e) => setThresholdDrafts((p) => ({ ...p, [med.id]: { ...p[med.id], value: e.target.value, error: "", success: "" } }))}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-800 font-bold text-sm focus:outline-none focus:border-amber-500"
                                      placeholder="e.g. 10"
                                    />
                                  </div>
                                  <button
                                    type="button" disabled={td.saving}
                                    onClick={(e) => { e.stopPropagation(); handleSaveThreshold(med.id); }}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    {td.saving ? "Saving…" : "Save"}
                                  </button>
                                </div>
                                {td.error && <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" />{td.error}</p>}
                                {td.success && <p className="text-[11px] text-teal-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 shrink-0" />{td.success} Threshold set to {td.value} units.</p>}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DISPENSE TAB  (FEFO Point of Sale)
      ══════════════════════════════════════════════════════════════════ */}
      {tab === "dispense" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">FEFO Dispense Algorithm</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Search & Select */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                <label className="block text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">
                  Search Medicine by Name or Barcode
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search e.g. Paracetamol, Cipla..."
                    value={dispenseQuery}
                    onChange={(e) => setDispenseQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                {loading ? (
                  <p className="text-xs text-slate-500 text-center py-4">Loading medicines...</p>
                ) : dispenseSearchResults.length > 0 ? (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>{dispenseQuery.trim() ? "Search Results" : "All Medicines"}</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{dispenseSearchResults.length}</span>
                    </div>
                    {dispenseSearchResults.map((med) => (
                      <button
                        key={med.id}
                        onClick={() => handleSelectMedicine(med)}
                        className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          selectedMed?.id === med.id
                            ? "bg-teal-50 border-teal-300 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-[#1E3A5F] text-sm">{med.name}</p>
                            {med.barcode ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-200">⚡ Barcoded</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">✍️ Manual</span>
                            )}
                          </div>
                          <p className="text-slate-500 font-medium">{med.manufacturer} • Schedule {med.schedule}{med.unitPrice ? ` • ₹${med.unitPrice}` : ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-extrabold text-sm ${med.totalStock > 0 ? "text-teal-700" : "text-rose-500"}`}>{med.totalStock}</span>
                          <span className="block text-[10px] text-slate-500 font-bold">In Stock</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No medicines found.</p>
                )}
              </div>
            </div>

            {/* Right: FEFO Preview & Dispense Form */}
            <div className="lg:col-span-7 space-y-6">
              {!selectedMed ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                  <Pill className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="text-base font-extrabold text-[#1E3A5F]">No Medicine Selected</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                    Search and select a medicine from the left panel to preview automatic FEFO batch allocation.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-md">
                  {/* Selected Medicine Card */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">Schedule {selectedMed.schedule}</span>
                        {selectedMed.barcode ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-extrabold border border-teal-200">⚡ Barcoded</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold border border-slate-200">✍️ Manual</span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-[#1E3A5F] mt-1">{selectedMed.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">Manufacturer: {selectedMed.manufacturer} • Barcode: {selectedMed.barcode || "None"}</p>
                      <button
                        type="button"
                        onClick={() => setBatchModalOpen(true)}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />Select Specific Batch
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold text-teal-700">{selectedMed.totalStock}</span>
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Units</span>
                    </div>
                  </div>

                  {/* Dispense Form */}
                  <form onSubmit={handleExecuteDispense} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Quantity *</label>
                        <input
                          type="number" min="1" max={selectedMed.totalStock} value={quantity}
                          onChange={(e) => setQuantity(e.target.value)} required
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-base font-bold text-slate-800 text-center focus:outline-none focus:border-teal-600 shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Unit Price (₹) *</label>
                        <input
                          type="number" step="0.01" min="0" value={customUnitPrice}
                          onChange={(e) => setCustomUnitPrice(e.target.value)} placeholder="e.g. 25.00" required
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-base font-bold text-slate-800 text-center focus:outline-none focus:border-teal-600 shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-1.5">Discount (%)</label>
                        <input
                          type="number" step="0.1" min="0" max="100" value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)} placeholder="0"
                          className="w-full bg-amber-50/60 border border-amber-300 rounded-2xl px-3 py-3 text-base font-bold text-amber-900 text-center focus:outline-none focus:border-amber-500 shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Quick Discount Presets */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Discount:</span>
                      {["0", "5", "10", "15", "20"].map((pct) => (
                        <button
                          key={pct} type="button" onClick={() => setDiscountPercent(pct)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            discountPercent === pct ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          }`}
                        >{pct}%</button>
                      ))}
                    </div>

                    {/* Patient & Doctor */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#1E3A5F] uppercase tracking-wider">Customer &amp; Prescription Info</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Optional</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient&apos;s Name</label>
                          <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Rahul Sharma"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600 shadow-2xs" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Doctor&apos;s Name</label>
                          <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="e.g. Dr. A. K. Verma"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600 shadow-2xs" />
                        </div>
                      </div>
                    </div>

                    {/* Total Bill */}
                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between shadow-xs">
                      <div className="space-y-0.5">
                        <span className="text-xs text-teal-900 font-extrabold block uppercase tracking-wider">Total Sale Bill</span>
                        <div className="text-[11px] text-slate-600 font-medium space-x-2">
                          <span>Subtotal: ₹{posSubtotal.toFixed(2)}</span>
                          {posDiscPct > 0 && <span className="text-amber-800 font-bold">• Discount ({posDiscPct}%): -₹{posDiscAmount.toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-teal-700 font-mono">₹{posNetTotal.toFixed(2)}</span>
                        {posDiscPct > 0 && <span className="block text-[10px] text-amber-700 font-bold">Saved ₹{posDiscAmount.toFixed(2)}</span>}
                      </div>
                    </div>

                    {/* FEFO Allocation Preview */}
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-teal-600" />Automatic FEFO Batch Allocation Preview
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">Sorted by Expiry ASC</span>
                      </div>

                      {expiredBatchesInStock.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                          <div className="flex items-center justify-between font-extrabold">
                            <span className="flex items-center gap-1.5 text-rose-700">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              {expiredBatchesInStock.length} Expired Batch(es) Detected &amp; Blocked
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 text-[10px] uppercase font-black">DO NOT DISPENSE</span>
                          </div>
                          <p className="text-[11px] text-rose-700 font-medium">FEFO automatically excludes expired stock. Log these batches as Wastage from Expiry Alerts.</p>
                          {expiredBatchesInStock.map((b: any) => (
                            <div key={b.id} className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between font-mono text-[11px]">
                              <span>Batch: <strong className="text-rose-900">{b.batchNumber}</strong> (Exp: <span className="line-through text-rose-600">{b.expiryDate}</span>)</span>
                              <span className="font-extrabold text-rose-600">🔴 EXPIRED ({b.quantity} units)</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewAllocation.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-1">
                          <p className="font-bold text-slate-700">No Valid Unexpired Batches Available</p>
                          <p className="text-[11px]">
                            {expiredBatchesInStock.length > 0
                              ? "All available stock is EXPIRED. Add a fresh batch or log wastage."
                              : "Please stock in a new batch to dispense this medicine."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {previewAllocation.map((item, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs shadow-2xs">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-[11px]">#{idx + 1}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-mono font-bold text-[#1E3A5F]">{item.batchNumber}</p>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-200 text-emerald-900 border border-emerald-300">🟢 VALID</span>
                                  </div>
                                  <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                                    Expiry: <strong className="text-emerald-800">{item.expiryDate}</strong> • Supplier: {item.supplier}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-emerald-700 text-sm">-{item.takeQty} units</span>
                                <span className="block text-[10px] text-slate-500">({item.currentQty} in batch)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {dispenseError && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /><span>{dispenseError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={dispenseLoading || previewAllocation.length === 0}
                      className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <ShoppingCart className="w-5 h-5 text-teal-200" />
                      <span>Confirm Dispense &amp; Log Sale</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Sale Receipt */}
              {saleResult && (
                <div className="bg-emerald-50/50 border border-emerald-300 rounded-3xl p-6 space-y-4 shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <h3 className="text-base font-extrabold text-[#1E3A5F]">Dispense &amp; Sale Completed!</h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">Stock deducted by FEFO algorithm</p>
                      </div>
                    </div>
                    <button onClick={() => setSaleResult(null)} className="px-3 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 cursor-pointer">
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-emerald-200/60 font-medium">
                    <div><span className="text-slate-400 text-[10px] block font-bold uppercase">Medicine</span><span className="font-extrabold text-[#1E3A5F] text-sm">{saleResult.medicineName}</span></div>
                    <div><span className="text-slate-400 text-[10px] block font-bold uppercase">Sold</span><span className="font-bold text-slate-800 text-sm">{saleResult.requestedQuantity} Units</span></div>
                    <div><span className="text-slate-400 text-[10px] block font-bold uppercase">Total Bill</span><span className="font-black text-emerald-700 text-base">₹{saleResult.totalPrice}</span></div>
                  </div>

                  {(saleResult.patientName || saleResult.doctorName) && (
                    <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-emerald-200/60">
                      {saleResult.patientName && <div><span className="text-slate-400 text-[10px] block font-bold uppercase">Patient</span><span className="font-extrabold text-slate-800">{saleResult.patientName}</span></div>}
                      {saleResult.doctorName && <div><span className="text-slate-400 text-[10px] block font-bold uppercase">Doctor</span><span className="font-extrabold text-slate-800">{saleResult.doctorName}</span></div>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-[#1E3A5F] uppercase tracking-wider">Batches Deducted (Nearest Expiry First):</p>
                    <div className="space-y-1.5">
                      {saleResult.deductions?.map((d: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs font-mono shadow-2xs">
                          <span className="text-slate-700 font-semibold">{d.batchNumber} (Exp: <strong className="text-amber-700">{d.expiryDate}</strong>)</span>
                          <span className="text-emerald-700 font-extrabold">-{d.deductedQuantity} units ({d.newBatchQuantity} remaining)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS (shared between both tabs)
      ══════════════════════════════════════════════════════════════════ */}

      {/* Add New Medicine */}
      {addMedOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-[#1E3A5F]">Register New Medicine</h3>
              <button onClick={() => setAddMedOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {medicinesList.length > 0 && (
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5 text-xs shadow-2xs">
                <label className="block text-[#1E3A5F] font-extrabold text-xs">Choose Existing Medicine (Auto-Fills Details):</label>
                <select onChange={(e) => {
                    const found = medicinesList.find((m) => m.id.toString() === e.target.value);
                    if (found) { setAddMedOpen(false); setSelectedMedForBatch(found); setAddBatchOpen(true); }
                  }}
                  className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="">-- Or Choose Existing Medicine to Add Batch --</option>
                  {medicinesList.map((m) => <option key={m.id} value={m.id}>{m.name} • {m.manufacturer} (Schedule {m.schedule})</option>)}
                </select>
              </div>
            )}
            <form onSubmit={handleAddMedicine} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Medicine Name *</label>
                <input type="text" required placeholder="e.g. Paracetamol 500mg" value={newMedData.name}
                  onChange={(e) => setNewMedData({ ...newMedData, name: e.target.value, schedule: autoClassifySchedule(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-teal-600 font-medium" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Manufacturer *</label>
                <input type="text" required placeholder="e.g. Cipla Ltd" value={newMedData.manufacturer}
                  onChange={(e) => setNewMedData({ ...newMedData, manufacturer: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-teal-600 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Barcode (Optional)</label>
                  <input type="text" placeholder="e.g. 8901234567890" value={newMedData.barcode}
                    onChange={(e) => setNewMedData({ ...newMedData, barcode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-mono" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Drug Schedule</label>
                  <select value={newMedData.schedule} onChange={(e) => setNewMedData({ ...newMedData, schedule: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-semibold">
                    <option value="OTC">OTC</option><option value="H">Schedule H</option>
                    <option value="H1">Schedule H1</option><option value="X">Schedule X</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit Price (₹)</label>
                  <input type="number" step="0.01" placeholder="e.g. 15.00" value={newMedData.unitPrice}
                    onChange={(e) => setNewMedData({ ...newMedData, unitPrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-medium" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reorder Threshold</label>
                  <input type="number" placeholder="e.g. 10" value={newMedData.reorderThreshold}
                    onChange={(e) => setNewMedData({ ...newMedData, reorderThreshold: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-medium" />
                </div>
              </div>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold text-white text-xs shadow-md cursor-pointer">Save Medicine</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch */}
      {addBatchOpen && selectedMedForBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#1E3A5F]">Add New Batch</h3>
                <p className="text-xs text-slate-500 font-medium">For: {selectedMedForBatch.name}</p>
              </div>
              <button onClick={() => { setAddBatchOpen(false); setNewBatchData({ batchNumber: "", quantity: "", expiryDate: "", supplier: "", costPrice: "" }); }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#1E3A5F] text-sm">{selectedMedForBatch.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-teal-800 border border-teal-300">✓ Auto-Filled</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] font-medium pt-1 border-t border-teal-200/60">
                <p><strong>Manufacturer:</strong> {selectedMedForBatch.manufacturer}</p>
                <p><strong>Barcode:</strong> {selectedMedForBatch.barcode || "None"}</p>
                <p><strong>Price:</strong> ₹{selectedMedForBatch.unitPrice}/unit</p>
                <p><strong>Current Stock:</strong> {selectedMedForBatch.totalStock} units</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Fill batch number, expiry date, quantity and supplier below.</span>
            </div>
            <form onSubmit={handleAddBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Batch Number *</label>
                  <input type="text" required placeholder="e.g. BATCH-2026-08" value={newBatchData.batchNumber}
                    onChange={(e) => setNewBatchData({ ...newBatchData, batchNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:border-teal-600 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantity *</label>
                  <input type="number" required min="1" placeholder="e.g. 100" value={newBatchData.quantity}
                    onChange={(e) => setNewBatchData({ ...newBatchData, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Expiry Date *</label>
                  <input type="date" required value={newBatchData.expiryDate}
                    onChange={(e) => setNewBatchData({ ...newBatchData, expiryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-medium" />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cost Price (₹)</label>
                  <input type="number" step="0.01" placeholder="e.g. 12.50" value={newBatchData.costPrice}
                    onChange={(e) => setNewBatchData({ ...newBatchData, costPrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-teal-600 font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier *</label>
                <input type="text" required placeholder="e.g. Cipla Distributor" value={newBatchData.supplier}
                  onChange={(e) => setNewBatchData({ ...newBatchData, supplier: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-teal-600 font-medium" />
              </div>
              <button type="submit" disabled={actionLoading} className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold text-white text-xs shadow-md cursor-pointer">Confirm Batch Addition</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Medicine Confirm */}
      {deleteConfirmMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700"><Trash2 className="w-5 h-5 text-rose-600" /><h3 className="text-base font-extrabold">Confirm Delete Medicine</h3></div>
              <button onClick={() => setDeleteConfirmMed(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <p className="font-bold text-sm">Delete &apos;{deleteConfirmMed.name}&apos;?</p>
              <p className="text-rose-700">This removes the medicine and all its batches ({deleteConfirmMed.batchCount || 0} batches, {deleteConfirmMed.totalStock || 0} units). This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 text-xs font-bold pt-2">
              <button onClick={() => setDeleteConfirmMed(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">Cancel</button>
              <button disabled={actionLoading} onClick={() => handleDeleteMedicine(deleteConfirmMed.id)} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50">
                <Trash2 className="w-4 h-4" />{actionLoading ? "Deleting..." : "Delete Medicine"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirm */}
      {deleteConfirmBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700"><Trash2 className="w-5 h-5 text-rose-600" /><h3 className="text-base font-extrabold">Confirm Delete Batch</h3></div>
              <button onClick={() => setDeleteConfirmBatch(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <p className="font-bold text-sm">Delete Batch &apos;{deleteConfirmBatch.batchNumber}&apos;?</p>
              <p className="text-rose-700">This removes Batch &apos;{deleteConfirmBatch.batchNumber}&apos; ({deleteConfirmBatch.quantity} units) for {deleteConfirmBatch.medicineName}.</p>
            </div>
            <div className="flex justify-end gap-3 text-xs font-bold pt-2">
              <button onClick={() => setDeleteConfirmBatch(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">Cancel</button>
              <button disabled={actionLoading} onClick={() => handleDeleteBatch(deleteConfirmBatch.id)} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50">
                <Trash2 className="w-4 h-4" />{actionLoading ? "Deleting..." : "Delete Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BatchDispenseModal (Inventory tab Dispense button) */}
      {dispenseMedModal && (
        <BatchDispenseModal
          isOpen={!!dispenseMedModal}
          medicine={dispenseMedModal}
          onClose={() => setDispenseMedModal(null)}
          onSuccess={() => fetchInventoryData()}
        />
      )}
    </div>
  );
}

// ─── Default export: wraps InventoryInner in Suspense ────────────────────────
// Required by Next.js because useSearchParams() is called inside the component.
export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryInner />
    </Suspense>
  );
}

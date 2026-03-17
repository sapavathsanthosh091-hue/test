import React from 'react';
import {
  CheckCircle2,
  X,
  Save
} from 'lucide-react';

interface SpendingModalProps {
  showSpendingModal: boolean;
  setShowSpendingModal: (show: boolean) => void;
  editingSpendingId: string | null;
  spendingFormData: {
    amount: number;
    reason: string;
  };
  setSpendingFormData: (data: any) => void;
  handleSaveSpendingRecord: () => void;
  spendingModalSuccess: string | null;
}

export default function SpendingModal({
  showSpendingModal,
  setShowSpendingModal,
  editingSpendingId,
  spendingFormData,
  setSpendingFormData,
  handleSaveSpendingRecord,
  spendingModalSuccess
}: SpendingModalProps) {
  if (!showSpendingModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowSpendingModal(false)} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">
            {editingSpendingId ? 'Edit Spending Record' : 'Add Spending Record'}
          </h3>
          <button onClick={() => setShowSpendingModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {spendingModalSuccess && (
          <div className="p-4 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-700">{spendingModalSuccess}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (₹)</label>
            <input
              type="number"
              value={spendingFormData.amount}
              onChange={(e) => setSpendingFormData({ ...spendingFormData, amount: Number(e.target.value) })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reason for Spending</label>
            <textarea
              value={spendingFormData.reason}
              onChange={(e) => setSpendingFormData({ ...spendingFormData, reason: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-20 resize-none"
              placeholder="Describe what this spending was for..."
              required
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setShowSpendingModal(false)}
              className="flex-1 px-4 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSpendingRecord}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              {editingSpendingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
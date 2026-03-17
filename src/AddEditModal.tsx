import React from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Save
} from 'lucide-react';
import { SpendingRecord } from './types';

interface AddEditModalProps {
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  isEditing: string | null;
  formData: {
    secretaryName: string;
    allocatedAmount: number;
    spendingRecords: SpendingRecord[];
    description: string;
  };
  setFormData: (data: any) => void;
  SECRETARIES: string[];
  setSpendingFormData: (data: any) => void;
  setEditingSpendingId: (id: string | null) => void;
  setShowSpendingModal: (show: boolean) => void;
  handleEditSpendingRecord: (record: SpendingRecord) => void;
  handleDeleteSpendingRecord: (id: string) => void;
  handleSaveBudget: (e: React.FormEvent) => void;
  modalSuccess: string | null;
}

export default function AddEditModal({
  showAddModal,
  setShowAddModal,
  isEditing,
  formData,
  setFormData,
  SECRETARIES,
  setSpendingFormData,
  setEditingSpendingId,
  setShowSpendingModal,
  handleEditSpendingRecord,
  handleDeleteSpendingRecord,
  handleSaveBudget,
  modalSuccess
}: AddEditModalProps) {
  if (!showAddModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Edit Portfolio' : 'Add New Portfolio'}
          </h3>
          <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {modalSuccess && (
          <div className="p-4 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-700">{modalSuccess}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveBudget} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Secretary Portfolio</label>
            <select
              value={formData.secretaryName}
              onChange={(e) => setFormData({ ...formData, secretaryName: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              required
            >
              {SECRETARIES.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Allocated (₹)</label>
            <input
              type="number"
              value={formData.allocatedAmount}
              onChange={(e) => setFormData({ ...formData, allocatedAmount: Number(e.target.value) })}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
              required
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-24 resize-none"
              placeholder="What is this budget used for?"
            />
          </div>

          {/* Spending Records Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Spending Records</label>
              <button
                type="button"
                onClick={() => {
                  setSpendingFormData({ amount: 0, reason: '' });
                  setEditingSpendingId(null);
                  setShowSpendingModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Spending
              </button>
            </div>

            {formData.spendingRecords.length > 0 ? (
              <div className="bg-gray-50 rounded-2xl p-4 max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Reason</th>
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.spendingRecords.map((record) => (
                      <tr key={record.id} className="text-gray-700">
                        <td className="py-2 font-medium">₹{record.amount.toLocaleString()}</td>
                        <td className="py-2">{record.reason}</td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditSpendingRecord(record)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpendingRecord(record.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                <p className="text-sm">No spending records yet</p>
                <p className="text-xs mt-1">Add spending records to track expenses</p>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>Total Spent: <span className="font-bold text-emerald-600">
                ₹{formData.spendingRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </span></p>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-5 h-5" />
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
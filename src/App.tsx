/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocFromServer,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  LayoutDashboard, 
  Plus, 
  Edit2, 
  Trash2, 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  ChevronRight,
  Info
} from 'lucide-react';
import { db } from './firebase';
import { Budget, SpendingRecord, OperationType, FirestoreErrorInfo } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SECRETARIES = [
  'Sports Secretary',
  'General Secretary',
  'Literary Secretary',
  'Social Secretary',
  'Health and Hygiene Secretary',
  'Technical Secretary'
];

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'];

export default function App() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    secretaryName: SECRETARIES[0],
    allocatedAmount: 0,
    spendingRecords: [] as SpendingRecord[],
    description: ''
  });

  // Spending record form state
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [editingSpendingId, setEditingSpendingId] = useState<string | null>(null);
  const [spendingFormData, setSpendingFormData] = useState({
    amount: 0,
    reason: ''
  });
  const [spendingModalSuccess, setSpendingModalSuccess] = useState<string | null>(null);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(`Database error. ${error instanceof Error ? error.message : ''}`);
  };

  useEffect(() => {
    const q = query(collection(db, 'budgets'), orderBy('secretaryName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Handle migration from old spentAmount to spendingRecords
        if (data.spentAmount !== undefined && !data.spendingRecords) {
          data.spendingRecords = data.spentAmount > 0 ? [{
            id: 'migrated',
            amount: data.spentAmount,
            reason: 'Migrated from old format',
            date: data.lastUpdated || new Date().toISOString()
          }] : [];
        }
        return {
          id: doc.id,
          ...data
        } as Budget;
      });
      setBudgets(budgetData);

      // Initialize budgets if empty (for first time setup)
      if (budgetData.length === 0) {
        initializeBudgets();
      }
      setLoading(false);
    }, (err) => {
      console.error('Firebase connection error:', err);
      handleFirestoreError(err, OperationType.LIST, 'budgets');
      // Fallback to sample data if Firebase fails
      setBudgets([
        {
          id: 'sports',
          secretaryName: 'Sports Secretary',
          allocatedAmount: 10000,
          spendingRecords: [
            { id: '1', amount: 2500, reason: 'Equipment purchase', date: new Date().toISOString() },
            { id: '2', amount: 1500, reason: 'Tournament fees', date: new Date().toISOString() }
          ],
          description: 'Sports activities budget'
        },
        {
          id: 'general',
          secretaryName: 'General Secretary',
          allocatedAmount: 15000,
          spendingRecords: [
            { id: '3', amount: 3000, reason: 'Event materials', date: new Date().toISOString() }
          ],
          description: 'General activities budget'
        }
      ]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const initializeBudgets = async () => {
    try {
      for (const name of SECRETARIES) {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'budgets', id), {
          secretaryName: name,
          allocatedAmount: 10000,
          spendingRecords: [],
          description: `Budget for ${name} activities.`,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'budgets');
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const budgetId = isEditing || formData.secretaryName.toLowerCase().replace(/\s+/g, '-');
      const data = {
        ...formData,
        lastUpdated: new Date().toISOString()
      };

      if (isEditing) {
        await updateDoc(doc(db, 'budgets', isEditing), data);
      } else {
        await setDoc(doc(db, 'budgets', budgetId), data);
      }

      setIsEditing(null);
      setFormData({ secretaryName: SECRETARIES[0], allocatedAmount: 0, spendingRecords: [], description: '' });
      setError(null);
      setModalSuccess(isEditing ? 'Budget updated successfully!' : 'Budget created successfully!');
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowAddModal(false);
        setModalSuccess(null);
        setSuccess(isEditing ? 'Budget updated successfully!' : 'Budget created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }, 2000);
    } catch (err) {
      console.error('Error saving budget:', err);
      handleFirestoreError(err, OperationType.WRITE, 'budgets');
      // Fallback: just close the modal
      setIsEditing(null);
      setShowAddModal(false);
      setFormData({ secretaryName: SECRETARIES[0], allocatedAmount: 0, spendingRecords: [], description: '' });
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;

    try {
      await deleteDoc(doc(db, 'budgets', id));
    } catch (err) {
      console.error('Error deleting budget:', err);
      handleFirestoreError(err, OperationType.DELETE, `budgets/${id}`);
    }
  };

  const handleSaveSpendingRecord = () => {
    if (editingSpendingId) {
      // Edit existing record
      setFormData({
        ...formData,
        spendingRecords: formData.spendingRecords.map(record =>
          record.id === editingSpendingId
            ? { ...record, amount: spendingFormData.amount, reason: spendingFormData.reason }
            : record
        )
      });
      setSpendingModalSuccess('Spending record updated successfully!');
    } else {
      // Add new record
      const newRecord: SpendingRecord = {
        id: Date.now().toString(),
        amount: spendingFormData.amount,
        reason: spendingFormData.reason,
        date: new Date().toISOString()
      };
      setFormData({
        ...formData,
        spendingRecords: [...formData.spendingRecords, newRecord]
      });
      setSpendingModalSuccess('Spending record added successfully!');
    }
    setSpendingFormData({ amount: 0, reason: '' });
    setEditingSpendingId(null);
    // Close modal after 2 seconds
    setTimeout(() => {
      setShowSpendingModal(false);
      setSpendingModalSuccess(null);
      setSuccess(editingSpendingId ? 'Spending record updated successfully!' : 'Spending record added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }, 2000);
  };

  const handleEditSpendingRecord = (record: SpendingRecord) => {
    setSpendingFormData({ amount: record.amount, reason: record.reason });
    setEditingSpendingId(record.id);
    setShowSpendingModal(true);
  };

  const handleDeleteSpendingRecord = (recordId: string) => {
    setFormData({
      ...formData,
      spendingRecords: formData.spendingRecords.filter(record => record.id !== recordId)
    });
  };

  const stats = useMemo(() => {
    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spendingRecords.reduce((s, r) => s + r.amount, 0), 0);
    const remaining = totalAllocated - totalSpent;
    const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    const chartData = budgets.map(b => ({
      name: b.secretaryName,
      value: b.spendingRecords.reduce((s, r) => s + r.amount, 0),
      allocated: b.allocatedAmount
    }));

    // Group spending by reason
    const spendingByReason: { [key: string]: number } = {};
    budgets.forEach(budget => {
      budget.spendingRecords.forEach(record => {
        const reason = record.reason || 'Other';
        spendingByReason[reason] = (spendingByReason[reason] || 0) + record.amount;
      });
    });

    const reasonChartData = Object.entries(spendingByReason)
      .map(([reason, amount]) => ({ name: reason, value: amount }))
      .sort((a, b) => b.value - a.value); // Sort by amount descending

    return { totalAllocated, totalSpent, remaining, percentSpent, chartData, reasonChartData };
  }, [budgets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Hostel Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Management</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-8 bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-green-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Budget</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">₹{stats.totalAllocated.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Allocated for all portfolios</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Spent</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-emerald-600">₹{stats.totalSpent.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(stats.percentSpent, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-600">{stats.percentSpent.toFixed(1)}%</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-amber-600">₹{stats.remaining.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Unspent balance</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Portfolios</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{budgets.length}</p>
            <p className="text-sm text-gray-500 mt-1">Active secretary accounts</p>
          </div>
        </div>

        {/* Bar Chart Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm mb-10">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Budget vs Spending Overview
          </h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="allocated" name="Allocated Budget" fill="#E3F2FD" radius={[6, 6, 0, 0]} />
                <Bar dataKey="value" name="Amount Spent" fill="#FF6B6B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm mb-10">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Spending Distribution by Secretary
          </h2>
          <div className="h-[400px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData.filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.chartData.filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount Spent']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget List */}
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-black/5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Portfolios</h2>
              <p className="text-sm text-gray-500">Detailed breakdown of secretary spending</p>
            </div>
            <button
              onClick={() => {
                setFormData({ secretaryName: SECRETARIES[0], allocatedAmount: 0, spendingRecords: [], description: '' });
                setIsEditing(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-5 h-5" />
              Add Portfolio
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Secretary</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Allocation</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Spent</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Usage</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {budgets.map((budget, index) => {
                  const spentAmount = budget.spendingRecords.reduce((s, r) => s + r.amount, 0);
                  const percent = budget.allocatedAmount > 0 ? (spentAmount / budget.allocatedAmount) * 100 : 0;
                  return (
                    <tr key={budget.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold",
                            `bg-[${COLORS[index % COLORS.length]}]`
                          )} style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                            {budget.secretaryName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{budget.secretaryName}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{budget.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold">₹{budget.allocatedAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-emerald-600">₹{spentAmount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{budget.spendingRecords.length} entries</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-40">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{percent.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                percent > 90 ? "bg-red-500" : percent > 70 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setFormData({
                                secretaryName: budget.secretaryName,
                                allocatedAmount: budget.allocatedAmount,
                                spendingRecords: budget.spendingRecords,
                                description: budget.description || ''
                              });
                              setIsEditing(budget.id);
                              setShowAddModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-gray-400 font-medium uppercase tracking-widest">
            &copy; 2026 Hostel Management System &bull; Secure Admin Portal
          </p>
        </footer>
      </main>

      {/* Modal */}
      {showAddModal && (
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
      )}

      {/* Spending Record Modal */}
      {showSpendingModal && (
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
      )}
    </div>
  );
}

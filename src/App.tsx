/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
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
  Info,
  LogOut,
  Shield
} from 'lucide-react';
import { db } from './firebase';
import { Budget, SpendingRecord, OperationType, FirestoreErrorInfo } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import PinLogin from './PinLogin';

const AddEditModal = lazy(() => import('./AddEditModal'));
const SpendingModal = lazy(() => import('./SpendingModal'));

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [countdown, setCountdown] = useState(5);

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

  // Check admin status on mount
  useEffect(() => {
    const adminStatus = localStorage.getItem('adminLoggedIn');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // Auto-open PIN login after 5 seconds if not admin
  useEffect(() => {
    if (!isAdmin && !loading) {
      setCountdown(5);
      const timer = setTimeout(() => {
        setShowPinLogin(true);
      }, 5000); // 5 seconds

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [isAdmin, loading]);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    localStorage.setItem('adminLoggedIn', 'true');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('adminLoggedIn');
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
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Admin
                </div>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {countdown > 0 && countdown <= 5 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    Admin access in {countdown}s
                  </div>
                )}
                <button
                  onClick={() => setShowPinLogin(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Admin Access
                </button>
              </div>
            )}
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
            {isAdmin && (
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
            )}
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
                        {isAdmin && (
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
                        )}
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
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>}>
        <AddEditModal
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          SECRETARIES={SECRETARIES}
          setSpendingFormData={setSpendingFormData}
          setEditingSpendingId={setEditingSpendingId}
          setShowSpendingModal={setShowSpendingModal}
          handleEditSpendingRecord={handleEditSpendingRecord}
          handleDeleteSpendingRecord={handleDeleteSpendingRecord}
          handleSaveBudget={handleSaveBudget}
          modalSuccess={modalSuccess}
        />
      </Suspense>

      {/* Spending Record Modal */}
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>}>
        <SpendingModal
          showSpendingModal={showSpendingModal}
          setShowSpendingModal={setShowSpendingModal}
          editingSpendingId={editingSpendingId}
          spendingFormData={spendingFormData}
          setSpendingFormData={setSpendingFormData}
          handleSaveSpendingRecord={handleSaveSpendingRecord}
          spendingModalSuccess={spendingModalSuccess}
        />
      </Suspense>

      {/* PIN Login Modal */}
      <PinLogin
        isOpen={showPinLogin}
        onClose={() => setShowPinLogin(false)}
        onLogin={handleAdminLogin}
      />
    </div>
  );
}

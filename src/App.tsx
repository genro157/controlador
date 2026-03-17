/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Loan, LoanStatus, FirestoreErrorInfo } from './types';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  format, 
  isPast, 
  isToday, 
  addDays, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval, 
  isWithinInterval,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: FirestoreErrorInfo['operationType'], path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string, icon: any, color: string, trend?: string }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col gap-3">
    <div className="flex justify-between items-start">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-stone-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-stone-900">{value}</h3>
    </div>
  </div>
);

const LoanForm = ({ onSave, onCancel }: { onSave: (loan: Partial<Loan>) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    amountLoaned: '',
    amountToReceive: '',
    loanDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    paymentMethod: 'PIX',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amountLoaned: Number(formData.amountLoaned),
      amountToReceive: Number(formData.amountToReceive),
      status: 'pendente'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-stone-900">Novo Empréstimo</h2>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            <Plus className="rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome do Cliente</label>
            <input 
              required
              type="text" 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              placeholder="Ex: João Silva"
              value={formData.clientName}
              onChange={e => setFormData({...formData, clientName: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Valor Emprestado</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  required
                  type="number" 
                  step="0.01"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                  placeholder="0,00"
                  value={formData.amountLoaned}
                  onChange={e => setFormData({...formData, amountLoaned: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Valor a Receber</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input 
                  required
                  type="number" 
                  step="0.01"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                  placeholder="0,00"
                  value={formData.amountToReceive}
                  onChange={e => setFormData({...formData, amountToReceive: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Data Empréstimo</label>
              <input 
                required
                type="date" 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                value={formData.loanDate}
                onChange={e => setFormData({...formData, loanDate: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Vencimento</label>
              <input 
                required
                type="date" 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Forma de Pagamento</label>
            <select 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              value={formData.paymentMethod}
              onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
            >
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Observações</label>
            <textarea 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              placeholder="Notas adicionais..."
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-stone-100 text-stone-600 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

const LoanCard = ({ loan, onUpdateStatus, onDelete }: { loan: Loan, onUpdateStatus: (id: string, status: LoanStatus) => void, onDelete: (id: string) => void }) => {
  const isOverdue = loan.status === 'pendente' && isPast(parseISO(loan.dueDate)) && !isToday(parseISO(loan.dueDate));
  const effectiveStatus = isOverdue ? 'atrasado' : loan.status;
  
  const statusConfig = {
    pendente: { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Pendente' },
    pago: { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2, label: 'Pago' },
    atrasado: { color: 'text-rose-600 bg-rose-50', icon: AlertCircle, label: 'Atrasado' }
  };

  const { color, icon: StatusIcon, label } = statusConfig[effectiveStatus];

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 hover:border-stone-200 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-stone-900 truncate max-w-[150px]">{loan.clientName}</h4>
          <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
            <Calendar size={12} />
            Vence em {format(parseISO(loan.dueDate), 'dd/MM/yyyy')}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 ${color}`}>
          <StatusIcon size={10} />
          {label}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Emprestado</p>
          <p className="font-bold text-stone-900">R$ {loan.amountLoaned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">A Receber</p>
          <p className="font-bold text-stone-900">R$ {loan.amountToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-stone-50">
        <div className="flex gap-2">
          {loan.status !== 'pago' && (
            <button 
              onClick={() => onUpdateStatus(loan.id, 'pago')}
              className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Marcar Pago
            </button>
          )}
          {loan.status === 'pago' && (
            <button 
              onClick={() => onUpdateStatus(loan.id, 'pendente')}
              className="text-xs font-bold text-stone-400 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Reabrir
            </button>
          )}
        </div>
        <button 
          onClick={() => onDelete(loan.id)}
          className="text-stone-300 hover:text-rose-500 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativos' | 'finalizados'>('ativos');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoans([]);
      return;
    }

    const q = query(
      collection(db, 'loans'),
      where('uid', '==', user.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      setLoans(loansData);
    }, (error) => {
      handleFirestoreError(error, 'list', 'loans');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveLoan = async (loanData: Partial<Loan>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'loans'), {
        ...loanData,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, 'create', 'loans');
    }
  };

  const handleUpdateStatus = async (id: string, status: LoanStatus) => {
    try {
      await updateDoc(doc(db, 'loans', id), { status });
    } catch (error) {
      handleFirestoreError(error, 'update', `loans/${id}`);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, 'loans', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `loans/${id}`);
    }
  };

  const stats = useMemo(() => {
    const totalInvested = loans.reduce((acc, l) => acc + l.amountLoaned, 0);
    const totalToReceive = loans.reduce((acc, l) => acc + l.amountToReceive, 0);
    const totalProfit = totalToReceive - totalInvested;
    const avgInterest = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    
    const activeLoans = loans.filter(l => l.status !== 'pago');
    const finishedLoans = loans.filter(l => l.status === 'pago');
    
    const overdueCount = activeLoans.filter(l => isPast(parseISO(l.dueDate)) && !isToday(parseISO(l.dueDate))).length;

    return { totalInvested, totalToReceive, totalProfit, avgInterest, overdueCount, activeLoans, finishedLoans };
  }, [loans]);

  const chartData = useMemo(() => {
    // Group by month for the last 6 months
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthLoans = loans.filter(l => {
        const d = parseISO(l.loanDate);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      const invested = monthLoans.reduce((acc, l) => acc + l.amountLoaned, 0);
      const toReceive = monthLoans.reduce((acc, l) => acc + l.amountToReceive, 0);
      const profit = toReceive - invested;

      return {
        name: format(month, 'MMM', { locale: ptBR }),
        investido: invested,
        receber: toReceive,
        lucro: profit
      };
    });
  }, [loans]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-stone-100"
        >
          <div className="w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <DollarSign size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">LoanControl</h1>
          <p className="text-stone-500 mb-8">Gerencie seus empréstimos pessoais de forma simples e profissional.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8">
        {/* Header */}
        <header className="bg-white border-b border-stone-100 sticky top-0 z-30 px-4 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-md">
                <DollarSign size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-stone-900 hidden sm:block">LoanControl</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <p className="text-xs font-bold text-stone-900">{user.displayName}</p>
                <button onClick={handleLogout} className="text-[10px] text-stone-400 font-bold hover:text-stone-600 flex items-center gap-1">
                  <LogOut size={10} /> Sair
                </button>
              </div>
              <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full border-2 border-stone-100" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Summary Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Investido" 
              value={`R$ ${stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
              icon={TrendingDown} 
              color="bg-stone-900"
            />
            <StatCard 
              title="A Receber" 
              value={`R$ ${stats.totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
              icon={TrendingUp} 
              color="bg-stone-900"
            />
            <StatCard 
              title="Lucro Acumulado" 
              value={`R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              color="bg-stone-900"
              trend={`+${stats.avgInterest.toFixed(1)}%`}
            />
            <StatCard 
              title="Atrasados" 
              value={stats.overdueCount.toString()} 
              icon={AlertCircle} 
              color={stats.overdueCount > 0 ? "bg-rose-500" : "bg-stone-900"}
            />
          </section>

          {/* Charts Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <BarChart3 size={20} className="text-stone-400" />
                  Fluxo Mensal
                </h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f5f5f4' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="investido" name="Saída" fill="#1c1917" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="receber" name="Entrada" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-stone-400" />
                  Crescimento de Capital
                </h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#1c1917" strokeWidth={3} dot={{ r: 4, fill: '#1c1917' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Loans List */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-stone-100 w-fit">
                <button 
                  onClick={() => setActiveTab('ativos')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ativos' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  Ativos ({stats.activeLoans.length})
                </button>
                <button 
                  onClick={() => setActiveTab('finalizados')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'finalizados' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  Finalizados ({stats.finishedLoans.length})
                </button>
              </div>
              
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg active:scale-95"
              >
                <Plus size={20} />
                Novo Empréstimo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {(activeTab === 'ativos' ? stats.activeLoans : stats.finishedLoans).map(loan => (
                  <motion.div
                    key={loan.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <LoanCard 
                      loan={loan} 
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDeleteLoan}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {(activeTab === 'ativos' ? stats.activeLoans : stats.finishedLoans).length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter size={24} className="text-stone-300" />
                  </div>
                  <p className="text-stone-400 font-medium">Nenhum empréstimo encontrado nesta categoria.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Mobile Floating Action Button */}
        <div className="fixed bottom-6 right-6 sm:hidden z-40">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all"
          >
            <Plus size={32} />
          </button>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {isFormOpen && (
            <LoanForm 
              onSave={handleSaveLoan} 
              onCancel={() => setIsFormOpen(false)} 
            />
          )}
        </AnimatePresence>

        {/* Upcoming Alerts (Toast-like) */}
        <div className="fixed bottom-24 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-80 space-y-2 pointer-events-none z-50">
          {stats.activeLoans
            .filter(l => {
              const due = parseISO(l.dueDate);
              const diff = addDays(new Date(), 3);
              return isPast(due) || (due <= diff && !isPast(due));
            })
            .slice(0, 3)
            .map(loan => (
              <motion.div 
                key={loan.id}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 pointer-events-auto ${isPast(parseISO(loan.dueDate)) ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">
                    {isPast(parseISO(loan.dueDate)) ? 'Atrasado' : 'Vencendo em breve'}
                  </p>
                  <p className="text-sm font-bold">{loan.clientName}</p>
                  <p className="text-[10px] font-medium opacity-80">R$ {loan.amountToReceive.toLocaleString('pt-BR')}</p>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
  );
}

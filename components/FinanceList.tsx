
import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, ShoppingBag, Loader2, ArrowUpRight, ArrowDownRight, Users, Phone, Mail } from 'lucide-react';
import { Transaction, TransactionType, Customer } from '../types';
import { FarmService } from '../services/farmService';
import { TransactionFormModal } from './TransactionFormModal';
import { SaleFormModal } from './SaleFormModal';
import { useFarm } from '../contexts/FarmContext';

export const FinanceList: React.FC = () => {
  const { currencySymbol } = useFarm();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'transactions' | 'customers'>('transactions');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txns, custs] = await Promise.all([
        FarmService.getTransactions(),
        FarmService.getCustomers()
      ]);
      setTransactions(txns);
      setCustomers(custs);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.Income)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.Expense)
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => 
    filter === 'All' || t.type === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financials</h2>
          <p className="text-gray-500 text-sm">Track farm income, expenses, and customers.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsSaleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
          >
            <ShoppingBag size={16} />
            Record Sale
          </button>
          <button 
            onClick={() => setIsTxnModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-sm text-gray-500 font-medium">Net Profit</p>
               <h3 className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                 {currencySymbol}{netProfit.toLocaleString()}
               </h3>
             </div>
             <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
               <DollarSign size={20} />
             </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-sm text-gray-500 font-medium">Total Income</p>
               <h3 className="text-2xl font-bold text-green-600 mt-1">
                 +{currencySymbol}{totalIncome.toLocaleString()}
               </h3>
             </div>
             <div className="p-2 rounded-lg bg-green-50 text-green-600">
               <TrendingUp size={20} />
             </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
               <h3 className="text-2xl font-bold text-red-600 mt-1">
                 -{currencySymbol}{totalExpense.toLocaleString()}
               </h3>
             </div>
             <div className="p-2 rounded-lg bg-red-50 text-red-600">
               <TrendingDown size={20} />
             </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200 flex space-x-6">
          <button
            onClick={() => setView('transactions')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                view === 'transactions' ? 'border-farm-600 text-farm-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
              Transactions
          </button>
          <button
            onClick={() => setView('customers')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                view === 'customers' ? 'border-farm-600 text-farm-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
              <Users size={16}/> Customers
          </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        
        {view === 'transactions' && (
            <>
                <div className="border-b border-gray-100 flex p-2 bg-gray-50">
                {(['All', 'Income', 'Expense'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                    {f}
                    </button>
                ))}
                </div>

                {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p>Loading transactions...</p>
                </div>
                ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <DollarSign size={48} className="mb-2 opacity-20" />
                    <p>No transactions found.</p>
                </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                        <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">Category</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">Description</th>
                        <th className="px-6 py-4 font-semibold text-gray-900 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">{txn.date}</td>
                            <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                txn.type === TransactionType.Income 
                                ? 'bg-green-50 text-green-700 border-green-100' 
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                                {txn.type === TransactionType.Income ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                                {txn.category}
                            </span>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={txn.notes}>
                            {txn.notes || '-'}
                            </td>
                            <td className={`px-6 py-4 text-right font-medium ${
                            txn.type === TransactionType.Income ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {txn.type === TransactionType.Income ? '+' : '-'}{currencySymbol}{txn.amount.toFixed(2)}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </>
        )}

        {view === 'customers' && (
            <>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={32} />
                        <p>Loading customers...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Users size={48} className="mb-2 opacity-20" />
                        <p>No customers yet. Record a sale to add one.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Name</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Contact</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Last Purchase</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 text-right">Total Spent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {customers.map(cust => (
                                    <tr key={cust.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900">{cust.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs">
                                                {cust.phone && <div className="flex items-center gap-1"><Phone size={12}/> {cust.phone}</div>}
                                                {cust.email && <div className="flex items-center gap-1"><Mail size={12}/> {cust.email}</div>}
                                                {!cust.phone && !cust.email && <span className="italic text-gray-400">No contact info</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{cust.lastPurchaseDate ? cust.lastPurchaseDate.split('T')[0] : '-'}</td>
                                        <td className="px-6 py-4 text-right font-medium text-green-700">
                                            {currencySymbol}{cust.totalSpent.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
      </div>

      <TransactionFormModal 
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        onSuccess={fetchData}
      />

      <SaleFormModal 
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

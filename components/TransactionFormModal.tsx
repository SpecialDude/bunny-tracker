import React, { useState } from 'react';
import { X, DollarSign, Save } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { TransactionType } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Feed', 'Medication', 'Equipment', 'Maintenance', 'Utilities', 'Labor', 'Other'
];

export const TransactionFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAlert();
  const { currencySymbol } = useFarm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: TransactionType.Expense,
    category: 'Feed',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    setLoading(true);
    try {
      await FarmService.addTransaction({
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes
      });
      showToast("Transaction saved successfully", 'success');
      onSuccess();
      onClose();
      // Reset
      setFormData({
        type: TransactionType.Expense,
        category: 'Feed',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error(error);
      showToast("Failed to add transaction", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-farm-600" size={20} /> Record Transaction
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: TransactionType.Expense})}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                formData.type === TransactionType.Expense 
                  ? 'bg-white shadow text-red-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: TransactionType.Income})}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                formData.type === TransactionType.Income 
                  ? 'bg-white shadow text-green-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{currencySymbol}</span>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  className="w-full pl-6 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
             <textarea 
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none resize-none"
                placeholder="Description of transaction..."
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 mt-4 transition-colors ${
              formData.type === TransactionType.Expense ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, DollarSign, User, Search, Check } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { TransactionType, Transaction, Customer } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction; // If provided, modal is in edit mode
}

export const TransactionFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, transaction }) => {
  const isEditMode = !!transaction;
  const { showToast } = useAlert();
  const { currencySymbol, transactionCategories } = useFarm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: TransactionType.Expense,
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    customerId: null as string | null | undefined
  });

  // Customer selection state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerContact, setCustomerContact] = useState({ phone: '', email: '' });

  // Set default category when modal opens or categories load
  React.useEffect(() => {
     if (isOpen) {
         if (transaction) {
           // Edit mode: pre-fill with existing values
           setFormData({
              type: transaction.type,
              category: transaction.category || transactionCategories[0] || '',
              amount: transaction.amount?.toString() || '',
              date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
              notes: transaction.notes || '',
              customerId: transaction.customerId
           });
         } else {
           // Create mode: reset to defaults
           setFormData({
              type: TransactionType.Expense,
              category: transactionCategories[0] || '',
              amount: '',
              date: new Date().toISOString().split('T')[0],
              notes: '',
              customerId: null
           });
         }
         setSelectedCustomer(null);
         setCustomerSearch('');
         setIsNewCustomer(false);
         setCustomerContact({ phone: '', email: '' });
         
         // Load customers & pre-select if editing
         FarmService.getCustomers().then(custs => {
           setCustomers(custs);
           if (transaction?.customerId) {
             const linked = custs.find(c => c.id === transaction.customerId);
             if (linked) {
               setSelectedCustomer(linked);
               setCustomerSearch(linked.name);
             }
           }
         });
     }
  }, [isOpen, transactionCategories, transaction]);

  const filteredCustomers = React.useMemo(() => 
    customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  );

  const handleCustomerSelect = (cust: Customer) => {
    setSelectedCustomer(cust);
    setFormData(prev => ({ ...prev, customerId: cust.id }));
    setCustomerSearch(cust.name);
    setIsNewCustomer(false);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    setLoading(true);
    try {
      const payload: any = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes,
        customerId: formData.customerId
      };

      if (isEditMode) {
        // Update existing transaction
        await FarmService.updateTransaction(transaction.id!, payload);
        showToast("Transaction updated successfully", 'success');
      } else {
        // Create new transaction
        if (!formData.customerId && isNewCustomer && customerSearch) {
          payload.customer = {
              name: customerSearch,
              phone: customerContact.phone,
              email: customerContact.email
          };
        }
        await FarmService.addTransaction(payload);
        showToast("Transaction saved successfully", 'success');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || 'An unknown error occurred';
      showToast(`Failed to ${isEditMode ? 'update' : 'add'} transaction: ${msg}`, 'error');
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
            <DollarSign className="text-farm-600" size={20} /> {isEditMode ? 'Edit Transaction' : 'Record Transaction'}
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
              {transactionCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Customer Selection */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 relative">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" /> Link to Customer (Optional)
                </label>
                {selectedCustomer && (
                    <button 
                        type="button" 
                        onClick={() => {
                            setSelectedCustomer(null);
                            setFormData(prev => ({ ...prev, customerId: null }));
                            setCustomerSearch('');
                            setIsNewCustomer(false);
                        }}
                        className="text-[10px] text-farm-600 hover:text-farm-700 font-medium"
                    >
                        Change
                    </button>
                )}
            </div>

            {selectedCustomer ? (
                /* Selected Customer Card */
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center gap-3 animate-fadeIn">
                    <div className="bg-gray-50 p-1.5 rounded-full text-gray-500 border border-gray-100">
                        <User size={14} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-xs leading-tight">{selectedCustomer.name}</div>
                        {(selectedCustomer.phone || selectedCustomer.email) && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                                {selectedCustomer.phone} {selectedCustomer.phone && selectedCustomer.email && '•'} {selectedCustomer.email}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Search / New Customer Fields */
                <>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            value={customerSearch}
                            onChange={e => {
                            setCustomerSearch(e.target.value);
                            setShowDropdown(true);
                            if (!e.target.value) {
                                setSelectedCustomer(null);
                                setFormData(prev => ({ ...prev, customerId: undefined }));
                                setIsNewCustomer(false);
                            } else {
                                const currentId = formData.customerId;
                                const matched = customers.find(cust => cust.id === currentId);
                                if (matched && e.target.value !== matched.name) {
                                    setFormData(prev => ({ ...prev, customerId: undefined }));
                                    setSelectedCustomer(null);
                                    setIsNewCustomer(true);
                                } else if (!currentId) {
                                    setIsNewCustomer(true);
                                }
                            }
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-farm-500 outline-none"
                            placeholder="Search or enter new name..."
                        />
                        {showDropdown && filteredCustomers.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-20 max-h-40 overflow-y-auto">
                             {filteredCustomers.map((custItem: Customer) => {
                                const isSelected = (selectedCustomer as any)?.id === (custItem as any).id;
                                return (
                                    <div 
                                        key={custItem.id} 
                                        onClick={() => handleCustomerSelect(custItem)}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 flex justify-between items-center"
                                    >
                                    <div>
                                        <div className="font-bold text-gray-800">{custItem.name}</div>
                                        {(custItem.phone || custItem.email) && (
                                            <div className="text-[10px] text-gray-500">
                                                {custItem.phone}{custItem.phone && custItem.email && ' • '}{custItem.email}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && <Check size={14} className="text-farm-600" />}
                                    </div>
                                );
                            })}
                            </div>
                        )}
                    </div>

                    {isNewCustomer && (
                        <div className="grid grid-cols-2 gap-2 mt-2 animate-fadeIn">
                            <input 
                                type="text" 
                                value={customerContact.phone}
                                onChange={e => setCustomerContact({...customerContact, phone: e.target.value})}
                                className="px-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] outline-none"
                                placeholder="Phone (Optional)"
                            />
                            <input 
                                type="email" 
                                value={customerContact.email}
                                onChange={e => setCustomerContact({...customerContact, email: e.target.value})}
                                className="px-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] outline-none"
                                placeholder="Email (Optional)"
                            />
                        </div>
                    )}
                </>
            )}
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
            {loading ? 'Saving...' : isEditMode ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

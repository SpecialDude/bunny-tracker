
import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Search, Check, UserPlus, User, Loader2 } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Customer } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SaleFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAlert();
  const { currencySymbol } = useFarm();
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rabbitSearch, setRabbitSearch] = useState('');
  
  // Customer Input State
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Load Data
      FarmService.getSaleableRabbits().then(setRabbits);
      FarmService.getCustomers().then(setCustomers);
      
      // Reset State
      setSelectedIds(new Set());
      setRabbitSearch('');
      setCustomerSearch('');
      setSelectedCustomerId(null);
      setIsNewCustomer(false);
      setShowDropdown(false);
      
      setFormData({
        buyerName: '',
        buyerPhone: '',
        buyerEmail: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }, [isOpen]);

  // Filter Customers based on search
  useEffect(() => {
      if (customerSearch) {
          const lower = customerSearch.toLowerCase();
          setFilteredCustomers(customers.filter(c => c.name.toLowerCase().includes(lower)));
      } else {
          setFilteredCustomers(customers);
      }
  }, [customerSearch, customers]);

  const handleCustomerSelect = (cust: Customer) => {
      setSelectedCustomerId(cust.id || null);
      setFormData(prev => ({
          ...prev,
          buyerName: cust.name,
          buyerPhone: cust.phone || '',
          buyerEmail: cust.email || ''
      }));
      setCustomerSearch(cust.name);
      setIsNewCustomer(false);
      setShowDropdown(false);
  };

  const handleCustomerInput = (val: string) => {
      setCustomerSearch(val);
      setFormData(prev => ({ ...prev, buyerName: val }));
      setShowDropdown(true);
      
      if (!val) {
          setSelectedCustomerId(null);
          setIsNewCustomer(false);
          return;
      }

      const exactMatch = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
      if (exactMatch) {
          // If typed name matches exactly, auto-select? 
          // Better to let user click, but we can hint.
          // For now, assume new unless selected.
      }
      
      // If we are typing and it's not a selected ID, it's potentially new
      if (selectedCustomerId && val !== customers.find(c => c.id === selectedCustomerId)?.name) {
          setSelectedCustomerId(null);
      }
      
      // If no exact ID match, it is a new customer
      setIsNewCustomer(true);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const filteredRabbits = rabbits.filter(r => 
    r.tag.toLowerCase().includes(rabbitSearch.toLowerCase()) ||
    (r.breed && r.breed.toLowerCase().includes(rabbitSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      showToast("Please select at least one rabbit to sell.", 'error');
      return;
    }
    if (!formData.amount || !formData.buyerName) {
        showToast("Buyer name and Amount are required.", 'error');
        return;
    }

    setLoading(true);
    try {
      const salePayload: any = {
        rabbitIds: Array.from(selectedIds),
        buyerName: formData.buyerName,
        buyerContact: formData.buyerPhone,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes
      };

      // Link Customer
      if (selectedCustomerId) {
          salePayload.customerId = selectedCustomerId;
      } else if (isNewCustomer) {
          // Pass full object for creation
          salePayload.customer = {
              name: formData.buyerName,
              phone: formData.buyerPhone,
              email: formData.buyerEmail
          };
      }

      await FarmService.recordSale(salePayload);
      showToast("Sale recorded successfully", 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to record sale", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" size={20} /> Sell Rabbits
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Rabbit Selector */}
          <div className="flex-1 border-r border-gray-100 flex flex-col bg-gray-50 min-w-[300px]">
            <div className="p-3 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search tag or breed..."
                  value={rabbitSearch}
                  onChange={(e) => setRabbitSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected: <span className="font-bold text-blue-600">{selectedIds.size}</span> rabbits
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {filteredRabbits.map(rabbit => (
                 <div 
                   key={rabbit.id}
                   onClick={() => toggleSelection(rabbit.id!)}
                   className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                     selectedIds.has(rabbit.id!) 
                       ? 'bg-blue-50 border-blue-200 shadow-sm' 
                       : 'bg-white border-gray-200 hover:border-blue-300'
                   }`}
                 >
                   <div>
                     <div className="font-bold text-gray-800 text-sm">{rabbit.tag}</div>
                     <div className="text-xs text-gray-500">{rabbit.breed} • {rabbit.sex}</div>
                   </div>
                   {selectedIds.has(rabbit.id!) && (
                     <div className="bg-blue-600 text-white p-1 rounded-full">
                       <Check size={12} />
                     </div>
                   )}
                 </div>
               ))}
               {filteredRabbits.length === 0 && (
                 <p className="text-center text-gray-400 text-sm mt-10">No eligible rabbits found.</p>
               )}
            </div>
          </div>

          {/* Right: Sale Details & Customer */}
          <div className="w-full md:w-96 p-6 flex flex-col bg-white overflow-y-auto">
            <form id="saleForm" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Customer Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 relative">
                  <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={16}/> Customer
                  </label>
                  
                  {/* Name Input with Autocomplete */}
                  <div className="relative">
                      <input 
                        required
                        type="text" 
                        value={customerSearch}
                        onChange={e => handleCustomerInput(e.target.value)}
                        onFocus={() => setShowDropdown(true)}
                        // Delay blur to allow clicking dropdown items
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} 
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Search or enter new name..."
                      />
                      {showDropdown && filteredCustomers.length > 0 && (
                          <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-20 max-h-40 overflow-y-auto">
                              {filteredCustomers.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => handleCustomerSelect(c)}
                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                  >
                                      <div className="font-bold text-gray-800">{c.name}</div>
                                      {(c.phone || c.email) && <div className="text-xs text-gray-500">{c.phone || c.email}</div>}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* New Customer / Details Fields */}
                  {/* Show contact fields if we selected a customer (read only) OR if it's a new customer */}
                  {(selectedCustomerId || isNewCustomer) && (
                      <div className="grid grid-cols-1 gap-2 animate-fadeIn">
                          <input 
                            type="text" 
                            value={formData.buyerPhone}
                            onChange={e => setFormData({...formData, buyerPhone: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm"
                            placeholder="Phone Number"
                            disabled={!!selectedCustomerId} // Read-only if existing
                          />
                          <input 
                            type="email" 
                            value={formData.buyerEmail}
                            onChange={e => setFormData({...formData, buyerEmail: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm"
                            placeholder="Email (Optional)"
                            disabled={!!selectedCustomerId}
                          />
                          {isNewCustomer && customerSearch && (
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                  <UserPlus size={12}/> New customer will be saved.
                              </p>
                          )}
                      </div>
                  )}
              </div>

              {/* Transaction Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                <input 
                  required
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{currencySymbol}</span>
                  <input 
                    required
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full pl-6 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-green-700"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Sale details..."
                />
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-white shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="saleForm"
            disabled={loading || selectedIds.size === 0}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShoppingCart size={18} /> Confirm Sale</>}
          </button>
        </div>
      </div>
    </div>
  );
};

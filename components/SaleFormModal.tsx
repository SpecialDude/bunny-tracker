import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Search, Check } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SaleFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    buyerName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      FarmService.getSaleableRabbits().then(setRabbits);
      setSelectedIds(new Set());
      setFormData({
        buyerName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }, [isOpen]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const filteredRabbits = rabbits.filter(r => 
    r.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.breed && r.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      showToast("Please select at least one rabbit to sell.", 'info');
      return;
    }
    if (!formData.amount || !formData.buyerName) return;

    setLoading(true);
    try {
      await FarmService.recordSale({
        rabbitIds: Array.from(selectedIds),
        buyerName: formData.buyerName,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes
      });
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-blue-600" size={20} /> Sell Rabbits
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Rabbit Selector */}
          <div className="flex-1 border-r border-gray-100 flex flex-col bg-gray-50">
            <div className="p-3 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search tag or breed..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Right: Sale Details */}
          <div className="w-full md:w-80 p-6 flex flex-col bg-white overflow-y-auto">
            <form id="saleForm" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  required
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.buyerName}
                  onChange={e => setFormData({...formData, buyerName: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe / Market"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Sale Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
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
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Details about sale..."
                />
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-white">
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
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Confirm Sale (${selectedIds.size} Rabbits)`}
          </button>
        </div>
      </div>
    </div>
  );
};
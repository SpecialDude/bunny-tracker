import React, { useState, useEffect } from 'react';
import { X, Save, Warehouse, Box } from 'lucide-react';
import { Hutch } from '../types';
import { FarmService } from '../services/farmService';

interface HutchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Hutch;
}

const COMMON_ACCESSORIES = [
  'Water Basin', 'Nipple Drinker', 'J-Feeder', 'Ceramic Bowl', 
  'Resting Mat', 'Nest Box', 'Hay Rack', 'Salt Lick Holder'
];

export const HutchFormModal: React.FC<HutchFormModalProps> = ({ 
  isOpen, onClose, onSuccess, initialData 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Hutch>>({
    label: '',
    number: 1,
    capacity: 1,
    accessories: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          label: '',
          number: 1,
          capacity: 1,
          accessories: [],
        });
      }
    }
  }, [initialData, isOpen]);

  const toggleAccessory = (acc: string) => {
    setFormData(prev => {
      const current = prev.accessories || [];
      if (current.includes(acc)) {
        return { ...prev, accessories: current.filter(a => a !== acc) };
      } else {
        return { ...prev, accessories: [...current, acc] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        await FarmService.updateHutch(initialData.id, formData);
      } else {
        await FarmService.addHutch(formData as any);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save hutch:", error);
      alert("Failed to save. Check console.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Warehouse size={20} className="text-farm-600" />
            {initialData ? 'Edit Hutch' : 'Add Hutch'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form id="hutchForm" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Label & Number */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Label / Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                  placeholder="e.g. Nursery Block A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={formData.number}
                  onChange={e => setFormData({...formData, number: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>
            </div>

            {/* Capacity */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Max Rabbits)</label>
               <div className="flex items-center gap-4">
                 <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.capacity}
                    onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                  <span className="text-xs text-gray-500">
                    Standard Size: 1 Doe + Kits or 1 Buck
                  </span>
               </div>
            </div>

            {/* Accessories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Box size={16} /> Accessories Installed
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_ACCESSORIES.map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => toggleAccessory(acc)}
                    className={`text-xs px-3 py-2 rounded-md border text-left transition-all flex items-center gap-2 ${
                      formData.accessories?.includes(acc) 
                        ? 'bg-farm-50 border-farm-200 text-farm-700 font-medium' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                       formData.accessories?.includes(acc) ? 'bg-farm-500 border-farm-500' : 'border-gray-300'
                    }`}>
                      {formData.accessories?.includes(acc) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    {acc}
                  </button>
                ))}
              </div>
            </div>

          </form>
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
            form="hutchForm"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : <><Save size={18} /> Save Hutch</>}
          </button>
        </div>
      </div>
    </div>
  );
};
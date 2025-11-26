import React, { useState } from 'react';
import { X, Skull, Utensils } from 'lucide-react';
import { Rabbit, RabbitStatus } from '../types';
import { FarmService } from '../services/farmService';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rabbit: Rabbit;
}

export const MortalityModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, rabbit }) => {
  const { showToast } = useAlert();
  const { currencySymbol } = useFarm();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<RabbitStatus.Dead | RabbitStatus.Slaughtered>(RabbitStatus.Dead);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Slaughter options
  const [soldMeat, setSoldMeat] = useState(false);
  const [meatPrice, setMeatPrice] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const saleAmount = (type === RabbitStatus.Slaughtered && soldMeat) ? parseFloat(meatPrice) : 0;
      
      await FarmService.recordMortality(
        rabbit.id!,
        type,
        date,
        notes,
        saleAmount
      );
      
      showToast(`Rabbit marked as ${type}`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to record event", 'error');
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
            <Skull className="text-gray-600" size={20} /> Record Mortality
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
           Marking <strong>{rabbit.tag}</strong> as deceased/slaughtered will remove it from its hutch.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
             <button
                type="button"
                onClick={() => setType(RabbitStatus.Dead)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  type === RabbitStatus.Dead ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
             >
               <Skull size={16} /> Natural Death
             </button>
             <button
                type="button"
                onClick={() => setType(RabbitStatus.Slaughtered)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  type === RabbitStatus.Slaughtered ? 'bg-white shadow text-red-600' : 'text-gray-500'
                }`}
             >
               <Utensils size={16} /> Slaughtered
             </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              required
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Cause / Notes</label>
             <textarea 
                required
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none resize-none"
                placeholder={type === RabbitStatus.Dead ? "e.g. Disease, Old Age..." : "e.g. Processed for home consumption..."}
             />
          </div>

          {/* Slaughter Sales Option */}
          {type === RabbitStatus.Slaughtered && (
             <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={soldMeat}
                    onChange={e => setSoldMeat(e.target.checked)}
                    className="rounded text-farm-600 focus:ring-farm-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Meat was sold</span>
                </label>

                {soldMeat && (
                   <div>
                     <label className="block text-xs font-medium text-gray-500 mb-1">Sale Amount</label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{currencySymbol}</span>
                       <input 
                         type="number" 
                         min="0"
                         step="0.01"
                         value={meatPrice}
                         onChange={e => setMeatPrice(e.target.value)}
                         className="w-full pl-6 pr-3 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-farm-500"
                         placeholder="0.00"
                       />
                     </div>
                   </div>
                )}
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : `Confirm ${type}`}
          </button>
        </form>
      </div>
    </div>
  );
};
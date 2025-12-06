
import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Hutch } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rabbit: Rabbit;
}

const PURPOSES = ['Housing', 'Mating', 'Quarantine', 'Weaning', 'Recovery'];

export const MoveRabbitModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, rabbit }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [hutches, setHutches] = useState<Hutch[]>([]);
  const [targetHutchId, setTargetHutchId] = useState('');
  const [purpose, setPurpose] = useState('Housing');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      FarmService.getHutches().then(setHutches);
      setTargetHutchId('');
      setPurpose('Housing');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHutchId) {
        showToast("Please select a target hutch", 'error');
        return;
    }

    setLoading(true);
    try {
      await FarmService.moveRabbit(rabbit.id!, targetHutchId, purpose, notes);
      showToast("Rabbit moved successfully", 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to move rabbit", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const targetHutch = hutches.find(h => h.hutchId === targetHutchId);
  const isFull = targetHutch ? targetHutch.currentOccupancy >= targetHutch.capacity : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="text-farm-600" size={20} /> Move Rabbit
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
           Moving <strong>{rabbit.tag}</strong> from 
           <span className="font-semibold text-gray-900 mx-1">{rabbit.currentHutchId || 'Unassigned'}</span>
           to...
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Hutch</label>
            <select 
              required
              value={targetHutchId}
              onChange={e => setTargetHutchId(e.target.value)}
              className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 outline-none ${
                 isFull ? 'border-red-300 ring-red-100' : 'border-gray-300 ring-farm-500'
              }`}
            >
              <option value="">Select Hutch...</option>
              {hutches.map(h => (
                <option key={h.id} value={h.hutchId} disabled={h.hutchId === rabbit.currentHutchId}>
                  {h.label} ({h.currentOccupancy}/{h.capacity})
                </option>
              ))}
            </select>
            {isFull && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12}/> Warning: This hutch is over capacity.
                </p>
            )}
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Move</label>
             <div className="flex flex-wrap gap-2">
               {PURPOSES.map(p => (
                   <button
                     key={p}
                     type="button"
                     onClick={() => setPurpose(p)}
                     className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                        purpose === p 
                          ? 'bg-farm-600 text-white border-farm-600' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                     }`}
                   >
                     {p}
                   </button>
               ))}
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
             <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none resize-none text-sm"
                placeholder="Reason for movement..."
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50 mt-2"
          >
            {loading ? 'Moving...' : 'Confirm Move'}
          </button>
        </form>
      </div>
    </div>
  );
};

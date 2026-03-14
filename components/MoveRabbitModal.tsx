
import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle, ArrowUpCircle, Baby } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Hutch, Sex } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rabbit: Rabbit;
}

const PURPOSES = ['Housing', 'Mating', 'Quarantine', 'Weaning', 'Recovery'];

export const MoveRabbitModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, rabbit }) => {
  const { showToast } = useAlert();
  const { defaultWeaningDays } = useFarm();
  const [loading, setLoading] = useState(false);
  const [hutches, setHutches] = useState<Hutch[]>([]);
  const [targetHutchId, setTargetHutchId] = useState('');
  const [purpose, setPurpose] = useState('Housing');
  const [notes, setNotes] = useState('');
  
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [moveKits, setMoveKits] = useState(false);
  const [dependentKitsCount, setDependentKitsCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      FarmService.getHutches().then(setHutches);
      setTargetHutchId('');
      setPurpose('Housing');
      setNotes('');
      setOverrideCapacity(false);
      setMoveKits(false);
      
      // Check for dependent kits if female
      if (rabbit.sex === Sex.Female && rabbit.currentHutchId) {
          FarmService.getRabbitsByHutchId(rabbit.currentHutchId).then(allInHutch => {
              const now = new Date();
              const cutoffDate = new Date();
              cutoffDate.setDate(now.getDate() - defaultWeaningDays);
              
              const kits = allInHutch.filter(r => 
                  r.parentage?.doeId === rabbit.tag && 
                  r.dateOfBirth && 
                  new Date(r.dateOfBirth) > cutoffDate &&
                  r.status === 'Alive'
              );
              setDependentKitsCount(kits.length);
              setMoveKits(kits.length > 0); // Default to true if she has kits
          });
      } else {
          setDependentKitsCount(0);
      }
    }
  }, [isOpen, rabbit, defaultWeaningDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHutchId) {
        showToast("Please select a target hutch", 'error');
        return;
    }

    setLoading(true);
    try {
      if (moveKits && dependentKitsCount > 0) {
          await FarmService.moveRabbitWithKits(rabbit.id!, targetHutchId, purpose, defaultWeaningDays, notes, overrideCapacity);
      } else {
          await FarmService.moveRabbit(rabbit.id!, targetHutchId, purpose, notes, overrideCapacity);
      }
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
  const requiredCapacity = 1 + (moveKits ? dependentKitsCount : 0);
  const isFull = targetHutch ? (targetHutch.currentOccupancy + requiredCapacity) > targetHutch.capacity : false;

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
            {isFull && targetHutch && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2 text-red-700 text-xs mb-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>
                        <strong>Hutch Full:</strong> Capacity is {targetHutch.capacity}. 
                        Moving {requiredCapacity} will raise occupancy to {targetHutch.currentOccupancy + requiredCapacity}.
                        </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                        type="checkbox"
                        checked={overrideCapacity}
                        onChange={e => setOverrideCapacity(e.target.checked)}
                        className="text-red-600 focus:ring-red-500 rounded"
                        />
                        <span className="text-xs font-medium text-red-700 group-hover:text-red-800 flex items-center gap-1">
                        <ArrowUpCircle size={12} />
                        Increase capacity by {Math.max(1, (targetHutch.currentOccupancy + requiredCapacity) - targetHutch.capacity)} (to {Math.max(targetHutch.capacity + 1, targetHutch.currentOccupancy + requiredCapacity)})
                        </span>
                    </label>
                </div>
            )}
          </div>
          
          {dependentKitsCount > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2 text-blue-800 text-sm mb-2">
                      <Baby size={18} className="shrink-0 mt-0.5 text-blue-600" />
                      <div>
                          <strong>Dependent Kits Found</strong>
                          <p className="text-xs text-blue-700 mt-1">
                              This mother has {dependentKitsCount} unweaned kits (under {defaultWeaningDays} days old) in her current hutch.
                          </p>
                      </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group ml-1 mt-2">
                      <input 
                      type="checkbox"
                      checked={moveKits}
                      onChange={e => setMoveKits(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded w-4 h-4"
                      />
                      <span className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                          Move all {dependentKitsCount} kits along with mother
                      </span>
                  </label>
              </div>
          )}

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

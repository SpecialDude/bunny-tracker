import React, { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { Rabbit } from '../types';
import { FarmService } from '../services/farmService';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rabbit: Rabbit;
}

export const WeightModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, rabbit }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const calculateAge = (dob: string, recordDate: string) => {
     if (!dob) return 'Unknown';
     const start = new Date(dob).getTime();
     const end = new Date(recordDate).getTime();
     const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
     const weeks = Math.floor(days / 7);
     return `${weeks} weeks`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;

    setLoading(true);
    try {
      const ageStr = calculateAge(rabbit.dateOfBirth, date);
      await FarmService.addWeightRecord(
          rabbit.tag, 
          parseFloat(weight), 
          date, 
          ageStr, 
          notes
      );
      showToast("Weight recorded successfully", 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to record weight", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Scale className="text-farm-600" size={20} /> Record Weight
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Measured</label>
            <input 
              required
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
             <input 
               required
               type="number" 
               min="0" 
               step="0.01"
               value={weight}
               onChange={e => setWeight(e.target.value)}
               placeholder="0.00"
               className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-lg font-bold text-farm-700"
               autoFocus
             />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
             <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none resize-none text-sm"
                placeholder="Comments on condition..."
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50 mt-2"
          >
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </form>
      </div>
    </div>
  );
};
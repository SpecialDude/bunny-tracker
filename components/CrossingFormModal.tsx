import React, { useState, useEffect } from 'react';
import { X, Save, Heart } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Sex } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CrossingFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [does, setDoes] = useState<Rabbit[]>([]);
  const [bucks, setBucks] = useState<Rabbit[]>([]);

  const [formData, setFormData] = useState({
    doeId: '',
    sireId: '',
    dateOfCrossing: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      FarmService.getRabbitsBySex(Sex.Female).then(setDoes);
      FarmService.getRabbitsBySex(Sex.Male).then(setBucks);
      setFormData(prev => ({ ...prev, doeId: '', sireId: '' }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doeId || !formData.sireId) return;

    setLoading(true);
    try {
      const doe = does.find(r => r.tag === formData.doeId);
      const sire = bucks.find(r => r.tag === formData.sireId);

      await FarmService.addCrossing({
        ...formData,
        doeName: doe?.name,
        sireName: sire?.name
      });
      showToast("Mating recorded successfully", 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to record mating", 'error');
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
            <Heart className="text-pink-500 fill-current" size={20} /> Record New Mating
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Doe (Female)</label>
            <select 
              required
              value={formData.doeId}
              onChange={e => setFormData({...formData, doeId: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            >
              <option value="">Choose Doe...</option>
              {does.map(d => (
                <option key={d.id} value={d.tag}>{d.tag} {d.name ? `(${d.name})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Sire (Male)</label>
            <select 
              required
              value={formData.sireId}
              onChange={e => setFormData({...formData, sireId: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            >
              <option value="">Choose Sire...</option>
              {bucks.map(b => (
                <option key={b.id} value={b.tag}>{b.tag} {b.name ? `(${b.name})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Mating</label>
            <input 
              required
              type="date" 
              value={formData.dateOfCrossing}
              onChange={e => setFormData({...formData, dateOfCrossing: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50 mt-4"
          >
            {loading ? 'Recording...' : 'Save Record'}
          </button>
        </form>
      </div>
    </div>
  );
};
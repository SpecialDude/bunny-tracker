import React, { useState, useEffect } from 'react';
import { X, Stethoscope, Plus, Calendar, Pill, AlertTriangle, Activity } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, MedicalRecord, MedicalType } from '../types';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rabbit: Rabbit;
}

export const MedicalModal: React.FC<Props> = ({ isOpen, onClose, rabbit }) => {
  const { showToast } = useAlert();
  const { currencySymbol } = useFarm();
  const [activeView, setActiveView] = useState<'history' | 'add'>('history');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    type: MedicalType.Vaccination,
    medicationName: '',
    dosage: '',
    date: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    cost: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setActiveView('history');
      setFormData({
        type: MedicalType.Vaccination,
        medicationName: '',
        dosage: '',
        date: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        cost: '',
        notes: ''
      });
    }
  }, [isOpen, rabbit]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await FarmService.getMedicalRecords(rabbit.tag); // Using Tag as ID reference
      setRecords(data);
    } catch (e) {
      console.error(e);
      showToast("Failed to load medical history", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await FarmService.addMedicalRecord({
        rabbitId: rabbit.tag, // Use Tag for readability
        type: formData.type,
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        date: formData.date,
        nextDueDate: formData.nextDueDate || undefined,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        notes: formData.notes
      });
      showToast("Medical record added successfully", 'success');
      fetchHistory();
      setActiveView('history');
    } catch (error) {
      console.error(error);
      showToast("Failed to save record", 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: MedicalType) => {
    switch (type) {
        case MedicalType.Vaccination: return 'text-blue-600 bg-blue-50 border-blue-100';
        case MedicalType.Injury: return 'text-red-600 bg-red-50 border-red-100';
        case MedicalType.Checkup: return 'text-green-600 bg-green-50 border-green-100';
        default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="text-pink-600" size={20} /> Medical Records
            </h3>
            <p className="text-sm text-gray-500">Rabbit: <strong>{rabbit.tag}</strong> ({rabbit.name})</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-lg mb-6 w-full max-w-sm mx-auto">
             <button
                onClick={() => setActiveView('history')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeView === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
               History
             </button>
             <button
                onClick={() => setActiveView('add')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeView === 'add' ? 'bg-white shadow text-pink-600' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
               <Plus size={16} /> Add Record
             </button>
          </div>

          {activeView === 'history' ? (
            <div className="space-y-4">
                {records.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Activity size={48} className="mx-auto mb-2 opacity-20" />
                        <p>No medical records found for this rabbit.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                        {records.map((rec) => (
                            <div key={rec.id} className="ml-6 relative">
                                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></span>
                                <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTypeColor(rec.type)}`}>
                                                {rec.type}
                                            </span>
                                            <span className="text-sm font-bold text-gray-800">{rec.medicationName}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar size={12} /> {rec.date}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 mb-2">{rec.notes || "No notes."}</p>
                                    
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                        {rec.dosage && (
                                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                                <Pill size={12} /> Dosage: {rec.dosage}
                                            </span>
                                        )}
                                        {rec.cost > 0 && (
                                            <span className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-yellow-700">
                                                Cost: {currencySymbol}{rec.cost}
                                            </span>
                                        )}
                                        {rec.nextDueDate && (
                                            <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium">
                                                Next Due: {rec.nextDueDate}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    <p>Recording costs here will automatically add an Expense transaction to your finances.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
                        <select 
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value as MedicalType})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                        >
                            {Object.values(MedicalType).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Administered</label>
                        <input 
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medication / Treatment Name</label>
                    <input 
                        type="text"
                        required
                        placeholder="e.g. Ivermectin, Ivomec, Wound Spray"
                        value={formData.medicationName}
                        onChange={e => setFormData({...formData, medicationName: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dosage (Optional)</label>
                        <input 
                            type="text"
                            placeholder="e.g. 0.2ml sc"
                            value={formData.dosage}
                            onChange={e => setFormData({...formData, dosage: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost ({currencySymbol})</label>
                        <input 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.cost}
                            onChange={e => setFormData({...formData, cost: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date (Optional)</label>
                    <input 
                        type="date"
                        value={formData.nextDueDate}
                        onChange={e => setFormData({...formData, nextDueDate: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Useful for recurring vaccinations.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea 
                        rows={3}
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none resize-none text-sm"
                        placeholder="Reaction details, veterinarian name, reason for treatment..."
                    />
                </div>

                <div className="pt-2">
                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Record'}
                    </button>
                </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { X, Save, Wand2, DollarSign, Baby, ShoppingBag } from 'lucide-react';
import { Rabbit, RabbitStatus, Sex, Hutch, Crossing, CrossingStatus } from '../types';
import { FarmService } from '../services/farmService';

interface RabbitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Rabbit;
}

export const RabbitFormModal: React.FC<RabbitFormModalProps> = ({ 
  isOpen, onClose, onSuccess, initialData 
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Born' | 'Purchased'>('Born');
  
  // Dropdown Data
  const [hutches, setHutches] = useState<Hutch[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [does, setDoes] = useState<Rabbit[]>([]); // Keep does for breed lookup

  // Form State
  const [formData, setFormData] = useState<Partial<Rabbit>>({
    tag: '',
    name: '',
    breed: 'Rex',
    sex: Sex.Female,
    status: RabbitStatus.Alive,
    dateOfBirth: new Date().toISOString().split('T')[0],
    dateOfAcquisition: new Date().toISOString().split('T')[0],
    currentHutchId: '',
    notes: '',
    purchaseCost: 0,
    parentage: { sireId: '', doeId: '' }
  });

  // Bulk Entry State
  const [kitCount, setKitCount] = useState(1);
  const [selectedLitterId, setSelectedLitterId] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load available hutches
      FarmService.getHutches().then(setHutches);
      
      // Load potential parents/litters (Delivered or Pregnant)
      FarmService.getCrossings().then(data => {
         // Filter for relevant crossings
         setCrossings(data.filter(c => c.status === CrossingStatus.Delivered || c.status === CrossingStatus.Pregnant));
      });
      
      FarmService.getRabbitsBySex(Sex.Female).then(setDoes);

      if (initialData) {
        setFormData(initialData);
        setActiveTab(initialData.source || 'Born');
        setKitCount(1);
      } else {
        // Reset
        setFormData({
          tag: '',
          name: '',
          breed: 'Rex',
          sex: Sex.Female,
          status: RabbitStatus.Alive,
          dateOfBirth: new Date().toISOString().split('T')[0],
          dateOfAcquisition: new Date().toISOString().split('T')[0],
          currentHutchId: '',
          notes: '',
          purchaseCost: 0,
          parentage: { sireId: '', doeId: '' }
        });
        setKitCount(1);
        setSelectedLitterId('');
        setActiveTab('Born');
      }
    }
  }, [initialData, isOpen]);

  // Handle Mating Record Selection
  const handleLitterChange = (crossingId: string) => {
    setSelectedLitterId(crossingId);
    if (!crossingId) return;

    const crossing = crossings.find(c => c.id === crossingId);
    if (crossing) {
       // Look up mother to find breed (inherited)
       const mother = does.find(d => d.tag === crossing.doeId);
       
       setFormData(prev => ({
         ...prev,
         parentage: { 
             doeId: crossing.doeId, 
             sireId: crossing.sireId 
         },
         breed: mother ? mother.breed : prev.breed,
         dateOfBirth: crossing.actualDeliveryDate || crossing.expectedDeliveryDate || prev.dateOfBirth
       }));
    }
  };

  const generateTag = async () => {
    if (!formData.breed) return;
    const tag = await FarmService.generateNextTag(formData.breed);
    setFormData(prev => ({ ...prev, tag }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isPurchase = activeTab === 'Purchased';
      
      const payload = {
        ...formData,
        source: activeTab,
        // If born, acquisition date is DOB
        dateOfAcquisition: isPurchase ? formData.dateOfAcquisition : formData.dateOfBirth,
      };

      if (initialData?.id) {
        await FarmService.updateRabbit(initialData.id, payload);
      } else {
        await FarmService.addRabbit(payload as any, isPurchase, kitCount);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save rabbit:", error);
      alert("Failed to save. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Edit Rabbit' : 'Add Rabbit'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {/* Source Toggle */}
          {!initialData && (
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('Born')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'Born' ? 'bg-white shadow text-farm-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                   <Baby size={16} /> Born on Farm
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Purchased')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'Purchased' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                   <ShoppingBag size={16} /> Purchased
                </div>
              </button>
            </div>
          )}

          <form id="rabbitForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Identity Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag ID</label>
                <div className="flex gap-2">
                  <input 
                    required
                    type="text" 
                    value={formData.tag}
                    onChange={e => setFormData({...formData, tag: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                    placeholder="e.g. SN-REX-01"
                  />
                  <button 
                     type="button"
                     onClick={generateTag}
                     className="p-2 bg-gray-100 rounded-lg text-farm-600 hover:bg-farm-50"
                     title="Auto-generate"
                  >
                    <Wand2 size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                  placeholder="Nickname"
                />
              </div>
            </div>

            {/* Bulk Entry (Only for new births) */}
            {!initialData && activeTab === 'Born' && (
               <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                 <label className="block text-sm font-medium text-blue-800 mb-1">Number of Kits</label>
                 <div className="flex items-center gap-3">
                   <input 
                      type="number"
                      min="1"
                      max="12"
                      value={kitCount}
                      onChange={e => setKitCount(parseInt(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-white border border-blue-200 rounded text-sm focus:outline-none"
                   />
                   <span className="text-xs text-blue-600">
                     {kitCount > 1 ? `Will create ${kitCount} records (e.g., -1, -2)` : 'Single record'}
                   </span>
                 </div>
               </div>
            )}

            {/* Parentage Section (Changes based on Source) */}
            {activeTab === 'Born' ? (
              <div className="space-y-3">
                 <label className="block text-sm font-medium text-gray-700">Litter Source (Mating Record)</label>
                 <select 
                    value={selectedLitterId}
                    onChange={e => handleLitterChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                 >
                    <option value="">-- Select Mating Record --</option>
                    {crossings.map(c => (
                      <option key={c.id} value={c.id}>
                         {c.doeId} x {c.sireId} ({c.actualDeliveryDate || c.expectedDeliveryDate})
                      </option>
                    ))}
                 </select>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mother (Doe)</label>
                      <input type="text" disabled value={formData.parentage?.doeId} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Father (Sire)</label>
                      <input type="text" disabled value={formData.parentage?.sireId} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500" />
                    </div>
                 </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                 <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <DollarSign size={16} /> Purchase Details
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Cost Per Rabbit</label>
                       <input 
                         type="number" 
                         min="0"
                         value={formData.purchaseCost}
                         onChange={e => setFormData({...formData, purchaseCost: parseFloat(e.target.value)})}
                         className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Acquisition Date</label>
                       <input 
                         type="date"
                         value={formData.dateOfAcquisition}
                         onChange={e => setFormData({...formData, dateOfAcquisition: e.target.value})}
                         className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                       />
                    </div>
                 </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                <select 
                  value={formData.breed}
                  onChange={e => setFormData({...formData, breed: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  <option value="Rex">Rex</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="California">California</option>
                  <option value="Dutch">Dutch</option>
                  <option value="Chinchilla">Chinchilla</option>
                  <option value="Local">Local / Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, sex: Sex.Male})}
                    className={`flex-1 py-2 text-sm border rounded-lg transition-colors ${
                       formData.sex === Sex.Male ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-300'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, sex: Sex.Female})}
                    className={`flex-1 py-2 text-sm border rounded-lg transition-colors ${
                       formData.sex === Sex.Female ? 'bg-pink-50 border-pink-200 text-pink-700 font-medium' : 'bg-white border-gray-300'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input 
                  type="date" 
                  value={formData.dateOfBirth}
                  onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Hutch</label>
                <select 
                  value={formData.currentHutchId || ''}
                  onChange={e => setFormData({...formData, currentHutchId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  {hutches.map(h => (
                    <option key={h.hutchId} value={h.hutchId}>
                      {h.label} ({h.currentOccupancy}/{h.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
               <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
               >
                  {Object.values(RabbitStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
               </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea 
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none resize-none"
              />
            </div>

          </form>
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
            form="rabbitForm"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : <><Save size={18} /> Save Rabbit</>}
          </button>
        </div>
      </div>
    </div>
  );
};
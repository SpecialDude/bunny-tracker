import React, { useState, useEffect } from 'react';
import { X, Save, Wand2, DollarSign, Baby, ShoppingBag } from 'lucide-react';
import { Rabbit, RabbitStatus, Sex } from '../types';
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
  const [does, setDoes] = useState<Rabbit[]>([]);
  const [bucks, setBucks] = useState<Rabbit[]>([]);

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

  useEffect(() => {
    if (isOpen) {
      // Load potential parents
      FarmService.getRabbitsBySex(Sex.Female).then(setDoes);
      FarmService.getRabbitsBySex(Sex.Male).then(setBucks);

      if (initialData) {
        setFormData(initialData);
        setActiveTab(initialData.source || 'Born');
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
        setActiveTab('Born');
      }
    }
  }, [initialData, isOpen]);

  // Handle Mother Selection to auto-fill breed/father if possible
  const handleDoeChange = (doeId: string) => {
    const mother = does.find(d => d.tag === doeId || d.rabbitId === doeId);
    setFormData(prev => ({
      ...prev,
      parentage: { ...prev.parentage, doeId },
      breed: mother ? mother.breed : prev.breed, // Inherit breed from mother by default
      currentHutchId: mother ? mother.currentHutchId : prev.currentHutchId // Put kits in same hutch
    }));
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
                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'Born' ? 'bg-white shadow text-farm-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Baby size={16} />
                Born on Farm
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Purchased')}
                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'Purchased' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ShoppingBag size={16} />
                Purchased
              </button>
            </div>
          )}

          <form id="rabbitForm" onSubmit={handleSubmit} className="space-y-4">
            
            {/* --- BORN ON FARM SECTION: PARENTAGE --- */}
            {activeTab === 'Born' && (
              <div className="bg-farm-50 p-4 rounded-lg border border-farm-100 space-y-4">
                 <h4 className="text-sm font-bold text-farm-800 flex items-center gap-2">
                   <Baby size={16} /> New Litter Details
                 </h4>
                 
                 <div className="grid grid-cols-2 gap-4">
                    {/* Mother */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Mother (Doe)</label>
                      <select 
                        value={formData.parentage?.doeId}
                        onChange={(e) => handleDoeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-farm-500"
                      >
                        <option value="">Select Mother...</option>
                        {does.map(d => (
                          <option key={d.id} value={d.tag}>{d.tag} - {d.name || 'No Name'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Father */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Father (Sire)</label>
                      <select 
                        value={formData.parentage?.sireId}
                        onChange={(e) => setFormData(prev => ({...prev, parentage: {...prev.parentage, sireId: e.target.value}}))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-farm-500"
                      >
                        <option value="">Select Father...</option>
                        {bucks.map(b => (
                          <option key={b.id} value={b.tag}>{b.tag} - {b.name || 'No Name'}</option>
                        ))}
                      </select>
                    </div>
                 </div>

                 {/* Kit Count (Bulk) */}
                 {!initialData && (
                   <div>
                     <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Kits (Bulk Entry)</label>
                     <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          min="1" 
                          max="15"
                          value={kitCount}
                          onChange={(e) => setKitCount(parseInt(e.target.value))}
                          className="w-24 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-farm-500"
                        />
                        <span className="text-xs text-gray-500">
                          {kitCount > 1 ? `Will create ${kitCount} rabbit records.` : 'Single entry.'}
                        </span>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {/* --- PURCHASED SECTION: FINANCIALS --- */}
            {activeTab === 'Purchased' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                 <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                   <DollarSign size={16} /> Purchase Details
                 </h4>
                 
                 <div className="grid grid-cols-2 gap-4">
                    {/* Cost */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cost per Rabbit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                        <input 
                          type="number" 
                          value={formData.purchaseCost}
                          onChange={(e) => setFormData({...formData, purchaseCost: parseFloat(e.target.value)})}
                          className="w-full pl-6 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Acquisition Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date Acquired</label>
                      <input 
                        type="date" 
                        value={formData.dateOfAcquisition}
                        onChange={(e) => setFormData({...formData, dateOfAcquisition: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                 </div>
              </div>
            )}

            {/* --- COMMON FIELDS --- */}
            <div className="grid grid-cols-2 gap-4">
              {/* Tag ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag ID *</label>
                <div className="flex gap-2">
                  <input 
                    required
                    type="text" 
                    value={formData.tag}
                    onChange={e => setFormData({...formData, tag: e.target.value})}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                    placeholder="SN-REX-001"
                  />
                  <button 
                    type="button" 
                    onClick={generateTag}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    title="Generate Tag"
                  >
                    <Wand2 size={16} />
                  </button>
                </div>
                {kitCount > 1 && activeTab === 'Born' && (
                  <p className="text-[10px] text-gray-500 mt-1">Tags will be suffixed -1, -2, etc.</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                  placeholder="Bella"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Breed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                <select 
                  value={formData.breed}
                  onChange={e => setFormData({...formData, breed: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  <option value="Rex">Rex</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Flemish Giant">Flemish Giant</option>
                  <option value="Dutch">Dutch</option>
                  <option value="California">California</option>
                  <option value="Lionhead">Lionhead</option>
                </select>
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="sex" 
                      checked={formData.sex === Sex.Female}
                      onChange={() => setFormData({...formData, sex: Sex.Female})}
                      className="text-farm-600 focus:ring-farm-500"
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="sex" 
                      checked={formData.sex === Sex.Male}
                      onChange={() => setFormData({...formData, sex: Sex.Male})}
                      className="text-farm-600 focus:ring-farm-500"
                    />
                    Male
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Status */}
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as RabbitStatus})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  {Object.values(RabbitStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* DOB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input 
                  type="date" 
                  value={formData.dateOfBirth}
                  onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                />
              </div>
            </div>

            {/* Hutch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hutch / Location</label>
              <input 
                type="text" 
                value={formData.currentHutchId || ''}
                onChange={e => setFormData({...formData, currentHutchId: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                placeholder="e.g. H01 (Optional)"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea 
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none resize-none"
                placeholder="Health notes..."
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
            {loading ? 'Saving...' : <><Save size={18} /> Save {kitCount > 1 && !initialData && activeTab === 'Born' ? 'All' : ''}</>}
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Heart, Warehouse, AlertTriangle } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Sex, Hutch } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type MatingLocation = 'doe_hutch' | 'sire_hutch' | 'neutral';

export const CrossingFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [does, setDoes] = useState<Rabbit[]>([]);
  const [bucks, setBucks] = useState<Rabbit[]>([]);
  const [hutches, setHutches] = useState<Hutch[]>([]);

  const [formData, setFormData] = useState({
    doeId: '',
    sireId: '',
    dateOfCrossing: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [locationType, setLocationType] = useState<MatingLocation>('neutral');
  const [neutralHutchId, setNeutralHutchId] = useState('');

  useEffect(() => {
    if (isOpen) {
      FarmService.getRabbitsBySex(Sex.Female).then(setDoes);
      FarmService.getRabbitsBySex(Sex.Male).then(setBucks);
      FarmService.getHutches().then(setHutches);
      setFormData(prev => ({ ...prev, doeId: '', sireId: '' }));
      setLocationType('neutral');
      setNeutralHutchId('');
    }
  }, [isOpen]);

  const selectedDoe = does.find(r => r.tag === formData.doeId);
  const selectedSire = bucks.find(r => r.tag === formData.sireId);
  
  // Inbreeding Check Logic
  const inbreedingWarning = useMemo(() => {
    if (!selectedDoe || !selectedSire) return null;

    const doeParents = selectedDoe.parentage || {};
    const sireParents = selectedSire.parentage || {};

    // Check strict equality and ensure values exist (are not empty/undefined)
    const sameFather = doeParents.sireId && sireParents.sireId && (doeParents.sireId === sireParents.sireId);
    const sameMother = doeParents.doeId && sireParents.doeId && (doeParents.doeId === sireParents.doeId);

    if (sameFather && sameMother) {
        return { title: 'Full Siblings Detected', message: 'These rabbits share the same Mother and Father.' };
    }
    if (sameFather) {
        return { title: 'Half Siblings (Same Father)', message: `Both rabbits share the same father (${doeParents.sireId}).` };
    }
    if (sameMother) {
        return { title: 'Half Siblings (Same Mother)', message: `Both rabbits share the same mother (${doeParents.doeId}).` };
    }

    return null;
  }, [selectedDoe, selectedSire]);

  // Resolve the actual target hutch ID based on selection
  const getTargetHutchId = (): string => {
    if (locationType === 'doe_hutch') return selectedDoe?.currentHutchId || '';
    if (locationType === 'sire_hutch') return selectedSire?.currentHutchId || '';
    return neutralHutchId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doeId || !formData.sireId) return;

    const targetId = getTargetHutchId();
    if (!targetId) {
        showToast("Please specify a valid hutch for mating.", 'error');
        return;
    }

    setLoading(true);
    try {
      // Determine movement config
      let moveConfig: any = { targetHutchId: targetId, doeDbId: selectedDoe?.id, sireDbId: selectedSire?.id };
      
      if (locationType === 'doe_hutch') {
         // Sire moves to Doe
         moveConfig.mode = 'sire_visit_doe';
      } else if (locationType === 'sire_hutch') {
         // Doe moves to Sire
         moveConfig.mode = 'doe_visit_sire';
      } else {
         // Both move to neutral
         moveConfig.mode = 'neutral';
      }

      await FarmService.addCrossing({
        ...formData,
        doeName: selectedDoe?.name,
        sireName: selectedSire?.name,
        matingHutchId: targetId
      }, moveConfig);

      showToast("Mating recorded & rabbits moved successfully", 'success');
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Heart className="text-pink-500 fill-current" size={20} /> Record New Mating
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doe (Female)</label>
                <select 
                required
                value={formData.doeId}
                onChange={e => {
                    setFormData({...formData, doeId: e.target.value});
                    // Reset location if current selection becomes invalid
                    setLocationType('neutral');
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                >
                <option value="">Choose Doe...</option>
                {does.map(d => (
                    <option key={d.id} value={d.tag}>{d.tag} {d.name ? `(${d.name})` : ''}</option>
                ))}
                </select>
                {selectedDoe?.currentHutchId && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Warehouse size={10} /> Currently in: {selectedDoe.currentHutchId}
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Buck (Male)</label>
                <select 
                required
                value={formData.sireId}
                onChange={e => {
                    setFormData({...formData, sireId: e.target.value});
                    setLocationType('neutral');
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                >
                <option value="">Choose Buck...</option>
                {bucks.map(b => (
                    <option key={b.id} value={b.tag}>{b.tag} {b.name ? `(${b.name})` : ''}</option>
                ))}
                </select>
                {selectedSire?.currentHutchId && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Warehouse size={10} /> Currently in: {selectedSire.currentHutchId}
                    </p>
                )}
            </div>
          </div>

          {/* Inbreeding Warning Alert */}
          {inbreedingWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 items-start animate-fadeIn">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-bold text-amber-800">Inbreeding Warning: {inbreedingWarning.title}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {inbreedingWarning.message} This increases the risk of genetic defects.
                  </p>
                </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mating Location (Rabbit Movement)</label>
            <div className="space-y-2">
                {/* Option 1: Doe's Hutch */}
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    locationType === 'doe_hutch' ? 'bg-pink-50 border-pink-200' : 'hover:bg-gray-50 border-gray-200'
                } ${!selectedDoe?.currentHutchId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input 
                        type="radio" 
                        name="location" 
                        value="doe_hutch"
                        checked={locationType === 'doe_hutch'}
                        onChange={() => setLocationType('doe_hutch')}
                        className="text-pink-600 focus:ring-pink-500"
                        disabled={!selectedDoe?.currentHutchId}
                    />
                    <div className="ml-3">
                        <span className="block text-sm font-medium text-gray-900">In Doe's Hutch</span>
                        <span className="block text-xs text-gray-500">
                             {selectedDoe?.currentHutchId 
                               ? `Buck moves to ${selectedDoe.currentHutchId}` 
                               : "Doe has no hutch assigned"}
                        </span>
                    </div>
                </label>

                {/* Option 2: Buck's Hutch */}
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    locationType === 'sire_hutch' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-gray-200'
                } ${!selectedSire?.currentHutchId ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input 
                        type="radio" 
                        name="location" 
                        value="sire_hutch"
                        checked={locationType === 'sire_hutch'}
                        onChange={() => setLocationType('sire_hutch')}
                        className="text-blue-600 focus:ring-blue-500"
                        disabled={!selectedSire?.currentHutchId}
                    />
                    <div className="ml-3">
                        <span className="block text-sm font-medium text-gray-900">In Buck's Hutch</span>
                        <span className="block text-xs text-gray-500">
                             {selectedSire?.currentHutchId 
                               ? `Doe moves to ${selectedSire.currentHutchId}` 
                               : "Buck has no hutch assigned"}
                        </span>
                    </div>
                </label>

                {/* Option 3: Neutral */}
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    locationType === 'neutral' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50 border-gray-200'
                }`}>
                    <input 
                        type="radio" 
                        name="location" 
                        value="neutral"
                        checked={locationType === 'neutral'}
                        onChange={() => setLocationType('neutral')}
                        className="text-gray-600 focus:ring-gray-500"
                    />
                    <div className="ml-3 flex-1">
                        <span className="block text-sm font-medium text-gray-900">Neutral / Other Hutch</span>
                        <span className="block text-xs text-gray-500">Both rabbits move to new location</span>
                        
                        {locationType === 'neutral' && (
                            <div className="mt-2">
                                <select 
                                    value={neutralHutchId}
                                    onChange={e => setNeutralHutchId(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-sm"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <option value="">Select Hutch...</option>
                                    {hutches.map(h => (
                                        <option 
                                            key={h.id} 
                                            value={h.hutchId}
                                            disabled={h.currentOccupancy >= h.capacity}
                                        >
                                            {h.label} ({h.currentOccupancy}/{h.capacity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </label>
            </div>
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
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 mt-4 ${
                inbreedingWarning 
                    ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-200' 
                    : 'bg-farm-600 hover:bg-farm-700'
            }`}
          >
            {loading ? 'Recording...' : inbreedingWarning ? 'Proceed with Inbreeding' : 'Save Record & Move Rabbits'}
          </button>
        </form>
      </div>
    </div>
  );
};
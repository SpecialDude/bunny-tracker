
import React, { useState, useEffect, useMemo } from 'react';
import { X, Heart, Warehouse, AlertTriangle } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Rabbit, Sex, Hutch, Crossing } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Crossing; // If provided, modal is in edit mode
}

type MatingLocation = 'doe_hutch' | 'sire_hutch' | 'neutral';

export const CrossingFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [does, setDoes] = useState<Rabbit[]>([]);
  const [bucks, setBucks] = useState<Rabbit[]>([]);
  const [hutches, setHutches] = useState<Hutch[]>([]);

  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    doeId: '',
    sireId: '',
    dateOfCrossing: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [locationType, setLocationType] = useState<MatingLocation | null>(null);
  const [neutralHutchId, setNeutralHutchId] = useState('');

  useEffect(() => {
    if (isOpen) {
      FarmService.getRabbitsBySex(Sex.Female).then(setDoes);
      FarmService.getRabbitsBySex(Sex.Male).then(setBucks);
      FarmService.getHutches().then(setHutches);

      if (initialData) {
        // Edit mode: pre-fill form
        setFormData({
          doeId: initialData.doeId,
          sireId: initialData.sireId,
          dateOfCrossing: initialData.dateOfCrossing,
          notes: initialData.notes || ''
        });
        setLocationType(null);
        setNeutralHutchId('');
      } else {
        // Create mode: reset form
        setFormData({ doeId: '', sireId: '', dateOfCrossing: new Date().toISOString().split('T')[0], notes: '' });
        setLocationType(null);
        setNeutralHutchId('');
      }
    }
  }, [isOpen, initialData]);

  const hutchMap = useMemo(() => {
    return hutches.reduce((acc, h) => {
      acc[h.hutchId] = h.label;
      return acc;
    }, {} as Record<string, string>);
  }, [hutches]);

  const selectedDoe = does.find(r => r.tag === formData.doeId);
  const selectedSire = bucks.find(r => r.tag === formData.sireId);
  
  // Inbreeding Check Logic
  const inbreedingWarning = useMemo(() => {
    if (!selectedDoe || !selectedSire) return null;

    const doeParents = selectedDoe.parentage || {};
    const sireParents = selectedSire.parentage || {};

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

  // Resolve the mating hutch ID (for record-keeping only, no movement)
  const getMatingHutchId = (): string => {
    if (!locationType) return '';
    if (locationType === 'doe_hutch') return selectedDoe?.currentHutchId || '';
    if (locationType === 'sire_hutch') return selectedSire?.currentHutchId || '';
    return neutralHutchId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doeId || !formData.sireId) return;

    if (isEditMode) {
      // Edit mode: no location required, just update core fields
      setLoading(true);
      try {
        // Find updated names from loaded rabbits (in case doe/sire changed)
        const updatedDoe = does.find(r => r.tag === formData.doeId);
        const updatedSire = bucks.find(r => r.tag === formData.sireId);
        await FarmService.updateCrossing(initialData!.id!, {
          doeId: formData.doeId,
          sireId: formData.sireId,
          dateOfCrossing: formData.dateOfCrossing,
          notes: formData.notes,
          doeName: updatedDoe?.name || formData.doeId,
          sireName: updatedSire?.name || formData.sireId,
        });
        showToast("Mating record updated successfully", 'success');
        onSuccess();
        onClose();
      } catch (error: any) {
        showToast(`Failed to update: ${error?.message || 'Unknown error'}`, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Create mode: location is required
    const matingHutchId = getMatingHutchId();
    if (!matingHutchId) {
        showToast("Please specify where the mating took place.", 'error');
        return;
    }

    setLoading(true);
    try {
      await FarmService.addCrossing({
        ...formData,
        doeName: selectedDoe?.name,
        sireName: selectedSire?.name,
        doeHutchLabel: selectedDoe?.currentHutchId ? hutchMap[selectedDoe.currentHutchId] : undefined,
        sireHutchLabel: selectedSire?.currentHutchId ? hutchMap[selectedSire.currentHutchId] : undefined,
        matingHutchId: matingHutchId
      });

      showToast("Mating record saved successfully", 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Mating record error:', error);
      const message = error?.message || 'An unknown error occurred';
      showToast(`Failed to record mating: ${message}`, 'error');
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
            <Heart className="text-pink-500 fill-current" size={20} />
            {isEditMode ? 'Edit Mating Record' : 'Record New Mating'}
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
                    setLocationType(null);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                >
                <option value="">Choose Doe...</option>
                {does.map(d => (
                    <option key={d.id} value={d.tag}>
                      {d.tag} {d.name ? `(${d.name})` : ''} 
                      {d.currentHutchId ? ` - ${hutchMap[d.currentHutchId] || d.currentHutchId}` : ''}
                    </option>
                ))}
                {/* If editing and the doe is no longer in the active list, show it anyway */}
                {isEditMode && initialData && !does.find(d => d.tag === initialData.doeId) && (
                  <option value={initialData.doeId}>{initialData.doeId} (current)</option>
                )}
                </select>
                {selectedDoe?.currentHutchId && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Warehouse size={10} /> Currently in: {hutchMap[selectedDoe.currentHutchId] || selectedDoe.currentHutchId}
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
                    setLocationType(null);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
                >
                <option value="">Choose Buck...</option>
                {bucks.map(b => (
                    <option key={b.id} value={b.tag}>
                      {b.tag} {b.name ? `(${b.name})` : ''}
                      {b.currentHutchId ? ` - ${hutchMap[b.currentHutchId] || b.currentHutchId}` : ''}
                    </option>
                ))}
                {/* If editing and the sire is no longer in the active list, show it anyway */}
                {isEditMode && initialData && !bucks.find(b => b.tag === initialData.sireId) && (
                  <option value={initialData.sireId}>{initialData.sireId} (current)</option>
                )}
                </select>
                {selectedSire?.currentHutchId && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Warehouse size={10} /> Currently in: {hutchMap[selectedSire.currentHutchId] || selectedSire.currentHutchId}
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

          {/* Mating location — only shown in create mode */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Where did mating happen?</label>
              <p className="text-xs text-gray-500 mb-2">This is for record-keeping only — rabbits will not be moved from their hutches.</p>
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
                          <span className="block text-sm font-medium text-gray-900">Doe's Hutch</span>
                          <span className="block text-xs text-gray-500">
                               {selectedDoe?.currentHutchId 
                                 ? `${hutchMap[selectedDoe.currentHutchId] || selectedDoe.currentHutchId}` 
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
                          <span className="block text-sm font-medium text-gray-900">Buck's Hutch</span>
                          <span className="block text-xs text-gray-500">
                               {selectedSire?.currentHutchId 
                                 ? `${hutchMap[selectedSire.currentHutchId] || selectedSire.currentHutchId}` 
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
                          <span className="block text-sm font-medium text-gray-900">Other Hutch</span>
                          <span className="block text-xs text-gray-500">Mating happened in a different hutch</span>
                          
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
                                          <option key={h.id} value={h.hutchId}>
                                              {h.label}
                                          </option>
                                      ))}
                                  </select>
                              </div>
                          )}
                      </div>
                  </label>
              </div>
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none text-sm"
              placeholder="Any observations..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 mt-4 ${
                inbreedingWarning && !isEditMode
                    ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-200' 
                    : 'bg-farm-600 hover:bg-farm-700'
            }`}
          >
            {loading
              ? 'Saving...'
              : isEditMode
                ? 'Save Changes'
                : inbreedingWarning
                  ? 'Proceed with Inbreeding'
                  : 'Save Mating Record'}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Save, Wand2, DollarSign, Baby, ShoppingBag, AlertTriangle, ArrowUpCircle, List, ArrowRight, Scale } from 'lucide-react';
import { Rabbit, RabbitStatus, Sex, Hutch, Crossing, CrossingStatus } from '../types';
import { FarmService } from '../services/farmService';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

interface RabbitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Rabbit;
}

// Helper to define a Kit in the review stage
interface KitDraft {
  tag: string;
  sex: Sex;
  name: string;
  hutchId: string;
}

export const RabbitFormModal: React.FC<RabbitFormModalProps> = ({ 
  isOpen, onClose, onSuccess, initialData 
}) => {
  const { showToast } = useAlert();
  const { currencySymbol } = useFarm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Born' | 'Purchased'>('Born');
  const [step, setStep] = useState<'details' | 'review_kits'>('details');
  
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
    weight: 0,
    parentage: { sireId: '', doeId: '' }
  });

  // Bulk Entry State
  const [kitCount, setKitCount] = useState(1);
  const [selectedLitterId, setSelectedLitterId] = useState('');
  const [motherHutchId, setMotherHutchId] = useState<string | null>(null);
  
  // Kit Review State
  const [kits, setKits] = useState<KitDraft[]>([]);

  // Capacity Check State
  const [expandCapacity, setExpandCapacity] = useState(false);

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
          weight: 0,
          parentage: { sireId: '', doeId: '' }
        });
        setKitCount(1);
        setSelectedLitterId('');
        setActiveTab('Born');
        setMotherHutchId(null);
      }
      setExpandCapacity(false);
      setStep('details');
      setKits([]);
    }
  }, [initialData, isOpen]);

  // Handle Mating Record Selection
  const handleLitterChange = (crossingId: string) => {
    setSelectedLitterId(crossingId);
    if (!crossingId) {
        setMotherHutchId(null);
        return;
    }

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
         // Use actual delivery date if available, else expected
         dateOfBirth: crossing.actualDeliveryDate || crossing.expectedDeliveryDate || prev.dateOfBirth
       }));

       // Auto-fill Kit Count if delivered stats exist
       if (crossing.status === CrossingStatus.Delivered && crossing.kitsLive && crossing.kitsLive > 0) {
           setKitCount(crossing.kitsLive);
       }

       // Set Default Hutch to Mother's Hutch
       if (mother && mother.currentHutchId) {
           setMotherHutchId(mother.currentHutchId);
           setFormData(prev => ({ ...prev, currentHutchId: mother.currentHutchId }));
       } else {
           setMotherHutchId(null);
       }
    }
  };

  const generateTag = async () => {
    if (!formData.breed) return;
    const tag = await FarmService.generateNextTag(formData.breed);
    setFormData(prev => ({ ...prev, tag }));
  };

  // Capacity Logic
  const getSelectedHutch = () => hutches.find(h => h.hutchId === formData.currentHutchId);
  
  const getRequiredCapacity = () => {
    // If editing and keeping same hutch, we aren't adding net new occupancy (conceptually)
    if (initialData && initialData.currentHutchId === formData.currentHutchId) return 0;
    // Otherwise we are adding 1 or N kits
    return (!initialData && activeTab === 'Born') ? kitCount : 1;
  };

  const isHutchFull = () => {
    const hutch = getSelectedHutch();
    if (!hutch) return false;
    
    // BYPASS: If kits are staying with mother, ignore capacity warning
    if (!initialData && activeTab === 'Born' && formData.currentHutchId === motherHutchId) {
        return false;
    }

    const required = getRequiredCapacity();
    if (required === 0) return false;

    return (hutch.currentOccupancy + required) > hutch.capacity;
  };

  // Prepare Review Step
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.tag) {
        showToast("Please enter or generate a Tag ID", 'error');
        return;
    }

    // Capacity Check
    if (isHutchFull()) {
        const hutch = getSelectedHutch();
        if (!expandCapacity) {
          showToast(`Hutch ${hutch?.label} is full. Please select another hutch or check "Increase capacity".`, 'error');
          return;
        }
    }

    // If Buying or Editing or Single Kit -> Just Save (Skip review)
    if (initialData || activeTab === 'Purchased' || kitCount === 1) {
        await handleSave();
        return;
    }

    // Generate Kit Drafts
    const generatedKits: KitDraft[] = [];
    for (let i = 0; i < kitCount; i++) {
        generatedKits.push({
            tag: `${formData.tag}-${i + 1}`,
            sex: Sex.Female, // Default
            name: '',
            hutchId: formData.currentHutchId || ''
        });
    }
    setKits(generatedKits);
    setStep('review_kits');
  };

  const handleSave = async () => {
    setLoading(true);

    try {
        const isPurchase = activeTab === 'Purchased';
        const hutch = getSelectedHutch();

        // 1. Handle Capacity Expansion if checked
        if (expandCapacity && hutch && hutch.id) {
             const required = getRequiredCapacity();
             const newCapacity = Math.max(hutch.capacity + 1, hutch.currentOccupancy + required);
             await FarmService.updateHutch(hutch.id, { capacity: newCapacity });
        }

        // 2. Prepare Base Payload
        const basePayload = {
            ...formData,
            source: activeTab,
            dateOfAcquisition: isPurchase ? formData.dateOfAcquisition : formData.dateOfBirth,
        };

        if (initialData?.id) {
            // Update Single
            await FarmService.updateRabbit(initialData.id, basePayload);
        } else if (kits.length > 0) {
            // Bulk Save from Review
            await FarmService.addBulkRabbits(basePayload as any, kits, isPurchase);
        } else {
            // Single Add
            await FarmService.addRabbit(basePayload as any, isPurchase, kitCount);
        }

        showToast("Saved successfully", 'success');
        onSuccess();
        onClose();
    } catch (error) {
        console.error("Failed to save rabbit:", error);
        showToast("Failed to save. Check console for details.", 'error');
    } finally {
        setLoading(false);
    }
  };

  // Helper to update individual kit in review
  const updateKit = (index: number, field: keyof KitDraft, value: any) => {
      const newKits = [...kits];
      newKits[index] = { ...newKits[index], [field]: value };
      setKits(newKits);
  };

  if (!isOpen) return null;

  const hutchIsFull = isHutchFull();
  const selectedHutch = getSelectedHutch();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {step === 'review_kits' ? 'Review New Kits' : (initialData ? 'Edit Rabbit' : 'Add Rabbit')}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          
          {step === 'details' ? (
            <>
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

                <form id="rabbitForm" onSubmit={handleNext} className="space-y-6">
                    
                    {/* Identity Section */}
                    <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Tag ID</label>
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
                        {kitCount > 1 && formData.tag && (
                             <p className="text-xs text-gray-500 mt-1">
                                Will generate: <b>{formData.tag}-1</b> ... <b>{formData.tag}-{kitCount}</b>
                             </p>
                        )}
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
                            max="15"
                            value={kitCount}
                            onChange={e => setKitCount(parseInt(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-white border border-blue-200 rounded text-sm focus:outline-none"
                        />
                        <span className="text-xs text-blue-600">
                            {kitCount > 1 ? `Review detailed list on next step` : 'Single record'}
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
                                {c.doeId} x {c.sireId} ({c.status === 'Delivered' ? 'Delivered' : 'Pregnant'})
                            </option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mother (Doe)</label>
                            <input type="text" disabled value={formData.parentage?.doeId} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500" />
                            </div>
                            <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Father (Buck)</label>
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
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{currencySymbol}</span>
                                <input 
                                type="number" 
                                min="0"
                                value={formData.purchaseCost}
                                onChange={e => setFormData({...formData, purchaseCost: parseFloat(e.target.value)})}
                                className="w-full pl-6 pr-3 py-2 bg-white border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                                />
                            </div>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Weight (kg)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Scale size={16} />
                                </span>
                                <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                value={formData.weight || ''}
                                onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                                placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Hutch</label>
                        <select 
                        value={formData.currentHutchId || ''}
                        onChange={e => {
                            setFormData({...formData, currentHutchId: e.target.value});
                            setExpandCapacity(false); // Reset check when changing hutch
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 outline-none ${
                            hutchIsFull ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-farm-500'
                        }`}
                        >
                        <option value="">-- Unassigned --</option>
                        {hutches.map(h => (
                            <option key={h.hutchId} value={h.hutchId}>
                            {h.label} ({h.currentOccupancy}/{h.capacity})
                            </option>
                        ))}
                        </select>
                        
                        {/* Info: Kits staying with mother */}
                        {!initialData && activeTab === 'Born' && formData.currentHutchId && formData.currentHutchId === motherHutchId && (
                             <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Baby size={12}/> Staying in mother's hutch. Capacity warning ignored.
                             </p>
                        )}

                        {/* Warning and Override */}
                        {hutchIsFull && selectedHutch && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2 text-red-700 text-xs mb-2">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>
                                <strong>Hutch Full:</strong> Capacity is {selectedHutch.capacity}. 
                                Adding {getRequiredCapacity()} will raise occupancy to {selectedHutch.currentOccupancy + getRequiredCapacity()}.
                                </span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                type="checkbox"
                                checked={expandCapacity}
                                onChange={e => setExpandCapacity(e.target.checked)}
                                className="text-red-600 focus:ring-red-500 rounded"
                                />
                                <span className="text-xs font-medium text-red-700 group-hover:text-red-800 flex items-center gap-1">
                                <ArrowUpCircle size={12} />
                                Increase capacity by 1 (to {Math.max(selectedHutch.capacity + 1, selectedHutch.currentOccupancy + getRequiredCapacity())})
                                </span>
                            </label>
                        </div>
                        )}
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
            </>
          ) : (
            // REVIEW STEP
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex gap-2">
                   <List size={18} className="shrink-0"/>
                   <p>Review the details for each kit. You can change gender or hutch before saving.</p>
                </div>

                <div className="space-y-2">
                   <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 px-2">
                      <div className="col-span-4">Tag ID</div>
                      <div className="col-span-4">Sex</div>
                      <div className="col-span-4">Hutch</div>
                   </div>
                   {kits.map((kit, idx) => (
                       <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg bg-gray-50">
                           <div className="col-span-4">
                               <input 
                                  type="text" 
                                  value={kit.tag}
                                  onChange={e => updateKit(idx, 'tag', e.target.value)}
                                  className="w-full px-2 py-1 bg-white border rounded text-sm font-bold text-gray-800"
                               />
                           </div>
                           <div className="col-span-4">
                               <select
                                 value={kit.sex}
                                 onChange={e => updateKit(idx, 'sex', e.target.value as Sex)}
                                 className="w-full px-2 py-1 bg-white border rounded text-sm"
                               >
                                   <option value={Sex.Female}>Female</option>
                                   <option value={Sex.Male}>Male</option>
                               </select>
                           </div>
                           <div className="col-span-4">
                               <select
                                 value={kit.hutchId}
                                 onChange={e => updateKit(idx, 'hutchId', e.target.value)}
                                 className="w-full px-2 py-1 bg-white border rounded text-xs"
                               >
                                  <option value="">None</option>
                                  {hutches.map(h => (
                                    <option key={h.hutchId} value={h.hutchId}>
                                        {h.hutchId}
                                    </option>
                                  ))}
                               </select>
                           </div>
                       </div>
                   ))}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100 bg-white shrink-0">
          {step === 'review_kits' ? (
             <button 
                type="button" 
                onClick={() => setStep('details')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
             >
                Back
             </button>
          ) : (
             <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
             >
                Cancel
             </button>
          )}

          {step === 'details' && kitCount > 1 && !initialData && activeTab === 'Born' ? (
             <button 
                type="submit" 
                form="rabbitForm"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
             >
                Review Kits <ArrowRight size={18} />
             </button>
          ) : (
             <button 
                type="button"
                onClick={step === 'review_kits' ? handleSave : (e) => {
                     // Trigger form submit programmatically for single adds
                     const form = document.getElementById('rabbitForm') as HTMLFormElement;
                     form?.requestSubmit(); 
                }}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50"
             >
                {loading ? 'Saving...' : <><Save size={18} /> Save {step === 'review_kits' ? 'All' : 'Rabbit'}</>}
             </button>
          )}
        </div>
      </div>
    </div>
  );
};
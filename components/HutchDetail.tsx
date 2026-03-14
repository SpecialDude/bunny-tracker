import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Rabbit as RabbitIcon, Edit2, Scale, Calendar, List, LayoutGrid, ArrowRightLeft } from 'lucide-react';
import { Hutch, Rabbit, Sex } from '../types';
import { FarmService } from '../services/farmService';
import { MoveRabbitModal } from './MoveRabbitModal';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  hutch: Hutch;
  onBack: () => void;
}

export const HutchDetail: React.FC<Props> = ({ hutch, onBack }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(true);
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedRabbitForMove, setSelectedRabbitForMove] = useState<Rabbit | undefined>(undefined);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await FarmService.getRabbitsByHutchId(hutch.hutchId);
      setRabbits(data);
      
      // Auto-sync occupancy if mismatch is detected
      if (data.length !== hutch.currentOccupancy && hutch.id) {
          await FarmService.syncHutchOccupancy(hutch.id, data.length);
          // Don't show toast to avoid spamming, but log to console
          console.log(`Auto-synced hutch ${hutch.hutchId} occupancy from ${hutch.currentOccupancy} to ${data.length}`);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load rabbits for this hutch", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hutch.hutchId]);

  const handleMoveClick = (rabbit: Rabbit) => {
    setSelectedRabbitForMove(rabbit);
    setIsMoveModalOpen(true);
  };

  const handleMoveSuccess = () => {
      // Reload logic is handled globally for the hutch list (which affects capacities), 
      // but we need to locally remove the rabbit from this view too
      loadData();
  };

  const getAge = (dob: string | undefined) => {
    if (!dob) return 'Unknown';
    const diff = new Date().getTime() - new Date(dob).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 35) return `${days} days`;
    if (days < 90) return `${Math.floor(days / 7)} weeks`;
    return `${Math.floor(days / 30)} months`;
  };

  // Capacity visualization
  const getProgressColor = (current: number, max: number) => {
    if (!max) return 'bg-green-500';
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };
  
  // Notice we use rabbits.length instead of hutch.currentOccupancy here to show the actual
  // loaded items, but they should usually match unless the database gets out of sync
  const currentOccupancy = rabbits.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             {hutch.label}
             <span className="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {hutch.hutchId}
             </span>
           </h2>
           <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
               <div>Capacity: <strong className={currentOccupancy >= hutch.capacity ? 'text-red-600' : 'text-gray-900'}>{currentOccupancy} / {hutch.capacity}</strong></div>
               <div className="hidden sm:block w-32 bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-full rounded-full ${getProgressColor(currentOccupancy, hutch.capacity)}`} 
                    style={{ width: `${hutch.capacity > 0 ? Math.min((currentOccupancy / hutch.capacity) * 100, 100) : 100}%` }}
                  />
               </div>
               {hutch.accessories && hutch.accessories.length > 0 && (
                   <div className="hidden md:flex gap-1">
                       &bull; {hutch.accessories.map(a => <span key={a} className="bg-gray-50 border border-gray-100 px-1.5 rounded">{a}</span>)}
                   </div>
               )}
           </div>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-farm-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
            >
                <List size={18} />
            </button>
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-farm-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
            >
                <LayoutGrid size={18} />
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-farm-600" /></div>
      ) : rabbits.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <RabbitIcon className="text-gray-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">This hutch is empty</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-sm">
                No rabbits are currently assigned to this hutch. Use the Move Rabbit action on a rabbit profile to place them here.
            </p>
        </div>
      ) : (
        <>
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Tag ID</th>
                                    <th className="px-6 py-4">Breed & Sex</th>
                                    <th className="px-6 py-4">Age</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rabbits.map(rabbit => (
                                    <tr key={rabbit.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{rabbit.tag}</div>
                                            {rabbit.name && <div className="text-xs text-gray-500">{rabbit.name}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    rabbit.sex === Sex.Male ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                                }`}>
                                                    {rabbit.sex.charAt(0)}
                                                </span>
                                                <span className="text-gray-700">{rabbit.breed}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{getAge(rabbit.dateOfBirth)}</span>
                                                <span className="text-xs text-gray-400">{rabbit.dateOfBirth}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleMoveClick(rabbit)}
                                                className="p-1.5 hover:bg-orange-50 rounded text-gray-400 hover:text-orange-600 transition-colors"
                                                title="Move Rabbit"
                                            >
                                                <ArrowRightLeft size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {rabbits.map(rabbit => (
                        <div key={rabbit.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleMoveClick(rabbit)}
                                    className="p-1.5 bg-white shadow-sm border border-gray-200 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                    title="Move Rabbit"
                                >
                                    <ArrowRightLeft size={14} />
                                </button>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                    rabbit.sex === Sex.Male ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                }`}>
                                    {rabbit.tag.substring(rabbit.tag.length - 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-farm-600 transition-colors">{rabbit.tag}</h3>
                                    <p className="text-sm text-gray-500">{rabbit.breed} • {rabbit.sex}</p>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-gray-50 rounded flex items-center gap-2 text-gray-600">
                                    <Calendar size={14} className="text-gray-400"/>
                                    {getAge(rabbit.dateOfBirth)}
                                </div>
                                <div className="p-2 bg-gray-50 rounded flex items-center gap-2 text-gray-600">
                                    <Scale size={14} className="text-gray-400"/>
                                    {rabbit.weight ? `${rabbit.weight} kg` : '--'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}

      {selectedRabbitForMove && (
          <MoveRabbitModal
            isOpen={isMoveModalOpen}
            onClose={() => {
                setIsMoveModalOpen(false);
                setSelectedRabbitForMove(undefined);
            }}
            onSuccess={handleMoveSuccess}
            rabbit={selectedRabbitForMove}
          />
      )}
    </div>
  );
};

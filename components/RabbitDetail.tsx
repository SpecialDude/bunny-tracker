
import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Calendar, Activity, Syringe, Baby, Clock, 
    MapPin, Dna, Loader2, Warehouse, Scale, TrendingUp 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FarmService } from '../services/farmService';
import { Rabbit, HutchOccupancy, MedicalRecord, Crossing, WeightRecord } from '../types';
import { WeightModal } from './WeightModal';

interface Props {
  rabbitId: string;
  onBack: () => void;
}

export const RabbitDetail: React.FC<Props> = ({ rabbitId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
      rabbit: Rabbit;
      offspring: Rabbit[];
      medical: MedicalRecord[];
      history: HutchOccupancy[];
      pedigree: { sire?: Rabbit; doe?: Rabbit };
      litters: Crossing[];
      weights: WeightRecord[];
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'history' | 'medical' | 'breeding'>('overview');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const details = await FarmService.getRabbitDetails(rabbitId);
      setData(details);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [rabbitId]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-farm-600" /></div>;
  if (!data) return <div className="p-10 text-center text-red-500">Rabbit not found.</div>;

  const { rabbit, history, medical, offspring, pedigree, litters, weights } = data;

  const getFormattedAge = (dob?: string) => {
      if (!dob) return 'Unknown';
      const diff = new Date().getTime() - new Date(dob).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days < 35) return `${days} days`;
      if (days < 90) return `${Math.floor(days / 7)} weeks`;
      return `${Math.floor(days / 30)} months`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
             {rabbit.tag} 
             <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                 rabbit.status === 'Alive' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
             }`}>
                {rabbit.status}
             </span>
           </h2>
           <p className="text-gray-500 text-sm">{rabbit.name || 'No Name'} • {rabbit.breed} • {rabbit.sex}</p>
        </div>
        <button 
             onClick={() => setIsWeightModalOpen(true)}
             className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
             <Scale size={16} /> Weigh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto">
          {(['overview', 'growth', 'history', 'medical', 'breeding'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab 
                    ? 'border-farm-600 text-farm-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                  {tab}
              </button>
          ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {/* Bio */}
                 <div className="col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Biological Details</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                            <span className="block text-xs font-medium text-gray-500">Date of Birth</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400"/> {rabbit.dateOfBirth || '-'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500">Age</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Clock size={14} className="text-gray-400"/> {getFormattedAge(rabbit.dateOfBirth)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500">Weight</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Scale size={14} className="text-gray-400"/> {rabbit.weight ? `${rabbit.weight} kg` : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500">Source</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <MapPin size={14} className="text-gray-400"/> {rabbit.source}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500">Current Location</span>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Warehouse size={14} className="text-gray-400"/> {rabbit.currentHutchId || 'Unassigned'}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                       <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                           <Dna size={20} className="text-purple-600"/> Pedigree
                       </h3>
                       <div className="flex items-center gap-4">
                           <div className="flex-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                               <span className="block text-xs text-blue-500 uppercase font-bold tracking-wider">Buck (Father)</span>
                               <span className="font-bold text-blue-900">{rabbit.parentage.sireId || 'Unknown'}</span>
                               {pedigree.sire && <div className="text-xs text-blue-700">{pedigree.sire.breed}</div>}
                           </div>
                           <div className="text-gray-300 font-light text-2xl">+</div>
                           <div className="flex-1 p-3 bg-pink-50 border border-pink-100 rounded-lg text-center">
                               <span className="block text-xs text-pink-500 uppercase font-bold tracking-wider">Doe (Mother)</span>
                               <span className="font-bold text-pink-900">{rabbit.parentage.doeId || 'Unknown'}</span>
                               {pedigree.doe && <div className="text-xs text-pink-700">{pedigree.doe.breed}</div>}
                           </div>
                       </div>
                    </div>
                 </div>

                 {/* Stats Card */}
                 <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-4">Performance Stats</h4>
                    <ul className="space-y-4">
                        <li className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 flex items-center gap-2">
                                <Baby size={16}/> Total Offspring
                            </span>
                            <span className="font-bold text-gray-900">{offspring.length}</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 flex items-center gap-2">
                                <Activity size={16}/> Litters
                            </span>
                            <span className="font-bold text-gray-900">{litters.filter(l => l.status === 'Delivered').length}</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 flex items-center gap-2">
                                <Syringe size={16}/> Treatments
                            </span>
                            <span className="font-bold text-gray-900">{medical.length}</span>
                        </li>
                    </ul>
                    {rabbit.notes && (
                         <div className="mt-6 pt-4 border-t border-gray-200">
                             <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Notes</span>
                             <p className="text-sm text-gray-600 italic">"{rabbit.notes}"</p>
                         </div>
                    )}
                 </div>
              </div>
          )}

          {/* GROWTH TAB */}
          {activeTab === 'growth' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">Growth Chart</h3>
                 </div>
                 
                 {weights.length > 0 ? (
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weights}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis unit="kg" tick={{fontSize: 12}} />
                                <Tooltip 
                                    formatter={(val) => [`${val} kg`, 'Weight']} 
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                 ) : (
                     <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                        <TrendingUp size={32} className="mb-2 opacity-50"/>
                        <p>No weight records yet.</p>
                     </div>
                 )}

                 <div className="mt-8">
                     <h3 className="font-bold text-gray-900 mb-4">Weight History</h3>
                     {weights.length === 0 ? (
                         <p className="text-gray-500 italic text-sm">No measurements recorded.</p>
                     ) : (
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="bg-gray-50 text-gray-900 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Weight</th>
                                        <th className="px-4 py-3">Age at Record</th>
                                        <th className="px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {weights.slice().reverse().map(w => ( // Show newest first in table
                                        <tr key={w.id}>
                                            <td className="px-4 py-3">{w.date}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{w.weight} kg</td>
                                            <td className="px-4 py-3">{w.ageAtRecord || '-'}</td>
                                            <td className="px-4 py-3 text-gray-400">{w.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     )}
                 </div>
              </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
              <div className="space-y-6">
                 <h3 className="font-bold text-gray-900 mb-4">Housing Timeline</h3>
                 {history.length === 0 ? (
                     <p className="text-gray-500 italic">No movement history available.</p>
                 ) : (
                     <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                         {history.map((h, i) => (
                             <div key={i} className="ml-6 relative">
                                 <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-farm-100 border-2 border-farm-500"></span>
                                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                     <div>
                                         <h4 className="font-bold text-gray-900">{h.hutchLabel} ({h.hutchId})</h4>
                                         <p className="text-sm text-gray-600 mt-1">{h.purpose} {h.notes ? `• ${h.notes}` : ''}</p>
                                     </div>
                                     <div className="text-right">
                                         <span className="block text-xs font-bold text-gray-500">Entered</span>
                                         <span className="text-sm text-gray-800">{h.startAt}</span>
                                         {h.endAt && (
                                            <>
                                                <span className="block text-xs font-bold text-gray-500 mt-1">Left</span>
                                                <span className="text-sm text-gray-800">{h.endAt}</span>
                                            </>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
          )}

          {/* MEDICAL TAB */}
          {activeTab === 'medical' && (
              <div>
                 <h3 className="font-bold text-gray-900 mb-4">Health Records</h3>
                 {medical.length === 0 ? (
                     <p className="text-gray-500 italic">No medical records.</p>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500">
                            <thead className="bg-gray-50 text-gray-900 font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Medication</th>
                                    <th className="px-4 py-3">Dosage</th>
                                    <th className="px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {medical.map(m => (
                                    <tr key={m.id}>
                                        <td className="px-4 py-3">{m.date}</td>
                                        <td className="px-4 py-3">{m.type}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{m.medicationName}</td>
                                        <td className="px-4 py-3">{m.dosage || '-'}</td>
                                        <td className="px-4 py-3 truncate max-w-xs">{m.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 )}
              </div>
          )}
          
          {/* BREEDING TAB */}
          {activeTab === 'breeding' && (
              <div className="space-y-8">
                  {/* Litters */}
                  <div>
                      <h3 className="font-bold text-gray-900 mb-4">Litters / Matings</h3>
                      {litters.length === 0 ? (
                          <p className="text-gray-500 italic">No breeding records.</p>
                      ) : (
                          <div className="grid gap-3">
                              {litters.map(l => (
                                  <div key={l.id} className="p-4 border rounded-lg flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-gray-800">
                                              Mated with {rabbit.sex === 'Female' ? l.sireId : l.doeId}
                                          </div>
                                          <div className="text-sm text-gray-500">{l.dateOfCrossing}</div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                                              l.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                          }`}>
                                              {l.status}
                                          </span>
                                          {l.actualDeliveryDate && (
                                              <div className="text-xs text-gray-500 mt-1">Delivered: {l.actualDeliveryDate}</div>
                                          )}
                                          {l.kitsBorn !== undefined && (
                                              <div className="text-xs text-blue-600 font-medium mt-1">
                                                  Born: {l.kitsBorn} | Live: {l.kitsLive}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  
                  {/* Offspring */}
                  <div>
                      <h3 className="font-bold text-gray-900 mb-4">Direct Offspring</h3>
                      {offspring.length === 0 ? (
                          <p className="text-gray-500 italic">No offspring recorded.</p>
                      ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {offspring.map(k => (
                                  <div key={k.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                                      <div className="font-bold text-farm-700">{k.tag}</div>
                                      <div className="text-xs text-gray-500">{k.sex} • {getFormattedAge(k.dateOfBirth)}</div>
                                      <div className={`mt-1 text-[10px] px-2 py-0.5 rounded-full inline-block ${
                                          k.status === 'Alive' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                      }`}>
                                          {k.status}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>

      <WeightModal
         isOpen={isWeightModalOpen}
         onClose={() => setIsWeightModalOpen(false)}
         onSuccess={loadData}
         rabbit={rabbit}
      />
    </div>
  );
};

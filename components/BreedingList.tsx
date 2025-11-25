import React, { useState, useEffect } from 'react';
import { Plus, Activity, Calendar, CheckCircle2, XCircle, Baby, Loader2 } from 'lucide-react';
import { Crossing, CrossingStatus } from '../types';
import { FarmService } from '../services/farmService';
import { CrossingFormModal } from './CrossingFormModal';
import { DeliveryFormModal } from './DeliveryFormModal';

export const BreedingList: React.FC = () => {
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCrossingModalOpen, setIsCrossingModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedCrossing, setSelectedCrossing] = useState<Crossing | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await FarmService.getCrossings();
      setCrossings(data);
    } catch (error) {
      console.error("Failed to load crossings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePalpation = async (crossing: Crossing, result: 'Positive' | 'Negative') => {
    if (!confirm(`Mark palpation as ${result} for Doe ${crossing.doeId}?`)) return;
    
    const newStatus = result === 'Positive' ? CrossingStatus.Pregnant : CrossingStatus.Failed;
    try {
      await FarmService.updateCrossingStatus(crossing.id!, newStatus, result);
      fetchData();
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleDelivery = (crossing: Crossing) => {
    setSelectedCrossing(crossing);
    setIsDeliveryModalOpen(true);
  };

  const getStatusBadge = (status: CrossingStatus) => {
    switch (status) {
      case CrossingStatus.Pending: return 'bg-yellow-100 text-yellow-800';
      case CrossingStatus.Pregnant: return 'bg-purple-100 text-purple-800';
      case CrossingStatus.Delivered: return 'bg-green-100 text-green-800';
      case CrossingStatus.Failed: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Breeding Program</h2>
          <p className="text-gray-500 text-sm">Track matings, pregnancies, and deliveries.</p>
        </div>
        <button 
          onClick={() => setIsCrossingModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors"
        >
          <Plus size={16} />
          Record Mating
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading records...</p>
          </div>
        ) : crossings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Activity size={48} className="mb-2 opacity-20" />
            <p>No active breeding records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Doe & Sire</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Mating Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Expected Dates</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {crossings.map((cross) => (
                  <tr key={cross.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        <span className="text-pink-600 font-bold">♀ {cross.doeName || cross.doeId}</span>
                        <span className="text-gray-300">x</span>
                        <span className="text-blue-600 font-bold">♂ {cross.sireName || cross.sireId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {cross.dateOfCrossing}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="text-gray-400">Palpate:</span> {cross.expectedPalpationDate}
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-400">Deliver:</span> <span className="font-medium text-gray-700">{cross.expectedDeliveryDate}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(cross.status)}`}>
                        {cross.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {cross.status === CrossingStatus.Pending && (
                          <>
                            <button 
                              onClick={() => handlePalpation(cross, 'Positive')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded border border-green-200"
                              title="Confirm Pregnancy"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button 
                              onClick={() => handlePalpation(cross, 'Negative')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                              title="Mark Failed"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {cross.status === CrossingStatus.Pregnant && (
                           <button 
                             onClick={() => handleDelivery(cross)}
                             className="flex items-center gap-1 px-3 py-1.5 bg-farm-600 text-white text-xs font-medium rounded hover:bg-farm-700 shadow-sm"
                           >
                             <Baby size={14} /> Record Delivery
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CrossingFormModal 
        isOpen={isCrossingModalOpen}
        onClose={() => setIsCrossingModalOpen(false)}
        onSuccess={fetchData}
      />
      
      {selectedCrossing && (
        <DeliveryFormModal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          onSuccess={fetchData}
          crossing={selectedCrossing}
        />
      )}
    </div>
  );
};
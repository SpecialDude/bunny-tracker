
import React, { useState, useEffect } from 'react';
import { Plus, Activity, Calendar, CheckCircle2, XCircle, Baby, Loader2, Edit, ListPlus, RotateCw, Search, Filter } from 'lucide-react';
import { Crossing, CrossingStatus } from '../types';
import { FarmService } from '../services/farmService';
import { CrossingFormModal } from './CrossingFormModal';
import { DeliveryFormModal } from './DeliveryFormModal';
import { RabbitFormModal } from './RabbitFormModal';
import { useAlert } from '../contexts/AlertContext';
import { TablePagination } from './TablePagination';

export const BreedingList: React.FC = () => {
  const { showToast, showConfirm } = useAlert();
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCrossingModalOpen, setIsCrossingModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isRabbitModalOpen, setIsRabbitModalOpen] = useState(false); // For "Create Records"
  const [selectedCrossing, setSelectedCrossing] = useState<Crossing | undefined>(undefined);

  // Pagination & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CrossingStatus | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await FarmService.getCrossings();
      setCrossings(data);
    } catch (error) {
      console.error("Failed to load crossings", error);
      showToast("Failed to load breeding records", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Logic
  const processedCrossings = React.useMemo(() => {
    return crossings.filter(c => {
        const matchesSearch = 
            (c.doeName || c.doeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.sireName || c.sireId || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || c.status === filterStatus;
        return matchesSearch && matchesFilter;
    });
  }, [crossings, searchTerm, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(processedCrossings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCrossings = processedCrossings.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, itemsPerPage]);

  const handlePalpation = async (crossing: Crossing, result: 'Positive' | 'Negative') => {
    const confirmed = await showConfirm({
      title: 'Confirm Palpation Result',
      message: `Mark palpation as ${result} for Doe ${crossing.doeId}?`,
      confirmText: 'Confirm',
      variant: result === 'Negative' ? 'danger' : 'primary'
    });

    if (!confirmed) return;
    
    const newStatus = result === 'Positive' ? CrossingStatus.Pregnant : CrossingStatus.Failed;
    try {
      await FarmService.updateCrossingStatus(crossing.id!, newStatus, result);
      showToast(`Pregnancy marked as ${result}`, 'success');
      fetchData();
    } catch (e) {
      showToast("Failed to update status", 'error');
    }
  };

  const handleDelivery = (crossing: Crossing) => {
    setSelectedCrossing(crossing);
    setIsDeliveryModalOpen(true);
  };

  // When "Create Rabbit Records" is clicked
  const handleCreateRecords = (crossing: Crossing) => {
      setSelectedCrossing(crossing);
      setIsRabbitModalOpen(true);
  };

  const handleSyncHutches = async () => {
    const confirmed = await showConfirm({
      title: 'Sync Historical Hutch Labels',
      message: 'This will attempt to backfill missing hutch labels for existing records using the rabbits\' current locations. Continue?',
      confirmText: 'Sync Now'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await FarmService.syncHistoricalHutchLabels();
      showToast(`Successfully synced ${result.updated} records.`, 'success');
      fetchData();
    } catch (e) {
      console.error(e);
      showToast("Failed to sync records", 'error');
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-3">
            <button 
              onClick={handleSyncHutches}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              title="Backfill missing hutch labels for existing records"
            >
              <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
              Sync Hutch Labels
            </button>
            <button 
              onClick={() => setIsCrossingModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors"
            >
              <Plus size={16} />
              Record Mating
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Rabbit Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-farm-500"
            >
              <option value="All">All Status</option>
              {Object.values(CrossingStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading records...</p>
          </div>
        ) : processedCrossings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Activity size={48} className="mb-2 opacity-20" />
            <p>No breeding records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedCrossings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
              startIndex={startIndex}
              endIndex={startIndex + itemsPerPage}
              label="records"
              totalCount={crossings.length}
              className="bg-gray-50/50 border-b border-gray-100"
            />
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Doe & Buck</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Mating Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Dates / Stats</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCrossings.map((cross) => (
                  <tr key={cross.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-600 font-bold">♀ {cross.doeName || cross.doeId}</span>
                          {cross.doeHutchLabel && <span className="text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-100">{cross.doeHutchLabel}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-bold">♂ {cross.sireName || cross.sireId}</span>
                          {cross.sireHutchLabel && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{cross.sireHutchLabel}</span>}
                        </div>
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
                        {cross.status === CrossingStatus.Delivered ? (
                            <>
                                <div className="text-xs">
                                    <span className="text-gray-400">Delivered:</span> <span className="font-medium text-gray-800">{cross.actualDeliveryDate}</span>
                                </div>
                                {(cross.kitsLive !== undefined) && (
                                    <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit">
                                        {cross.kitsLive} Live / {cross.kitsBorn} Born
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-xs">
                                    <span className="text-gray-400">Palpate:</span> {cross.expectedPalpationDate}
                                </div>
                                <div className="text-xs">
                                    <span className="text-gray-400">Deliver:</span> <span className="font-medium text-gray-700">{cross.expectedDeliveryDate}</span>
                                </div>
                            </>
                        )}
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
                        {cross.status === CrossingStatus.Delivered && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDelivery(cross)}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded border border-gray-200"
                                    title="Edit Delivery Details"
                                >
                                    <Edit size={16} />
                                </button>
                                {cross.isRecordsCreated ? (
                                    <button
                                        onClick={() => handleCreateRecords(cross)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded border border-gray-200 hover:bg-gray-50"
                                        title="Records already created. Click to re-create or manage."
                                    >
                                        <RotateCw size={14} /> Re-create Records
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleCreateRecords(cross)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 shadow-sm"
                                        title="Create Rabbit Records for Kits"
                                    >
                                        <ListPlus size={14} /> Create Records
                                    </button>
                                )}
                            </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedCrossings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
              startIndex={startIndex}
              endIndex={startIndex + itemsPerPage}
              label="records"
              totalCount={crossings.length}
              className="border-t border-gray-100"
            />
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

      {/* Re-use Rabbit Modal for adding kits */}
      <RabbitFormModal
         isOpen={isRabbitModalOpen}
         onClose={() => setIsRabbitModalOpen(false)}
         onSuccess={fetchData}
         initialLitterId={selectedCrossing?.id}
      />
    </div>
  );
};

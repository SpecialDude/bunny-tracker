import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Loader2, Rabbit as RabbitIcon, Skull, Stethoscope, ArrowRightLeft, Eye, Scale, ChevronUp, ChevronDown } from 'lucide-react';
import { Rabbit, RabbitStatus } from '../types';
import { FarmService } from '../services/farmService';
import { RabbitFormModal } from './RabbitFormModal';
import { MortalityModal } from './MortalityModal';
import { MedicalModal } from './MedicalModal';
import { MoveRabbitModal } from './MoveRabbitModal';
import { RabbitDetail } from './RabbitDetail';
import { WeightModal } from './WeightModal';
import { TablePagination } from './TablePagination';

interface Props {
    // Optional prop if we want to handle view switching internally or via parent
}

type SortField = 'tag' | 'name' | 'dateOfBirth' | 'breed' | 'status' | 'currentHutchId';
type SortDirection = 'asc' | 'desc';

export const RabbitList: React.FC<Props> = () => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [detailId, setDetailId] = useState<string | null>(null);

  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const ACTIVE_STATUSES = [RabbitStatus.Alive, RabbitStatus.Pregnant, RabbitStatus.Weaned];
  const INACTIVE_STATUSES = [RabbitStatus.Sold, RabbitStatus.Dead, RabbitStatus.Slaughtered];

  const [filterStatus, setFilterStatus] = useState<string>('Active');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('tag');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [selectedRabbit, setSelectedRabbit] = useState<Rabbit | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await FarmService.getRabbits();
      setRabbits(data);
    } catch (error) {
      console.error("Failed to load rabbits", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]); // Refresh when coming back from detail view

  // Reset pagination when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortField, sortDirection, itemsPerPage]);

  const handleAdd = () => {
    setSelectedRabbit(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsModalOpen(true);
  };

  const handleMortality = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsMortalityModalOpen(true);
  };

  const handleMedical = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsMedicalModalOpen(true);
  };

  const handleMove = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsMoveModalOpen(true);
  };

  const handleWeight = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsWeightModalOpen(true);
  };

  const handleViewDetail = (rabbit: Rabbit) => {
      setDetailId(rabbit.id!);
      setViewMode('detail');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const statusPriority: Record<string, number> = {
    [RabbitStatus.Pregnant]: 1,
    [RabbitStatus.Alive]: 2,
    [RabbitStatus.Weaned]: 3,
    [RabbitStatus.Sold]: 4,
    [RabbitStatus.Dead]: 5,
    [RabbitStatus.Slaughtered]: 6,
  };

  const getStatusColor = (status: RabbitStatus) => {
    switch(status) {
      case RabbitStatus.Pregnant: return 'bg-pink-100 text-pink-800 border-pink-200';
      case RabbitStatus.Alive: return 'bg-green-100 text-green-800 border-green-200';
      case RabbitStatus.Weaned: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case RabbitStatus.Dead: return 'bg-gray-100 text-gray-800 border-gray-200';
      case RabbitStatus.Slaughtered: return 'bg-red-100 text-red-800 border-red-200';
      case RabbitStatus.Sold: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormattedAge = (dob?: string) => {
      if (!dob) return '-';
      const diff = new Date().getTime() - new Date(dob).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days < 35) return `${days} days`;
      if (days < 90) return `${Math.floor(days / 7)} weeks`;
      return `${Math.floor(days / 30)} months`;
  };

  // Filter & Sort Logic
  const processedRabbits = useMemo(() => {
    let result = rabbits.filter(r => {
      const matchesSearch = 
        r.tag.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.breed.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter: boolean;
      if (filterStatus === 'All') {
        matchesFilter = true;
      } else if (filterStatus === 'Active') {
        matchesFilter = ACTIVE_STATUSES.includes(r.status as RabbitStatus);
      } else {
        matchesFilter = r.status === filterStatus;
      }

      return matchesSearch && matchesFilter;
    });

    // Apply Sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'tag':
          comparison = a.tag.localeCompare(b.tag, undefined, { numeric: true });
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'breed':
          comparison = a.breed.localeCompare(b.breed);
          break;
        case 'status':
          comparison = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
          break;
        case 'currentHutchId':
          comparison = (a.currentHutchId || '').localeCompare(b.currentHutchId || '');
          break;
        case 'dateOfBirth':
          // For age, we sort by DOB. Ascending DOB means older rabbits first.
          // If we want "Age" column to sort by age, asc direction should show youngest first?
          // Usually people expect "Age" ASC to be smallest number first.
          // Smallest number means latest DOB.
          comparison = new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [rabbits, searchTerm, filterStatus, sortField, sortDirection]);

  // Pagination Logic
  const totalPages = Math.ceil(processedRabbits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRabbits = processedRabbits.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const SortableHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <th 
      className="px-6 py-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors group"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronUp size={12} className={sortField === field && sortDirection === 'asc' ? 'text-farm-600 opacity-100' : 'text-gray-300'} />
          <ChevronDown size={12} className={sortField === field && sortDirection === 'desc' ? 'text-farm-600 opacity-100' : 'text-gray-300'} />
        </div>
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp size={14} className="text-farm-600" /> : <ChevronDown size={14} className="text-farm-600" />
        )}
      </div>
    </th>
  );

  if (viewMode === 'detail' && detailId) {
      return <RabbitDetail rabbitId={detailId} onBack={() => setViewMode('list')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rabbits</h2>
          <p className="text-gray-500 text-sm">Manage your livestock inventory.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors"
        >
          <Plus size={16} />
          Add Rabbit
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Tag, Name, or Breed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-farm-500"
            >
              <option value="Active">Active Only</option>
              <option value="All">All Status</option>
              {Object.values(RabbitStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </div>
          {/* Show inactive count hint when on Active filter */}
          {filterStatus === 'Active' && (() => {
            const inactiveCount = rabbits.filter(r => INACTIVE_STATUSES.includes(r.status as RabbitStatus)).length;
            return inactiveCount > 0 ? (
              <button
                onClick={() => setFilterStatus('All')}
                className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap underline underline-offset-2"
                title="Show all rabbits including inactive"
              >
                +{inactiveCount} inactive hidden
              </button>
            ) : null;
          })()}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading rabbits...</p>
          </div>
        ) : processedRabbits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RabbitIcon size={48} className="mb-2 opacity-20" />
            <p>No rabbits found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedRabbits.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
              startIndex={startIndex}
              endIndex={startIndex + itemsPerPage}
              label="rabbits"
              totalCount={rabbits.length}
              className="bg-gray-50/50 border-b border-gray-100"
            />
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortableHeader field="tag" label="Tag ID" />
                  <SortableHeader field="breed" label="Breed" />
                  <th className="px-6 py-4 font-semibold text-gray-900">Sex</th>
                  <SortableHeader field="status" label="Status" />
                  <SortableHeader field="currentHutchId" label="Location" />
                  <SortableHeader field="dateOfBirth" label="Age" />
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRabbits.map((rabbit) => {
                  const isInactive = INACTIVE_STATUSES.includes(rabbit.status as RabbitStatus);
                  return (
                  <tr key={rabbit.id} className={`transition-colors ${isInactive ? 'bg-gray-50/60 opacity-60 hover:opacity-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rabbit.tag}</div>
                      {rabbit.name && <div className="text-xs text-gray-400">{rabbit.name}</div>}
                    </td>
                    <td className="px-6 py-4">{rabbit.breed}</td>
                    <td className="px-6 py-4">{rabbit.sex}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(rabbit.status)}`}>
                        {rabbit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {rabbit.currentHutchId || <span className="text-gray-300 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {getFormattedAge(rabbit.dateOfBirth)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleViewDetail(rabbit)}
                          className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600"
                          title="View Profile"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleWeight(rabbit)}
                          className="p-1.5 hover:bg-green-50 rounded text-gray-400 hover:text-green-600"
                          title="Record Weight"
                        >
                          <Scale size={18} />
                        </button>
                        <button 
                          onClick={() => handleMove(rabbit)}
                          className="p-1.5 hover:bg-orange-50 rounded text-gray-400 hover:text-orange-600"
                          title="Move Rabbit"
                          disabled={!['Alive', 'Pregnant', 'Weaned'].includes(rabbit.status)}
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                        <button 
                          onClick={() => handleMedical(rabbit)}
                          className="p-1.5 hover:bg-pink-50 rounded text-gray-400 hover:text-pink-600"
                          title="Medical Records"
                        >
                          <Stethoscope size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(rabbit)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {['Alive', 'Weaned', 'Pregnant'].includes(rabbit.status) && (
                          <button 
                            onClick={() => handleMortality(rabbit)}
                            className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                            title="Record Death/Slaughter"
                          >
                            <Skull size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {processedRabbits.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedRabbits.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
            startIndex={startIndex}
            endIndex={startIndex + itemsPerPage}
            label="rabbits"
            totalCount={rabbits.length}
            className="border-t border-gray-100"
          />
        )}
      </div>

      <RabbitFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedRabbit}
      />

      {selectedRabbit && (
        <>
          <MortalityModal 
            isOpen={isMortalityModalOpen}
            onClose={() => setIsMortalityModalOpen(false)}
            onSuccess={fetchData}
            rabbit={selectedRabbit}
          />
          <MedicalModal
            isOpen={isMedicalModalOpen}
            onClose={() => setIsMedicalModalOpen(false)}
            rabbit={selectedRabbit}
          />
          <MoveRabbitModal
            isOpen={isMoveModalOpen}
            onClose={() => setIsMoveModalOpen(false)}
            onSuccess={fetchData}
            rabbit={selectedRabbit}
          />
          <WeightModal
             isOpen={isWeightModalOpen}
             onClose={() => setIsWeightModalOpen(false)}
             onSuccess={fetchData}
             rabbit={selectedRabbit}
          />
        </>
      )}
    </div>
  );
};
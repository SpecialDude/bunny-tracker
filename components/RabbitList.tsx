import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Loader2, Rabbit as RabbitIcon } from 'lucide-react';
import { Rabbit, RabbitStatus, Sex } from '../types';
import { FarmService } from '../services/farmService';
import { RabbitFormModal } from './RabbitFormModal';

export const RabbitList: React.FC = () => {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  }, []);

  const handleAdd = () => {
    setSelectedRabbit(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (rabbit: Rabbit) => {
    setSelectedRabbit(rabbit);
    setIsModalOpen(true);
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

  const filteredRabbits = rabbits.filter(r => {
    const matchesSearch = 
      r.tag.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'All' || r.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

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
            placeholder="Search by Tag, Breed, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-farm-500"
            >
              <option value="All">All Status</option>
              {Object.values(RabbitStatus).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Loading rabbits...</p>
          </div>
        ) : filteredRabbits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RabbitIcon size={48} className="mb-2 opacity-20" />
            <p>No rabbits found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Tag ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Breed</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Sex</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Location</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Age</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRabbits.map((rabbit) => (
                  <tr key={rabbit.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-6 py-4">
                      {/* Simple Age Calc */}
                      {rabbit.dateOfBirth ? (
                         Math.floor((new Date().getTime() - new Date(rabbit.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 30)) + ' mo'
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(rabbit)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredRabbits.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
            <span>Showing {filteredRabbits.length} of {rabbits.length} rabbits</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Prev</button>
              <button className="px-3 py-1 border rounded hover:bg-gray-50" disabled>Next</button>
            </div>
          </div>
        )}
      </div>

      <RabbitFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedRabbit}
      />
    </div>
  );
};
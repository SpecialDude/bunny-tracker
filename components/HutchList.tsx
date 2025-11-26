import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Warehouse, Edit2, AlertCircle, Trash2 } from 'lucide-react';
import { Hutch } from '../types';
import { FarmService } from '../services/farmService';
import { HutchFormModal } from './HutchFormModal';

export const HutchList: React.FC = () => {
  const [hutches, setHutches] = useState<Hutch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Available' | 'Full'>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHutch, setSelectedHutch] = useState<Hutch | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await FarmService.getHutches();
      setHutches(data);
    } catch (error) {
      console.error("Failed to load hutches", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setSelectedHutch(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (hutch: Hutch) => {
    setSelectedHutch(hutch);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, occupancy: number) => {
    if (occupancy > 0) {
      alert("Cannot delete a hutch that currently contains rabbits. Please move them first.");
      return;
    }
    if (!confirm("Are you sure you want to delete this hutch?")) return;

    try {
      await FarmService.deleteHutch(id);
      fetchData(); // Refresh
    } catch (e: any) {
      alert("Error deleting hutch: " + e.message);
    }
  };

  // Filter Logic
  const filteredHutches = hutches.filter(h => {
    const matchesSearch = 
      h.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.hutchId.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filter === 'Available') matchesFilter = h.currentOccupancy < h.capacity;
    if (filter === 'Full') matchesFilter = h.currentOccupancy >= h.capacity;

    return matchesSearch && matchesFilter;
  });

  // Calculate Progress Color
  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hutches</h2>
          <p className="text-gray-500 text-sm">Manage housing, accessories, and occupancy.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors"
        >
          <Plus size={16} />
          Add Hutch
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Label or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
           <div className="relative">
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-farm-500"
            >
              <option value="All">All Hutches</option>
              <option value="Available">Available</option>
              <option value="Full">Full</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Warehouse className="animate-pulse mb-2" size={32} />
          <p>Loading housing...</p>
        </div>
      ) : filteredHutches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <AlertCircle size={48} className="mb-2 opacity-20" />
          <p>No hutches found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHutches.map(hutch => (
            <div key={hutch.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow relative group">
              
              {/* Top Row: ID and Edit */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{hutch.label}</h3>
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {hutch.hutchId}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(hutch)}
                    className="p-1.5 text-gray-400 hover:text-farm-600 hover:bg-farm-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(hutch.id!, hutch.currentOccupancy)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Occupancy Bar */}
              <div className="mt-4 mb-2">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-gray-600">Occupancy</span>
                  <span className={hutch.currentOccupancy >= hutch.capacity ? 'text-red-600' : 'text-gray-600'}>
                    {hutch.currentOccupancy} / {hutch.capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getProgressColor(hutch.currentOccupancy, hutch.capacity)}`} 
                    style={{ width: `${Math.min((hutch.currentOccupancy / hutch.capacity) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Accessories Tags */}
              <div className="mt-4 flex flex-wrap gap-1">
                {hutch.accessories?.length > 0 ? (
                  hutch.accessories.slice(0, 3).map(acc => (
                    <span key={acc} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-full">
                      {acc}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400 italic">No accessories</span>
                )}
                {hutch.accessories?.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-gray-400">+{hutch.accessories.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <HutchFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedHutch}
      />
    </div>
  );
};
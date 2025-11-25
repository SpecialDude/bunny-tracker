import React, { useState } from 'react';
import { Search, Filter, Plus, MoreHorizontal } from 'lucide-react';
import { Rabbit, RabbitStatus, Sex } from '../types';

export const RabbitList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Data
  const rabbits: Rabbit[] = [
    {
      rabbitId: '1', tag: 'SN-REX-001', breed: 'Rex', sex: Sex.Female, 
      status: RabbitStatus.Pregnant, currentHutchId: 'H-01', 
      dateOfBirth: '2023-01-15', notes: 'Excellent mother', 
      farmId: 'F1', parentage: {}
    },
    {
      rabbitId: '2', tag: 'SN-NZW-042', breed: 'New Zealand', sex: Sex.Male, 
      status: RabbitStatus.Alive, currentHutchId: 'H-04', 
      dateOfBirth: '2023-03-10', notes: 'High growth rate', 
      farmId: 'F1', parentage: {}
    },
    {
      rabbitId: '3', tag: 'SN-REX-005', breed: 'Rex', sex: Sex.Female, 
      status: RabbitStatus.Weaned, currentHutchId: 'H-02', 
      dateOfBirth: '2023-08-01', notes: '', 
      farmId: 'F1', parentage: {}
    },
  ];

  const getStatusColor = (status: RabbitStatus) => {
    switch(status) {
      case RabbitStatus.Pregnant: return 'bg-pink-100 text-pink-800 border-pink-200';
      case RabbitStatus.Alive: return 'bg-green-100 text-green-800 border-green-200';
      case RabbitStatus.Weaned: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case RabbitStatus.Dead: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rabbits</h2>
          <p className="text-gray-500 text-sm">Manage your livestock inventory.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700 shadow-sm transition-colors">
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">
            <Filter size={16} />
            Filters
          </button>
          <select className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-farm-500">
            <option>All Status</option>
            <option>Pregnant</option>
            <option>Weaned</option>
            <option>Alive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
              {rabbits.map((rabbit) => (
                <tr key={rabbit.rabbitId} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-6 py-4 text-gray-900">{rabbit.currentHutchId}</td>
                  <td className="px-6 py-4">8 mo</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
          <span>Showing 3 of 142 rabbits</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>Prev</button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

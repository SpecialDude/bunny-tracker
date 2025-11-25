import React from 'react';
import { 
  Users, AlertCircle, TrendingUp, TrendingDown, 
  Baby, DollarSign, Activity 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

export const Dashboard: React.FC = () => {
  // Mock Data
  const kpiData = [
    { title: 'Total Rabbits', value: '142', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Active Pregnancies', value: '8', change: 'Due soon: 2', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50' },
    { title: 'Monthly Revenue', value: '$2,450', change: '+18%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Occupancy Rate', value: '78%', change: 'Hutches: 24/30', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const breedData = [
    { name: 'Rex', value: 45 },
    { name: 'NZ White', value: 55 },
    { name: 'Flemish', value: 20 },
    { name: 'Dutch', value: 22 },
  ];

  const financeData = [
    { name: 'Jan', income: 1200, expense: 800 },
    { name: 'Feb', income: 1900, expense: 1200 },
    { name: 'Mar', income: 2400, expense: 1100 },
    { name: 'Apr', income: 2100, expense: 1400 },
    { name: 'May', income: 2800, expense: 1000 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farm Overview</h2>
          <p className="text-gray-500 text-sm">Welcome back, here's what's happening at Sunny Rabbits.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Download Report
          </button>
          <button className="px-4 py-2 bg-farm-600 text-white rounded-lg text-sm font-medium hover:bg-farm-700">
            Add Transaction
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{kpi.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{kpi.change}</span>
              <span className="text-gray-400 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Income vs Expenses</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breed Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Breed Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {breedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {breedData.map((entry, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-gray-600">{entry.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Events (Notifications) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Upcoming Tasks</h3>
          <button className="text-sm text-farm-600 font-medium hover:text-farm-700">View All</button>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { title: 'Weaning Due: Litter L-24', date: 'Today', type: 'Urgent', color: 'text-red-600 bg-red-50' },
            { title: 'Palpation: Doe D-05', date: 'Tomorrow', type: 'Normal', color: 'text-blue-600 bg-blue-50' },
            { title: 'Vaccination Round', date: 'Oct 24', type: 'Scheduled', color: 'text-purple-600 bg-purple-50' },
          ].map((task, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${task.type === 'Urgent' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <span className="text-gray-700 font-medium">{task.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{task.date}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${task.color}`}>
                  {task.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

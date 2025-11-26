import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, TrendingDown, 
  Baby, Activity, Loader2, Plus, Warehouse, Rabbit as RabbitIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { FarmService } from '../services/farmService';
import { Rabbit, Hutch, Transaction, Crossing, TransactionType, RabbitStatus, CrossingStatus } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [hutches, setHutches] = useState<Hutch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);

  // Derived State (Charts & KPIs)
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [financeChartData, setFinanceChartData] = useState<any[]>([]);
  const [breedChartData, setBreedChartData] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [rabbitsData, hutchesData, txnsData, crossingsData] = await Promise.all([
        FarmService.getRabbits(),
        FarmService.getHutches(),
        FarmService.getTransactions(),
        FarmService.getCrossings()
      ]);

      setRabbits(rabbitsData);
      setHutches(hutchesData);
      setTransactions(txnsData);
      setCrossings(crossingsData);

      calculateKPIs(rabbitsData, hutchesData, txnsData);
      prepareCharts(rabbitsData, txnsData);
      prepareTasks(crossingsData);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (rList: Rabbit[], hList: Hutch[], tList: Transaction[]) => {
    // 1. Total Rabbits
    const totalRabbits = rList.filter(r => r.status !== RabbitStatus.Dead && r.status !== RabbitStatus.Slaughtered && r.status !== RabbitStatus.Sold).length;
    
    // 2. Active Pregnancies
    const pregnantCount = rList.filter(r => r.status === RabbitStatus.Pregnant).length;

    // 3. Monthly Revenue (Current Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyIncome = tList
      .filter(t => {
        const d = new Date(t.date);
        return t.type === TransactionType.Income && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // 4. Occupancy Rate
    const totalCapacity = hList.reduce((sum, h) => sum + h.capacity, 0);
    const totalOccupancy = hList.reduce((sum, h) => sum + h.currentOccupancy, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    setKpiData([
      { title: 'Total Rabbits', value: totalRabbits.toString(), subtext: 'Active Livestock', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Active Pregnancies', value: pregnantCount.toString(), subtext: 'Does Expecting', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50' },
      { title: 'Revenue (This Month)', value: `$${monthlyIncome.toLocaleString()}`, subtext: 'Total Income', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { title: 'Occupancy Rate', value: `${occupancyRate}%`, subtext: `${totalOccupancy}/${totalCapacity} Spaces`, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    ]);
  };

  const prepareCharts = (rList: Rabbit[], tList: Transaction[]) => {
    // --- Breed Distribution ---
    const breeds: Record<string, number> = {};
    rList.forEach(r => {
      if (['Alive', 'Pregnant', 'Weaned'].includes(r.status)) {
        breeds[r.breed] = (breeds[r.breed] || 0) + 1;
      }
    });
    
    const bData = Object.keys(breeds).map(b => ({ name: b, value: breeds[b] }));
    setBreedChartData(bData);

    // --- Financials (Last 6 Months) ---
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push({
        name: monthNames[d.getMonth()],
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        income: 0,
        expense: 0
      });
    }

    tList.forEach(t => {
      const tDate = new Date(t.date);
      const match = last6Months.find(m => m.monthIndex === tDate.getMonth() && m.year === tDate.getFullYear());
      if (match) {
        if (t.type === TransactionType.Income) match.income += t.amount;
        else match.expense += t.amount;
      }
    });

    setFinanceChartData(last6Months);
  };

  const prepareTasks = (cList: Crossing[]) => {
    const tasks = [];
    const today = new Date();
    const threeDaysOut = new Date();
    threeDaysOut.setDate(today.getDate() + 3);

    // Filter active crossings
    cList.forEach(c => {
      if (c.status === CrossingStatus.Pregnant) {
        const deliveryDate = new Date(c.expectedDeliveryDate);
        if (deliveryDate <= threeDaysOut) {
           tasks.push({
             title: `Delivery Due: ${c.doeName || c.doeId}`,
             date: c.expectedDeliveryDate,
             type: 'Urgent',
             color: 'text-red-600 bg-red-50'
           });
        }
      } else if (c.status === CrossingStatus.Pending) {
         const palpDate = new Date(c.expectedPalpationDate);
         if (palpDate <= today) {
           tasks.push({
             title: `Palpation Check: ${c.doeName || c.doeId}`,
             date: c.expectedPalpationDate,
             type: 'Due',
             color: 'text-blue-600 bg-blue-50'
           });
         }
      }
    });

    // Sort by date
    tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setUpcomingTasks(tasks.slice(0, 5)); // Show top 5
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-farm-600 mb-4" size={40} />
        <p className="text-gray-500 font-medium">Analyzing farm data...</p>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (rabbits.length === 0 && hutches.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farm Overview</h2>
          <p className="text-gray-500 text-sm">Welcome to your new farm dashboard.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-farm-50 rounded-full flex items-center justify-center mb-6">
            <RabbitIcon size={48} className="text-farm-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Let's populate your farm</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            It looks like you haven't added any data yet. Start by creating housing for your rabbits, then add your livestock.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button 
               onClick={() => onNavigate('hutches')}
               className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 shadow-sm"
             >
               <Warehouse size={20} />
               Add First Hutch
             </button>
             <button 
               onClick={() => onNavigate('rabbits')}
               className="flex items-center justify-center gap-2 px-6 py-3 bg-farm-600 text-white font-medium rounded-xl hover:bg-farm-700 shadow-lg shadow-farm-200"
             >
               <Plus size={20} />
               Add First Rabbit
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farm Overview</h2>
          <p className="text-gray-500 text-sm">Real-time performance metrics.</p>
        </div>
        <div className="flex gap-2">
          {/* Action buttons could go here */}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
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
              <span className="text-gray-400">{kpi.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Income vs Expenses (6 Months)</h3>
          {financeChartData.every(d => d.income === 0 && d.expense === 0) ? (
             <div className="h-72 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                <TrendingUp size={32} className="mb-2 opacity-50"/>
                <p>No financial data yet</p>
             </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Breed Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Breed Distribution</h3>
          {breedChartData.length === 0 ? (
             <div className="h-72 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                <RabbitIcon size={32} className="mb-2 opacity-50"/>
                <p>No rabbits added</p>
             </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breedChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {breedChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks (Calculated from Real Data) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Upcoming Farm Tasks</h3>
        </div>
        
        {upcomingTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
             <p>No pending palpations or deliveries due in the next 3 days.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingTasks.map((task, i) => (
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
        )}
      </div>
    </div>
  );
};

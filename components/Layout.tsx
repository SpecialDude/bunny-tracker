import React, { useState } from 'react';
import { Menu, Home, Rabbit, Warehouse, Activity, DollarSign, Settings, LogOut, Bell } from 'lucide-react';
import { AIChat } from './AIChat';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { user, logout } = useAuth();
  const { farmName } = useFarm();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'rabbits', label: 'Rabbits', icon: Rabbit },
    { id: 'hutches', label: 'Hutches', icon: Warehouse },
    { id: 'breeding', label: 'Breeding', icon: Activity },
    { id: 'finances', label: 'Finances', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Helper to get initials
  const getInitials = () => {
    if (!user?.displayName) return 'U';
    return user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-xl font-bold text-farm-800 flex items-center gap-2 truncate" title={farmName}>
              <Rabbit className="text-farm-500 shrink-0" />
              <span className="truncate">{farmName}</span>
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${activePage === item.id 
                    ? 'bg-farm-50 text-farm-700 border border-farm-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-8">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-farm-100 border border-farm-200 flex items-center justify-center text-farm-700 font-bold text-sm overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.displayName || user?.email || 'Farmer'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Chatbot Overlay */}
      <AIChat />
    </div>
  );
};
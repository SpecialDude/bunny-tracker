import React, { useState } from 'react';
import { Rabbit, ArrowRight, Loader2, Globe, DollarSign, Type } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  onComplete: () => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      await FarmService.createFarm(formData);
      showToast("Welcome to BunnyTrack! Your farm is ready.", 'success');
      onComplete();
    } catch (error) {
      console.error("Setup failed", error);
      showToast("Failed to setup farm. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-farm-600 p-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Rabbit size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Welcome, {user?.displayName?.split(' ')[0] || 'Farmer'}!</h2>
          <p className="text-farm-100 mt-2">Let's set up your rabbitry for success.</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Type size={16} /> Farm Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none transition-all"
                placeholder="e.g. Sunny Acres Rabbitry"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign size={16} /> Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Globe size={16} /> Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={e => setFormData({...formData, timezone: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                >
                   <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                   <option value="UTC">UTC</option>
                   <option value="Africa/Lagos">Africa/Lagos</option>
                   <option value="America/New_York">America/New_York</option>
                   <option value="Europe/London">Europe/London</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-farm-600 hover:bg-farm-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Get Started <ArrowRight size={20} /></>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
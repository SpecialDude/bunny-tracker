import React, { useState, useEffect } from 'react';
import { Save, User, Settings as SettingsIcon, Database, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Farm } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'biological' | 'data'>('general');
  const [farmSettings, setFarmSettings] = useState<Farm | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await FarmService.getFarmSettings();
      setFarmSettings(data);
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmSettings) return;

    setSaving(true);
    try {
      await FarmService.updateFarmSettings(farmSettings);
      alert("Settings saved successfully.");
    } catch (error) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await FarmService.exportFarmData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bunnytrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to export data.");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-farm-600" /></div>;
  if (!farmSettings) return <div className="p-8 text-center text-red-500">Failed to load configuration.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm">Manage farm configuration and data.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'general' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={18} /> General
          </button>
          <button
            onClick={() => setActiveTab('biological')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'biological' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SettingsIcon size={18} /> Breeding Defaults
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'data' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database size={18} /> Data Management
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                  <input
                    type="text"
                    required
                    value={farmSettings.name}
                    onChange={(e) => setFarmSettings({ ...farmSettings, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email (Read-Only)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={farmSettings.currency}
                    onChange={(e) => setFarmSettings({ ...farmSettings, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                    placeholder="USD, NGN, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    value={farmSettings.timezone}
                    onChange={(e) => setFarmSettings({ ...farmSettings, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Lagos">West Africa Time (Lagos)</option>
                    <option value="America/New_York">Eastern Time (US)</option>
                    <option value="Europe/London">London</option>
                    {/* Add more as needed */}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'biological' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 mb-4">
                These settings control how the system calculates expected dates for pregnancy checks and delivery.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gestation Period (Days)</label>
                  <input
                    type="number"
                    min="28"
                    max="35"
                    value={farmSettings.defaultGestationDays}
                    onChange={(e) => setFarmSettings({ ...farmSettings, defaultGestationDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Average is 31 days.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Palpation Check (Days)</label>
                  <input
                    type="number"
                    min="10"
                    max="20"
                    value={farmSettings.defaultPalpationDays}
                    onChange={(e) => setFarmSettings({ ...farmSettings, defaultPalpationDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Days after mating to check pregnancy.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weaning Age (Days)</label>
                  <input
                    type="number"
                    min="28"
                    max="60"
                    value={farmSettings.defaultWeaningDays}
                    onChange={(e) => setFarmSettings({ ...farmSettings, defaultWeaningDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Age when kits are separated.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-farm-600 text-white rounded-lg font-medium hover:bg-farm-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Update Defaults
                </button>
              </div>
            </form>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Download size={18} className="text-blue-600" /> Export Data
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Download a full backup of your farm data (Rabbits, Hutches, Finance, etc.) as a JSON file.
                    </p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
                  >
                    Download Backup
                  </button>
                </div>
              </div>

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-red-700 flex items-center gap-2">
                      <AlertTriangle size={18} /> Danger Zone
                    </h4>
                    <p className="text-sm text-red-600 mt-1">
                      Resetting your account will permanently delete all rabbits, transactions, and records. This cannot be undone.
                    </p>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-400 cursor-not-allowed opacity-70"
                    title="Disabled for safety in this version"
                  >
                    Reset Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
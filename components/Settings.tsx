
import React, { useState, useEffect } from 'react';
import { Save, User, Settings as SettingsIcon, Database, Download, AlertTriangle, Loader2, List, Trash2, Plus } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Farm, Breed } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { showToast, showConfirm } = useAlert();
  const { refreshFarm } = useFarm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'biological' | 'breeds' | 'data'>('general');
  const [farmSettings, setFarmSettings] = useState<Farm | null>(null);

  // New Breed State
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedCode, setNewBreedCode] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await FarmService.getFarmSettings();
      setFarmSettings(data);
    } catch (error) {
      console.error("Failed to load settings", error);
      showToast("Failed to load farm settings", 'error');
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
      await refreshFarm(); // Update global context immediately
      showToast("Settings saved successfully", 'success');
    } catch (error) {
      showToast("Failed to save settings", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreedName || !newBreedCode || !farmSettings) return;

    if (newBreedCode.length < 2 || newBreedCode.length > 4) {
      showToast("Code must be 2-4 characters long", 'error');
      return;
    }

    const updatedBreeds = [...(farmSettings.breeds || []), { name: newBreedName, code: newBreedCode.toUpperCase() }];
    const updatedFarm = { ...farmSettings, breeds: updatedBreeds };
    
    setFarmSettings(updatedFarm);
    setNewBreedName('');
    setNewBreedCode('');

    // Auto-save for smooth UX
    try {
        await FarmService.updateFarmSettings(updatedFarm);
        await refreshFarm();
        showToast("Breed added", 'success');
    } catch {
        showToast("Failed to add breed", 'error');
    }
  };

  const handleDeleteBreed = async (code: string) => {
     const confirm = await showConfirm({
         title: 'Delete Breed',
         message: 'Are you sure? This will remove it from the selection list, but existing rabbits will stay unchanged.',
         variant: 'danger'
     });
     if (!confirm || !farmSettings) return;

     const updatedBreeds = farmSettings.breeds.filter(b => b.code !== code);
     const updatedFarm = { ...farmSettings, breeds: updatedBreeds };
     setFarmSettings(updatedFarm);

     try {
        await FarmService.updateFarmSettings(updatedFarm);
        await refreshFarm();
        showToast("Breed removed", 'success');
    } catch {
        showToast("Failed to remove breed", 'error');
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
      showToast("Farm data exported successfully", 'success');
    } catch (error) {
      showToast("Failed to export data", 'error');
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
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'general' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={18} /> General
          </button>
          <button
            onClick={() => setActiveTab('biological')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'biological' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SettingsIcon size={18} /> Breeding Defaults
          </button>
          <button
            onClick={() => setActiveTab('breeds')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'breeds' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={18} /> Breeds
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'data' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database size={18} /> Data
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={farmSettings.currency}
                    onChange={(e) => setFarmSettings({ ...farmSettings, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="NGN">NGN (₦)</option>
                  </select>
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

          {activeTab === 'breeds' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-fit">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Plus size={16}/> Add New Breed
                        </h4>
                        <form onSubmit={handleAddBreed} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Breed Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newBreedName}
                                    onChange={e => setNewBreedName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                                    placeholder="e.g. Flemish Giant"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Code (2-4 Letters)</label>
                                <input
                                    required
                                    type="text"
                                    maxLength={4}
                                    minLength={2}
                                    value={newBreedCode}
                                    onChange={e => setNewBreedCode(e.target.value.toUpperCase())}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none uppercase font-mono"
                                    placeholder="e.g. FLE"
                                />
                                <p className="text-xs text-gray-400 mt-1">Used for tag generation (e.g. SN-FLE-001)</p>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2 bg-farm-600 text-white rounded-lg font-medium text-sm hover:bg-farm-700"
                            >
                                Add Breed
                            </button>
                        </form>
                    </div>

                    {/* Breed List */}
                    <div className="md:col-span-2">
                        <h4 className="font-bold text-gray-800 mb-3">Managed Breeds</h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Code</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {farmSettings.breeds?.map((breed) => (
                                        <tr key={breed.code} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-900">{breed.name}</td>
                                            <td className="px-4 py-3 font-mono text-gray-600">{breed.code}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => handleDeleteBreed(breed.code)}
                                                    className="text-gray-400 hover:text-red-600 p-1"
                                                    title="Remove Breed"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!farmSettings.breeds || farmSettings.breeds.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                No breeds configured. Add one to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
             </div>
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

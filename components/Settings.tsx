import React, { useState, useEffect } from 'react';
import { Save, User, Settings as SettingsIcon, Database, Download, AlertTriangle, Loader2, List, Trash2, Plus, DollarSign, Lock, ShieldCheck, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Farm } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { useFarm } from '../contexts/FarmContext';
import JSZip from 'jszip';

export const Settings: React.FC = () => {
  const { user, updateUserPassword } = useAuth();
  const { showToast, showConfirm } = useAlert();
  const { refreshFarm } = useFarm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'biological' | 'breeds' | 'financials' | 'security' | 'data'>('general');
  const [farmSettings, setFarmSettings] = useState<Farm | null>(null);

  // New Breed State
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedCode, setNewBreedCode] = useState('');

  // New Category State
  const [newCategory, setNewCategory] = useState('');

  // Password State
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // Export State
  const [exportTables, setExportTables] = useState({
    rabbits: true,
    hutches: true,
    breeding: true,
    finances: true,
    medical: true,
    customers: true
  });
  const [isExportingCsv, setIsExportingCsv] = useState(false);

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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !farmSettings) return;

    const currentCats = farmSettings.transactionCategories || [];
    if (currentCats.includes(newCategory)) {
        showToast("Category already exists", 'error');
        return;
    }

    const updatedCats = [...currentCats, newCategory];
    const updatedFarm = { ...farmSettings, transactionCategories: updatedCats };

    setFarmSettings(updatedFarm);
    setNewCategory('');

    try {
        await FarmService.updateFarmSettings(updatedFarm);
        await refreshFarm();
        showToast("Category added", 'success');
    } catch {
        showToast("Failed to add category", 'error');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
      const confirm = await showConfirm({
         title: 'Delete Category',
         message: 'Are you sure? This will remove it from the selection list.',
         variant: 'danger'
     });
     if (!confirm || !farmSettings) return;

     const updatedCats = (farmSettings.transactionCategories || []).filter(c => c !== cat);
     const updatedFarm = { ...farmSettings, transactionCategories: updatedCats };
     setFarmSettings(updatedFarm);

     try {
        await FarmService.updateFarmSettings(updatedFarm);
        await refreshFarm();
        showToast("Category removed", 'success');
    } catch {
        showToast("Failed to remove category", 'error');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new.length < 6) {
      showToast("Password must be at least 6 characters", 'error');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      showToast("Passwords do not match", 'error');
      return;
    }

    setSaving(true);
    try {
      await updateUserPassword(passwordForm.new);
      showToast("Password updated successfully", 'success');
      setPasswordForm({ new: '', confirm: '' });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        showToast("Security Check: Please sign out and sign back in to change your password.", 'error');
      } else {
        showToast(error.message || "Failed to update password", 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = async () => {
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

  // --- CSV / Excel Export Logic ---
  
  const convertToCSV = (objArray: any[]) => {
    if (!objArray || objArray.length === 0) return '';
    const header = Object.keys(objArray[0]).join(',');
    let str = header + '\r\n';

    for (let i = 0; i < objArray.length; i++) {
        let line = '';
        for (const index in objArray[i]) {
            if (line !== '') line += ',';
            let item = objArray[i][index];
            if (item === null || item === undefined) {
                 item = '';
            } else if (typeof item === 'string') {
                item = item.replace(/"/g, '""'); // Escape double quotes
                if (item.includes(',') || item.includes('\n') || item.includes('"')) {
                    item = `"${item}"`; // Wrap in quotes if contains comma/newline
                }
            } else if (typeof item === 'object') {
                // Try to stringify simple objects, ignore complex ones or just mark
                item = JSON.stringify(item).replace(/"/g, '""');
                 if (item.includes(',')) item = `"${item}"`;
            }
            line += item;
        }
        str += line + '\r\n';
    }
    return str;
  };

  const handleExportCSV = async () => {
      const selectedKeys = Object.keys(exportTables).filter(k => exportTables[k as keyof typeof exportTables]);
      if (selectedKeys.length === 0) {
          showToast("Please select at least one data type to export.", 'error');
          return;
      }

      setIsExportingCsv(true);
      try {
          const zip = new JSZip();
          const dateStr = new Date().toISOString().split('T')[0];

          // 1. Fetch & Process Rabbits
          if (exportTables.rabbits) {
              const rabbits = await FarmService.getRabbits();
              const flatRabbits = rabbits.map(r => ({
                  ID: r.tag,
                  Name: r.name || '',
                  Breed: r.breed,
                  Sex: r.sex,
                  Status: r.status,
                  DOB: r.dateOfBirth || '',
                  Hutch: r.currentHutchId || '',
                  Father: r.parentage?.sireId || '',
                  Mother: r.parentage?.doeId || '',
                  Weight_KG: r.weight || 0,
                  Notes: r.notes || ''
              }));
              zip.file(`rabbits-${dateStr}.csv`, convertToCSV(flatRabbits));
          }

          // 2. Fetch & Process Hutches
          if (exportTables.hutches) {
              const hutches = await FarmService.getHutches();
              const flatHutches = hutches.map(h => ({
                  Label: h.label,
                  ID: h.hutchId,
                  Capacity: h.capacity,
                  Occupancy: h.currentOccupancy,
                  Accessories: h.accessories?.join('; ') || ''
              }));
              zip.file(`hutches-${dateStr}.csv`, convertToCSV(flatHutches));
          }

          // 3. Fetch & Process Finance
          if (exportTables.finances) {
              const txns = await FarmService.getTransactions();
              const flatTxns = txns.map(t => ({
                  Date: t.date,
                  Type: t.type,
                  Category: t.category,
                  Amount: t.amount,
                  Description: t.notes
              }));
              zip.file(`finances-${dateStr}.csv`, convertToCSV(flatTxns));
          }

          // 4. Fetch & Process Breeding
          if (exportTables.breeding) {
              const crossings = await FarmService.getCrossings();
              const flatCross = crossings.map(c => ({
                  Date: c.dateOfCrossing,
                  Doe: c.doeId,
                  Buck: c.sireId,
                  Status: c.status,
                  Expected_Deliver: c.expectedDeliveryDate,
                  Actual_Delivery: c.actualDeliveryDate || '',
                  Kits_Born: c.kitsBorn || 0,
                  Kits_Live: c.kitsLive || 0
              }));
              zip.file(`breeding-${dateStr}.csv`, convertToCSV(flatCross));
          }

          // 5. Medical
          if (exportTables.medical) {
              const medical = await FarmService.getMedicalRecords();
              const flatMed = medical.map(m => ({
                  Date: m.date,
                  Rabbit: m.rabbitId,
                  Type: m.type,
                  Medication: m.medicationName,
                  Dosage: m.dosage || '',
                  Cost: m.cost || 0,
                  Notes: m.notes || ''
              }));
              zip.file(`medical-${dateStr}.csv`, convertToCSV(flatMed));
          }

          // 6. Customers
          if (exportTables.customers) {
              const customers = await FarmService.getCustomers();
              const flatCust = customers.map(c => ({
                  Name: c.name,
                  Phone: c.phone || '',
                  Email: c.email || '',
                  Total_Spent: c.totalSpent,
                  Last_Purchase: c.lastPurchaseDate || ''
              }));
              zip.file(`customers-${dateStr}.csv`, convertToCSV(flatCust));
          }

          // Generate Download
          if (selectedKeys.length === 1) {
              // If only one file, we might prefer just downloading that CSV directly? 
              // But JSZip keeps it consistent. Let's zip if user requested "package".
              // Actually, user said "selected all or multiple which should package them in a zip".
              // If single, user might prefer direct CSV. Let's do direct CSV for single.
              const firstKey = selectedKeys[0];
              const fileObj = Object.values(zip.files)[0] as any;
              if (fileObj) {
                  const content = await fileObj.async('blob');
                  const url = window.URL.createObjectURL(content);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileObj.name;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
              }
          } else {
              // Multiple -> Zip
              const content = await zip.generateAsync({ type: 'blob' });
              const url = window.URL.createObjectURL(content);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bunnytrack-export-${dateStr}.zip`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
          }
          
          showToast("Export generated successfully", 'success');

      } catch (error) {
          console.error(error);
          showToast("Failed to generate CSV/Zip", 'error');
      } finally {
          setIsExportingCsv(false);
      }
  };

  const toggleAllExport = () => {
      const allSelected = Object.values(exportTables).every(Boolean);
      const newState = !allSelected;
      setExportTables({
          rabbits: newState,
          hutches: newState,
          breeding: newState,
          finances: newState,
          medical: newState,
          customers: newState
      });
  };

  const handleResetAccount = async () => {
    const confirmed = await showConfirm({
        title: 'Reset Farm Data?',
        message: 'DANGER: This will permanently delete ALL rabbits, breeding records, hutches, and transactions. This action cannot be undone. Are you absolutely sure?',
        confirmText: 'Yes, Wipe Everything',
        variant: 'danger'
    });

    if (!confirmed) return;

    // Double confirmation
    const doubleCheck = window.confirm("Final Warning: You are about to wipe your entire farm database. Proceed?");
    if (!doubleCheck) return;

    setResetting(true);
    try {
        await FarmService.resetFarmAccount();
        showToast("Account reset successfully. The page will reload.", 'success');
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error(error);
        showToast("Failed to reset account. Please try again.", 'error');
        setResetting(false);
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
            <SettingsIcon size={18} /> Defaults
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
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'financials' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign size={18} /> Financials
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'security' ? 'bg-white border-t-2 border-t-farm-600 text-farm-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock size={18} /> Security
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

          {activeTab === 'financials' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-fit">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Plus size={16}/> Add Category
                        </h4>
                        <form onSubmit={handleAddCategory} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Category Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-farm-500 outline-none"
                                    placeholder="e.g. Repairs"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2 bg-farm-600 text-white rounded-lg font-medium text-sm hover:bg-farm-700"
                            >
                                Add Category
                            </button>
                        </form>
                    </div>

                    {/* Category List */}
                    <div className="md:col-span-2">
                        <h4 className="font-bold text-gray-800 mb-3">Transaction Categories</h4>
                        <p className="text-sm text-gray-500 mb-4">Categories used for income and expenses tracking.</p>
                        
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Category Name</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {farmSettings.transactionCategories?.map((cat) => (
                                        <tr key={cat} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-900">{cat}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat)}
                                                    className="text-gray-400 hover:text-red-600 p-1"
                                                    title="Remove Category"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'security' && (
             <div className="space-y-6">
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-3">
                  <ShieldCheck className="text-purple-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-purple-900 text-sm">Account Security</h4>
                    <p className="text-sm text-purple-800 mt-1">
                      You can set or update your password here. If you originally signed up with Google, setting a password will allow you to log in with both Google and your email address.
                    </p>
                  </div>
                </div>

                <div className="max-w-md">
                   <form onSubmit={handlePasswordUpdate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                      <h4 className="font-bold text-gray-800 mb-4">Set / Update Password</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                          placeholder="Min 6 characters"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                          placeholder="Re-enter password"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={saving || !passwordForm.new}
                          className="w-full py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                   </form>
                </div>
             </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              
              {/* CSV / Excel Export Section */}
              <div className="border border-green-200 rounded-lg p-4 bg-white">
                <div className="mb-4">
                    <h4 className="text-base font-bold text-green-800 flex items-center gap-2">
                      <FileSpreadsheet size={18} /> Export as CSV / Excel
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Select the data you want to export. If multiple are selected, they will be packaged in a ZIP file.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {Object.entries(exportTables).map(([key, checked]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer p-2 border border-gray-100 rounded hover:bg-gray-50">
                            <input 
                              type="checkbox"
                              checked={checked}
                              onChange={() => setExportTables(prev => ({ ...prev, [key]: !prev[key as keyof typeof exportTables] }))}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="capitalize text-sm font-medium text-gray-700">{key}</span>
                        </label>
                    ))}
                </div>

                <div className="flex gap-3">
                   <button 
                      onClick={toggleAllExport}
                      className="px-3 py-1.5 text-xs text-green-600 font-medium hover:bg-green-50 rounded border border-green-100 flex items-center gap-1"
                   >
                      {Object.values(exportTables).every(Boolean) ? <Square size={14}/> : <CheckSquare size={14}/>}
                      {Object.values(exportTables).every(Boolean) ? 'Deselect All' : 'Select All'}
                   </button>
                   <div className="flex-1"></div>
                   <button 
                      onClick={handleExportCSV}
                      disabled={isExportingCsv}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-70"
                   >
                      {isExportingCsv ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16}/>}
                      {isExportingCsv ? 'Preparing...' : 'Download CSV(s)'}
                   </button>
                </div>
              </div>

              {/* JSON Backup Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Download size={18} className="text-blue-600" /> Full System Backup (JSON)
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Download a complete backup of all farm data. Useful for restoring data later.
                    </p>
                  </div>
                  <button
                    onClick={handleExportJSON}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                  >
                    <Database size={16} /> Download JSON
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
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
                    onClick={handleResetAccount}
                    disabled={resetting}
                    className="px-4 py-2 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {resetting ? 'Reseting...' : 'Reset Account'}
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
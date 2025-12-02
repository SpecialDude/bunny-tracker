import React, { useState, useEffect } from 'react';
import { X, Baby, Edit } from 'lucide-react';
import { FarmService } from '../services/farmService';
import { Crossing, CrossingStatus } from '../types';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  crossing: Crossing;
}

export const DeliveryFormModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, crossing }) => {
  const { showToast } = useAlert();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    dateOfDelivery: new Date().toISOString().split('T')[0],
    kitsBorn: 1,
    kitsLive: 1,
    notes: ''
  });

  useEffect(() => {
      if (isOpen) {
          // If already delivered, fetch existing details to edit
          if (crossing.status === CrossingStatus.Delivered) {
              setIsEditMode(true);
              setFormData({
                  dateOfDelivery: crossing.actualDeliveryDate || new Date().toISOString().split('T')[0],
                  kitsBorn: crossing.kitsBorn || 0,
                  kitsLive: crossing.kitsLive || 0,
                  notes: '' // We might not have this cached in Crossing, would need fetch. For MVP, blank is ok or fetch Delivery.
              });
              
              // Try to fetch the full delivery record to get ID and Notes
              if (crossing.id) {
                  FarmService.getDeliveryByCrossingId(crossing.id).then(del => {
                      if (del) {
                          setDeliveryId(del.id || null);
                          setFormData(prev => ({
                              ...prev,
                              notes: del.notes || ''
                          }));
                      }
                  });
              }
          } else {
              setIsEditMode(false);
              setDeliveryId(null);
              setFormData({
                dateOfDelivery: new Date().toISOString().split('T')[0],
                kitsBorn: 1,
                kitsLive: 1,
                notes: ''
              });
          }
      }
  }, [isOpen, crossing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode && deliveryId) {
          await FarmService.updateDelivery(deliveryId, crossing.id!, formData);
          showToast("Delivery updated successfully", 'success');
      } else {
          await FarmService.recordDelivery({
            crossingId: crossing.id!,
            doeId: crossing.doeId,
            sireId: crossing.sireId,
            ...formData
          });
          showToast("Delivery recorded successfully", 'success');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to save delivery", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {isEditMode ? <Edit className="text-blue-600" size={20}/> : <Baby className="text-farm-600" size={20} />} 
            {isEditMode ? 'Edit Delivery Details' : 'Record Delivery'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
           {isEditMode ? 'Updating' : 'Recording'} delivery for <strong>{crossing.doeId}</strong> x <strong>{crossing.sireId}</strong>.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
            <input 
              required
              type="date" 
              value={formData.dateOfDelivery}
              onChange={e => setFormData({...formData, dateOfDelivery: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Born</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.kitsBorn}
                onChange={e => setFormData({...formData, kitsBorn: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Live Kits</label>
              <input 
                required
                type="number" 
                min="0"
                max={formData.kitsBorn}
                value={formData.kitsLive}
                onChange={e => setFormData({...formData, kitsLive: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
             <textarea 
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-farm-500 outline-none"
                placeholder="Condition of kits/mother..."
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 mt-4 ${
                isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-farm-600 hover:bg-farm-700'
            }`}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Details' : 'Confirm Delivery')}
          </button>
        </form>
      </div>
    </div>
  );
};
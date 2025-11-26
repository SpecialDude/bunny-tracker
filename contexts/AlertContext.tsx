import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

interface AlertContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType>({} as AlertContextType);

export const useAlert = () => useContext(AlertContext);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <AlertContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-bounce
              ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
              ${toast.type === 'info' ? 'bg-gray-800 text-white' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            {toast.message}
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 opacity-80 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-pulse">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmDialog.options.title}</h3>
            <p className="text-gray-600 text-sm mb-6">{confirmDialog.options.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {confirmDialog.options.cancelText || 'Cancel'}
              </button>
              <button 
                onClick={() => handleConfirm(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  confirmDialog.options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-farm-600 hover:bg-farm-700'
                }`}
              >
                {confirmDialog.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
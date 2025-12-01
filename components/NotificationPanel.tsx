import React from 'react';
import { Bell, Check, Clock, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const NotificationPanel: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch(type) {
      case 'Urgent': return <AlertTriangle size={18} className="text-red-500" />;
      case 'Success': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'Warning': return <Clock size={18} className="text-orange-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const handleItemClick = async (notif: any) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.linkTo) {
        onNavigate(notif.linkTo);
        onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-16 right-4 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900">Notifications</h3>
          {notifications.some(n => !n.read) && (
             <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
             >
               <Check size={12} /> Mark all read
             </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
             <div className="p-8 text-center text-gray-400 text-xs">Loading...</div>
          ) : notifications.length === 0 ? (
             <div className="p-8 text-center text-gray-400">
               <Bell size={24} className="mx-auto mb-2 opacity-20" />
               <p className="text-sm">No notifications</p>
             </div>
          ) : (
            <div className="divide-y divide-gray-50">
               {notifications.map(n => (
                 <div 
                    key={n.id} 
                    onClick={() => handleItemClick(n)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                 >
                   <div className="flex gap-3">
                     <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                     <div className="flex-1 min-w-0">
                       <p className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                         {n.title}
                       </p>
                       <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                       <p className="text-[10px] text-gray-400 mt-2">{n.date}</p>
                     </div>
                     {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                     )}
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
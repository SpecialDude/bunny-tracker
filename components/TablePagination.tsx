import React from 'react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  startIndex: number;
  endIndex: number;
  label: string;
  totalCount: number;
  className?: string;
  showBorder?: boolean;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  startIndex,
  endIndex,
  label,
  totalCount,
  className = "",
  showBorder = true
}) => {
  if (totalItems === 0) return null;

  return (
    <div className={`px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 ${showBorder ? 'border-gray-100' : ''} ${className}`}>
      <div className="flex items-center gap-4">
        <span>
          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} {label}
          {totalItems !== totalCount && ` (filtered from ${totalCount})`}
        </span>
        <div className="flex items-center gap-2">
          <label className="hidden sm:inline whitespace-nowrap">Per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-farm-500"
          >
            {[10, 25, 50, 100, 125, 150, 200].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        <div className="flex items-center gap-1 px-2">
          Page <span className="font-medium text-gray-900 mx-1">{currentPage}</span> of {totalPages}
        </div>
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

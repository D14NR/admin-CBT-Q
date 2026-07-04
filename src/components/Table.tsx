import { ReactNode } from 'react';
import { Pencil, Trash2, Settings } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onConfigure?: (item: T) => void;
  keyExtractor: (item: T) => string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function Table<T>({ 
  data, 
  columns, 
  onEdit,
  onDelete, 
  onConfigure,
  keyExtractor,
  selectedIds,
  onSelectionChange
}: TableProps<T>) {
  const isSelectionEnabled = selectedIds !== undefined && onSelectionChange !== undefined;
  const allSelected = isSelectionEnabled && data.length > 0 && selectedIds.length === data.length;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(keyExtractor));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {isSelectionEnabled && (
              <th scope="col" className="px-6 py-3 text-left">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="sr-only peer"
                  />
                  <span className="h-4 w-4 rounded border border-gray-300 bg-white flex items-center justify-center peer-checked:bg-red-600 peer-checked:border-red-600">
                    <svg viewBox="0 0 20 20" className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 11 8 15 16 5" />
                    </svg>
                  </span>
                </label>
              </th>
            )}
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (isSelectionEnabled ? 2 : 1)} className="px-6 py-4 text-center text-sm text-gray-500">
                Tidak ada data.
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds?.includes(id);
              
              return (
                <tr key={id} className={`hover:bg-gray-50 ${isSelected ? 'bg-red-50' : ''}`}>
                  {isSelectionEnabled && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          className="sr-only peer"
                        />
                        <span className="h-4 w-4 rounded border border-gray-300 bg-white flex items-center justify-center peer-checked:bg-red-600 peer-checked:border-red-600">
                          <svg viewBox="0 0 20 20" className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 11 8 15 16 5" />
                          </svg>
                        </span>
                      </label>
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as ReactNode)}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {onConfigure && (
                        <button
                          onClick={() => onConfigure(item)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                          title="Kelola Soal"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

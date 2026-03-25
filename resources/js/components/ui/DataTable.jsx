import React from 'react';

export default function DataTable({ 
  columns, 
  data, 
  keyField = 'id',
  isLoading = false,
  emptyMessage = "No records found"
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--color-sys-border)] rounded-t-xl bg-white shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-[var(--color-sys-text-secondary)] uppercase bg-[var(--color-sys-muted)] border-b border-[var(--color-sys-border)]">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-6 py-4 font-semibold ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-sys-border)]">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center">
                <div className="flex items-center justify-center text-[var(--color-sys-text-secondary)]">
                  {/* Tailwind SVG spinner */}
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[var(--color-brand-emerald)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading data...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-[var(--color-sys-text-secondary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr 
                key={row[keyField]} 
                className="hover:bg-[var(--color-brand-light)]/20 transition-colors"
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-6 py-4 whitespace-nowrap ${col.cellClassName || ''}`}>
                    {col.cell ? col.cell(row) : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

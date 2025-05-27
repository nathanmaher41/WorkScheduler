// src/components/DayShiftModal.jsx
import React from 'react';

export default function DayShiftModal({ date, shifts, onClose }) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Shifts on {formattedDate}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No shifts scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {shifts.map((event) => {
              const { shiftData } = event;
              const start = new Date(shiftData.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const end = new Date(shiftData.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

              return (
                <li
                  key={shiftData.id}
                  className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-sm"
                >
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {shiftData.employee_name} <span className="text-gray-500">({shiftData.position})</span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">{start} - {end}</p>
                  {shiftData.notes && <p className="text-gray-500 dark:text-gray-400 mt-1 italic">{shiftData.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
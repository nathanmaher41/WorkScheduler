// src/components/CustomEventViews.jsx
import React, { useState } from 'react';

export function CustomEvent({ event }) {
  const shift = event.shiftData;
  const start = new Date(shift.start_time).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const end = new Date(shift.end_time).toLocaleTimeString([], {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <div className="text-white whitespace-pre-wrap">
      <strong>{shift.employee_name}</strong>
      {shift.position && ` - ${shift.position}`}
      {`\n${start} - ${end}`}
    </div>
  );
}


export function MinimalEvent({ event }) {
  const [showModal, setShowModal] = useState(false);
  const shift = event.shiftData;
  const start = new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const end = new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <div
        className="w-2 h-2 rounded-full bg-white cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      ></div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm">
            <h2 className="text-xl font-bold mb-2">Shift Details</h2>
            <p><strong>Name:</strong> {shift.employee_name}</p>
            {shift.position && <p><strong>Role:</strong> {shift.position}</p>}
            <p><strong>Time:</strong> {start} - {end}</p>
            {shift.notes && <p><strong>Notes:</strong> {shift.notes}</p>}

            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

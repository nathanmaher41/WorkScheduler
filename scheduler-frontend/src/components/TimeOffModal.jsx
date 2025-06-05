import React from 'react';
import axios from '../utils/axios';

export default function TimeOffModal({ isOpen, onClose, timeOff, currentUserId, onDelete, calendarId }) {
  if (!isOpen || !timeOff) return null;

  const { id, employee_name, employee, start_date, end_date, reason } = timeOff;

  const sameDay = start_date === end_date;
  const dateDisplay = sameDay
    ? new Date(start_date).toLocaleDateString()
    : `${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`;

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/calendars/${calendarId}/request-off/${id}/delete/`);
      if (onDelete) onDelete(id);
      onClose();
    } catch (err) {
      console.error('Failed to delete time off request:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-black dark:text-white mb-4">Time Off Details</h2>
        <p><strong>Name:</strong> {employee_name}</p>
        <p><strong>Date{sameDay ? '' : 's'}:</strong> {dateDisplay}</p>
        {reason && <p><strong>Reason:</strong> {reason}</p>}

        {employee === currentUserId && (
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            onClick={handleDelete}
          >
            Delete Request
          </button>
        )}
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

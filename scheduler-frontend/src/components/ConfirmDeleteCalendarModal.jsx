// ConfirmDeleteCalendarModal.jsx
import React, { useState } from 'react';

export default function ConfirmDeleteCalendarModal({ calendarName, onDelete, onClose }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (confirmationText.toLowerCase() !== 'confirm') {
      setError('Please type "confirm" to continue the deletion of this calendar.');
      return;
    }
    onDelete();
    //onDelete(calendar.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Delete Calendar?</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Are you sure you want to delete the calendar "{calendarName}"?
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          This will permanently delete the calendar for all members and delete all associated shifts.
        </p>
        <p className="text-sm font-semibold text-red-500 dark:text-red-500 mb-4">
        This action cannot be undone.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Type <span className="font-semibold">confirm</span> to proceed:
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white"
          value={confirmationText}
          onChange={(e) => {
            setConfirmationText(e.target.value);
            setError('');
          }}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

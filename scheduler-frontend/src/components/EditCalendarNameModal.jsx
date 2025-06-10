import React, { useState } from 'react';

export default function EditCalendarNameModal({ calendarId, currentName, onClose, onRename }) {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onRename(calendarId, newName);  // ✅ Use the passed-in function
      onClose();  // ✅ Close the modal on success
    } catch (err) {
      alert('Error updating calendar name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-80">
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Edit Calendar Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-600 text-black dark:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

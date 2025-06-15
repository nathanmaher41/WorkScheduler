import React, { useState, useRef } from 'react';

export default function ScheduleCard({
  schedule,
  isActive,
  onSelect,
  isAdmin,
  onEdit,
  onDelete,
  onNotifySchedule
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dropdownRef = useRef(null);

 // const startStr = new Date(schedule.start_date + 'T00:00:00').toLocaleDateString();
  //const endStr = new Date(schedule.end_date + 'T00:00:00').toLocaleDateString();

  const startStr = schedule.start_date
    ? new Date(schedule.start_date + 'T00:00:00').toLocaleDateString()
    : '';
  const endStr = schedule.end_date
    ? new Date(schedule.end_date + 'T00:00:00').toLocaleDateString()
    : '';

  return (
    <div className="relative">
      <button
        onClick={() => onSelect(schedule)}
        className={`w-full text-left px-3 py-2 rounded ${
          isActive
            ? 'bg-purple-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
        }`}
      >
        <div className="flex flex-col items-start">
          {schedule.name && <div className="font-semibold">{schedule.name}</div>}
          <div>{schedule.isDefault ? 'Main Calendar' : `${startStr} - ${endStr}`}</div>
        </div>
      </button>

      {isAdmin && !schedule.isDefault &&  (
        <div className="absolute top-1 right-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-lg text-black dark:text-white hover:text-gray-400 dark:hover:text-gray-400"
          >
            ⋮
          </button>
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 shadow-lg rounded z-10 text-sm"
            >
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onNotifySchedule?.(schedule);  // NEW
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Notify of Changes
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onEdit(schedule);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowConfirm(true);
                }}
                className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Confirm Deletion</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you'd like to delete this schedule? All shifts in this schedule will be deleted.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDelete(schedule);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

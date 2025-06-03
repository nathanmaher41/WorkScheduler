// src/components/ScheduleCard.jsx
import React from 'react';

export default function ScheduleCard({
  schedule,
  isActive,
  onSelect,
  isAdmin,
  onEdit
}) {
  const startStr = new Date(schedule.start_date + 'T00:00:00').toLocaleDateString();
  const endStr = new Date(schedule.end_date + 'T00:00:00').toLocaleDateString();

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
          <div>{startStr} - {endStr}</div>
        </div>
      </button>
      {isAdmin && (
        <button
          className="absolute top-1 right-1 text-sm text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
          onClick={() => onEdit(schedule)}
          title="Edit Schedule"
        >
          Edit
        </button>
      )}
    </div>
  );
}

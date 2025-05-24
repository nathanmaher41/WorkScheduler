import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CalendarCard({ calendar, isSelected, onSelect, onDelete, onShare, isMenuOpen, onToggleMenu }) {
  //const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const dropdownItemClass = "w-full text-left px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600";

  return (
    <div
      onClick={() => onSelect(calendar)}  // ✅ clicking selects and shows members
      className={`relative p-4 rounded-lg shadow cursor-pointer transition
        ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'}
      `}
    >
      {/* Three dots menu */}
      <div className="absolute top-2 right-2">
        <button
  onClick={(e) => {
    e.stopPropagation();
    onToggleMenu(); // use parent handler
  }}
  className={`${isSelected ? 'text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
>
  ⋮
</button>

{isMenuOpen && (
  <div
    className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-md z-10"
    onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(calendar.join_code);
              onToggleMenu(); // closes after action
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            📋 Copy Invite Code
          </button>
          <button
            onClick={() => {
              onShare(calendar);
              onToggleMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            📤 Share
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete calendar "${calendar.name}"?`)) {
                onDelete(calendar.id);
              }
              onToggleMenu();
            }}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            🗑️ Delete
          </button>
        </div>
      )}
      </div>

      <h2 className="text-lg font-semibold">Calendar: {calendar.name}</h2>
      <p className="text-sm">–</p>
      <p className={`mt-2 ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        Invite Code: <span className="font-mono bg-gray-700 text-white px-2 py-1 rounded">{calendar.join_code}</span>
      </p>

      {/* ✅ Open Button */}
      <div className="mt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/calendar/${calendar.id}`);
          }}
          className="text-sm bg-purple-800 text-white px-3 py-1 rounded hover:bg-purple-700"
        >
          Open Calendar
        </button>
      </div>
    </div>
  );
}

export default CalendarCard;

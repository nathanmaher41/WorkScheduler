import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditCalendarNameModal from './EditCalendarNameModal';
import ConfirmDeleteCalendarModal from './ConfirmDeleteCalendarModal';
import ShareInviteModal from './ShareInviteModal';

function CalendarCard({ calendar, isSelected, onSelect, onDelete, onShare, isMenuOpen, onToggleMenu, isAdmin, onRename, effectivePermissions }) {
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  console.log("PERMS", effectivePermissions);
  const dropdownItemClass =
    'w-full text-left px-4 py-2 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600';

  return (
    <div
      onClick={() => onSelect(calendar)}
      className={`relative p-4 rounded-lg shadow cursor-pointer transition ${
        isSelected
          ? 'bg-purple-600 text-white'
          : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
      }`}
    >
      {/* Three dots menu */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          className={`${
            isSelected
              ? 'text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          ⋮
        </button>

        {isMenuOpen && (
        <div
          className="absolute right-0 mt-2 w-40 shadow-lg rounded-md z-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              navigator.clipboard.writeText(calendar.join_code);
              onToggleMenu();
            }}
            className={dropdownItemClass}
          >
            📋 Copy Invite Code
          </button>

          {(isAdmin ||
            effectivePermissions?.permissions?.some(
              (p) => p.codename === 'invite_remove_members'
            )) && (
            <button
              onClick={() => {
                setShowShareModal(true);
                onToggleMenu();
              }}
              className={dropdownItemClass}
            >
              📤 Share
            </button>
          )}

          {(isAdmin ||
            effectivePermissions?.permissions?.some(
              (p) => p.codename === 'manage_calendar_settings'
            )) && (
            <button
              onClick={() => {
                setShowEditModal(true);
                onToggleMenu();
              }}
              className={dropdownItemClass}
            >
              ✏️ Edit Name
            </button>
          )}

          {isAdmin && onDelete && (
            <button
              onClick={() => {
                setShowDeleteModal(true);
                onToggleMenu();
              }}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
      </div>

      <h2 className="text-lg font-semibold">Calendar: {calendar.name}</h2>
      <p className="text-sm">–</p>
      <p className={`mt-2 ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        Invite Code:{' '}
        <span className="font-mono bg-gray-700 text-white px-2 py-1 rounded">
          {calendar.join_code}
        </span>
      </p>

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

      {showShareModal && (
        <ShareInviteModal
          calendarId={calendar.id}
          calendarName={calendar.name}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showEditModal && (
        <EditCalendarNameModal
          calendarId={calendar.id}
          currentName={calendar.name}
          onRename={onRename}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteModal && calendar && (
        <ConfirmDeleteCalendarModal
          calendarName={calendar.name}
          onDelete={() => onDelete(calendar.id)}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

export default CalendarCard;

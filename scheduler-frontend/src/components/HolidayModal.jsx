import React, { useState } from 'react';
import HolidayEditModal from './HolidayEditModal';

export default function HolidayModal({
    isOpen,
    onClose,
    holiday,
    calendarId,
    isAdmin,
    effectivePermissions,
    onUpdateHoliday,
    onDeleteHoliday,
    }) {
    const canEdit = isAdmin || effectivePermissions.some(p => p.codename === 'manage_holidays');;
    const [editing, setEditing] = useState(false);

    if (!isOpen || !holiday) return null;

    const { title, date, end_date, type, start_time, end_time, note } = holiday;

    const formatTime = (t) => {
        if (!t) return '';
        const [hour, minute] = t.split(':');
        const date = new Date();
        date.setHours(parseInt(hour), parseInt(minute));
        return date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        }); // e.g. "2:00 PM"
    };

    const formatDate = (raw) => {
        if (!raw) return '';
        const [year, month, day] = raw.split('-');
        return `${month}/${day}/${year}`;
    };

    return (
    <>
        {!editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md mx-auto mt-20 p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {title?.trim() ||
                    (type === 'custom' ? '⚠️ Altered Hours' : '🚫 Holiday')}
            </h2>

            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                {date === (end_date || date)
                    ? `Date: ${formatDate(date)}`
                    : `Dates: ${formatDate(date)} – ${formatDate(end_date)}`}
            </p>

            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                Type: {type === 'custom' ? 'Altered Hours' : 'Full Day Off'}
            </p>

            {type === 'custom' && (
                <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                Time: {formatTime(start_time)} – {formatTime(end_time)}
                </p>
            )}

            {note && (
                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                📝 {note}
                </p>
            )}

            <div className="mt-6 flex justify-between">
                <button className="px-4 py-2 bg-gray-400 rounded hover:bg-gray-500" onClick={onClose}>
                Close
                </button>
                {canEdit && (
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => setEditing(true)}
                >
                    Edit
                </button>
                )}
            </div>
            </div>
        </div>
        )}

        {editing && (
        <HolidayEditModal
            isOpen={editing}
            onClose={() => {
            setEditing(false);
            onClose(); // optionally close parent modal too
            }}
            holiday={holiday}
            calendarId={calendarId}
            isAdmin={canEdit}
            onUpdate={(updated) => {
            onUpdateHoliday(updated);
            setEditing(false);
            onClose();
            }}
            onDelete={(deletedId) => {
            onDeleteHoliday(deletedId);
            setEditing(false);
            onClose();
            }}
        />
        )}
    </>
    );
}

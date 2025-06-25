import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function HolidayEditModal({ isOpen, onClose, holiday, calendarId, isAdmin, onUpdate, onDelete }) {
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('off');
    const [startHourMinute, setStartHourMinute] = useState('');
    const [startPeriod, setStartPeriod] = useState('AM');
    const [endHourMinute, setEndHourMinute] = useState('');
    const [endPeriod, setEndPeriod] = useState('PM');
    const [showStartTooltip, setShowStartTooltip] = useState(false);
    const [showEndTooltip, setShowEndTooltip] = useState(false);

    function splitTime24(t) {
        const [h, m] = t.split(':');
        const hour = parseInt(h, 10);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return [`${hour12}:${m}`, period];
    }

    useEffect(() => {
    if (holiday) {
        setTitle(holiday.title || '');
        setNote(holiday.note || '');
        setStartDate(holiday.date);
        setEndDate(holiday.end_date || holiday.date);
        setType(holiday.type);
        if (holiday.type === 'custom' && holiday.start_time) {
        const [t, p] = splitTime24(holiday.start_time);
        setStartHourMinute(t);
        setStartPeriod(p);
    }
    if (holiday.type === 'custom' && holiday.end_time) {
        const [t, p] = splitTime24(holiday.end_time);
        setEndHourMinute(t);
        setEndPeriod(p);
    }
    }
    }, [holiday]);

    const handleSave = async () => {
        if (type === 'custom') {
            const isStartMissing = !startHourMinute.trim();
            const isEndMissing = !endHourMinute.trim();

            setShowStartTooltip(isStartMissing);
            setShowEndTooltip(isEndMissing);

            if (isStartMissing || isEndMissing) return;
        }

        try {
            const normalizedStart = type === 'custom' ? normalizeTime(startHourMinute) : null;
            const normalizedEnd = type === 'custom' ? normalizeTime(endHourMinute) : null;

            if ((type === 'custom') && (!normalizedStart || !normalizedEnd)) {
            alert('Invalid time format');
            return;
            }

            const payload = {
            title,
            note,
            date: startDate,
            end_date: endDate,
            type,
            start_time: convertTo24Hour(normalizedStart, startPeriod),
            end_time: convertTo24Hour(normalizedEnd, endPeriod),
            };

            const res = await axios.patch(`/api/calendars/${calendarId}/holidays/${holiday.id}/`, payload);
            onUpdate?.(res.data);
            onClose();
            setShowStartTooltip(false);
            setShowEndTooltip(false);
        } catch (err) {
            console.error('❌ Failed to update holiday:', err);
        }
        };

    const handleDelete = async () => {
    if (!window.confirm('Delete this holiday? This cannot be undone.')) return;
    try {
        await axios.delete(`/api/calendars/${calendarId}/holidays/${holiday.id}/delete/`);
        onDelete?.(holiday.id);
        onClose();
    } catch (err) {
        console.error('❌ Failed to delete holiday:', err);
    }
    };


    function formatTimeCustom(raw) {
    const cleaned = raw.replace(/\D/g, '').slice(0, 4);
    if (!cleaned) return '';

    const first = cleaned[0];
    if (first === '0') return '';

    if (first === '1') {
      if (cleaned.length === 1) return '1';
      if (['0', '1', '2'].includes(cleaned[1])) {
        if (cleaned.length === 2) return cleaned;
        if (cleaned.length === 3) return `${cleaned.slice(0, 2)}:${cleaned[2]}`;
        return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
      } else {
        return `${first}:${cleaned.slice(1, 3)}`;
      }
    } else {
      if (cleaned.length === 1) return `${first}`;
      if (cleaned.length === 2) return `${first}:${cleaned[1]}`;
      return `${first}:${cleaned.slice(1, 3)}`;
    }
  }

  function normalizeTime(timeStr) {
    const trimmed = timeStr?.trim?.();
    if (!trimmed || typeof trimmed !== 'string') return null;
    if (!trimmed.includes(':')) return `${trimmed}:00`;
    if (trimmed.endsWith(':')) return `${trimmed}00`;
    return trimmed;
    }





    function convertTo24Hour(time, period) {
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }


    if (!isOpen || !holiday) return null;

    return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Edit Holiday</h2>

        <label className="block text-sm mb-1 text-black dark:text-white">Title</label>
        <input
            className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 text-black dark:text-white"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!isAdmin}
        />

        <label className="block text-sm mb-1 text-black dark:text-white">Note (optional)</label>
        <textarea
            className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 text-black dark:text-white"
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={!isAdmin}
            rows={3}
        />

        <label className="block text-sm mb-1 text-black dark:text-white">Start Date</label>
        <input
            type="date"
            className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 text-black dark:text-white"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            disabled={!isAdmin}
        />

        <label className="block text-sm mb-1 text-black dark:text-white">End Date</label>
        <input
            type="date"
            className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 text-black dark:text-white"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            disabled={!isAdmin}
        />

        <label className="block text-sm mb-1 text-black dark:text-white">Type</label>
        <select
            className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 text-black dark:text-white"
            value={type}
            onChange={e => setType(e.target.value)}
            disabled={!isAdmin}
        >
            <option value="off">Full Day Off</option>
            <option value="custom">Altered Hours</option>
        </select>

        {type === 'custom' && (
        <>
            <label className="block text-sm mb-1 text-black dark:text-white">Start Time</label>
            <div className="flex gap-2 mb-3">
            <div className="relative w-full">
            <input
                type="text"
                placeholder="e.g. 9:00"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                value={startHourMinute}
                onChange={(e) => {
                setStartHourMinute(formatTimeCustom(e.target.value));
                setShowStartTooltip(false);
                }}
                disabled={!isAdmin}
            />
            {showStartTooltip && (
                <div className="absolute left-0 top-full mt-1 z-50">
                    <div className="relative bg-purple-600 text-white text-sm px-3 py-2 rounded shadow-lg">
                    <div className="absolute -top-1 left-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-purple-600"></div>
                    Start time is required.
                    </div>
                </div>
                )}
            </div>
            <select
                className="border rounded px-2 py-2 dark:bg-gray-700 dark:text-white"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                disabled={!isAdmin}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
            </div>

            <label className="block text-sm mb-1 text-black dark:text-white">End Time</label>
            <div className="flex gap-2 mb-3">
            <div className="relative w-full">
            <input
                type="text"
                placeholder="e.g. 5:00"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                value={endHourMinute}
                onChange={(e) => {
                setEndHourMinute(formatTimeCustom(e.target.value));
                setShowEndTooltip(false);
                }}
                disabled={!isAdmin}
            />
            {showEndTooltip && (
            <div className="absolute left-0 top-full mt-1 z-50">
                <div className="relative bg-purple-600 text-white text-sm px-3 py-2 rounded shadow-lg">
                <div className="absolute -top-1 left-3 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-purple-600"></div>
                End time is required.
                </div>
            </div>
            )}
            </div>
            <select
                className="border rounded px-2 py-2 dark:bg-gray-700 dark:text-white"
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value)}
                disabled={!isAdmin}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
            </div>
        </>
        )}

        <div className="flex justify-between mt-4">
            <button
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded"
            onClick={onClose}
            >
            Cancel
            </button>
            {isAdmin && (
            <div className="flex gap-2">
                <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleDelete}
                >
                Delete
                </button>
                <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSave}
                >
                Save
                </button>
            </div>
            )}
        </div>
        </div>
    </div>
    );
}

import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import DatePicker from 'react-datepicker';

export default function RequestOffModal({ isOpen, onClose, calendarId, selectedDate, onRequestSubmitted, isAdmin, effectivePermissions }) {
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isHolidayMode, setIsHolidayMode] = useState(false);
  const [holidayType, setHolidayType] = useState('off'); // 'off' or 'altered'
  const [startHourMinute, setStartHourMinute] = useState('');
  const [endHourMinute, setEndHourMinute] = useState('');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('PM');
  const [startDate, setStartDate] = useState(selectedDate || '');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [title, setTitle] = useState('');
  
  function formatTimeCustom(raw) {
    const cleaned = raw.replace(/\D/g, '').slice(0, 4);
    if (!cleaned) return '';

    const first = cleaned[0];

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

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }

    return () => {
        document.body.style.overflow = '';
    };
    }, [isOpen]);

  function normalizeTime(timeStr) {
    const trimmed = timeStr.trim();
    if (trimmed === '') return null;
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

  const handleSubmit = async () => {
    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    try {
      if (isHolidayMode) {
        const start_time =
            holidayType === 'altered'
                ? convertTo24Hour(normalizeTime(startHourMinute), startPeriod)
                : null;
        const end_time =
            holidayType === 'altered'
                ? convertTo24Hour(normalizeTime(endHourMinute), endPeriod)
                : null;

        await axios.post(`/api/calendars/${calendarId}/holidays/`, {
          date: startDate,
          end_date: holidayEndDate || null,
          type: holidayType === 'altered' ? 'custom' : 'off',
          start_time,
          end_time,
          note: reason,
          title,
        });
      } else {
        console.log("Submitting time off:", { startDate, endDate, reason });
        await axios.post(`/api/calendars/${calendarId}/request-off/`, {
          start_date: startDate,
          end_date: endDate || startDate,
          reason,
        });
      }

      setSuccess('Submitted successfully.');
      if (isHolidayMode) {
        const holidaysRes = await axios.get(`/api/calendars/${calendarId}/holidays/`);
        await onRequestSubmitted(holidaysRes.data);
      } else {
        await onRequestSubmitted();
      }
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 300);
    } catch (err) {
      console.error(err);
      setError('Failed to submit request.');
    }
  };

  function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // useEffect(() => {
  //   if (startDate && (!endDate || new Date(endDate) < new Date(startDate))) {
  //     const start = new Date(startDate);
  //     const defaultEnd = new Date(start);
  //     defaultEnd.setDate(defaultEnd.getDate() + 1); // 1-day default for time off
  //     setEndDate(defaultEnd.toISOString().split('T')[0]);
  //   }
  // }, [startDate]);

  // useEffect(() => {
  //   if (startDate && (!holidayEndDate || new Date(holidayEndDate) < new Date(startDate))) {
  //     const start = new Date(startDate);
  //     const defaultEnd = new Date(start);
  //     defaultEnd.setDate(defaultEnd.getDate() + 1); // 1-day default for holidays
  //     setHolidayEndDate(defaultEnd.toISOString().split('T')[0]);
  //   }
  // }, [startDate]);

  // useEffect(() => {
  //   if (startDate && !endDate) {
  //     setEndDate(startDate); // just set the same day so the calendar opens there
  //   }
  // }, [startDate]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
          {isHolidayMode ? 'Set Workplace Holiday' : 'Request Time Off'}
        </h2>

        {(isAdmin || effectivePermissions.some(p => p.codename === 'manage_holidays'))&& (
          <button
            className="w-full mb-4 px-4 py-2 rounded font-medium bg-purple-500 text-white hover:bg-purple-700"
            onClick={() => setIsHolidayMode(prev => !prev)}
          >
            {isHolidayMode ? '← Switch to Personal Time Off' : 'Mark as Workplace Holiday →'}
          </button>
        )}

        {isHolidayMode ? (
          <>
            <label className="block text-sm mb-1 text-black dark:text-white">Title (optional)</label>
            <input
            type="text"
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            />
            <label className="block text-sm mb-1 text-black dark:text-white">Holiday Type</label>
            <select
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value)}
            >
              <option value="off">Full Day Off</option>
              <option value="altered">Altered Hours</option>
            </select>
            <label className="block text-sm mb-1 text-black dark:text-white">Date</label>
            <DatePicker
              selected={startDate ? new Date(startDate + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) setStartDate(formatDateLocal(date));
              }}
              dateFormat="MM/dd/yyyy"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              placeholderText="Select holiday start date"
            />
            <label className="block text-sm mb-1 text-black dark:text-white">End Date (optional)</label>
            <DatePicker
                selected={holidayEndDate ? new Date(holidayEndDate + 'T00:00:00') : null}
                onChange={(date) => {
                  if (date) setHolidayEndDate(formatDateLocal(date));
                }}
                openToDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                minDate={startDate ? new Date(startDate) : null}
                dateFormat="MM/dd/yyyy"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
                placeholderText="Select holiday end date"
              />
            {holidayType === 'altered' && (
              <>
                <label className="block text-sm mb-1 text-black dark:text-white">Start Time</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="hh:mm"
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                    value={startHourMinute}
                    onChange={(e) => setStartHourMinute(formatTimeCustom(e.target.value))}
                  />
                  <select
                    className="border rounded px-2 py-2 dark:bg-gray-700 dark:text-white"
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                <label className="block text-sm mb-1 text-black dark:text-white">End Time</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="hh:mm"
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                    value={endHourMinute}
                    onChange={(e) => setEndHourMinute(formatTimeCustom(e.target.value))}
                  />
                  <select
                    className="border rounded px-2 py-2 dark:bg-gray-700 dark:text-white"
                    value={endPeriod}
                    onChange={(e) => setEndPeriod(e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </>
            )}

            <label className="block text-sm mb-1 text-black dark:text-white">Note (optional)</label>
            <textarea
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </>
        ) : (
          <>
            <label className="block text-sm mb-1 text-black dark:text-white">Start Date</label>
            {/* <input
              type="date"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            /> */}
            <DatePicker
                selected={startDate ? new Date(startDate + 'T00:00:00') : null}
                onChange={(date) => {
                  if (date) setStartDate(formatDateLocal(date));
                }}
                dateFormat="MM/dd/yyyy"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
                placeholderText="Select start date"
              />
            <label className="block text-sm mb-1 text-black dark:text-white">End Date (optional)</label>
            {/* <input
              type="date"
              key={`end-${startDate}`}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            /> */}
            <DatePicker
              selected={endDate ? new Date(endDate + 'T00:00:00') : null}
              onChange={(date) => {
                if (date) setEndDate(formatDateLocal(date));
              }}
              openToDate={startDate ? new Date(startDate + 'T00:00:00') : undefined}
              minDate={startDate ? new Date(startDate) : null}
              dateFormat="MM/dd/yyyy"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              placeholderText="Select end date"
            />

            <label className="block text-sm mb-1 text-black dark:text-white">Reason (optional)</label>
            <textarea
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 text-black dark:text-white mb-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </>
        )}

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-2">{success}</p>}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

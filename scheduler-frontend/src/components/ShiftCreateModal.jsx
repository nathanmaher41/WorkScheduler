// src/components/ShiftCreateModal.jsx
import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';

export default function ShiftCreateModal({
  isOpen,
  onClose,
  onCreate,
  calendarId,
  scheduleId,
  selectedDate,
  members
}) {
  const [employee, setEmployee] = useState('');
  const [startHourMinute, setStartHourMinute] = useState('');
  const [endHourMinute, setEndHourMinute] = useState('');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('PM');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');

  const startInputRef = useRef();
  const endInputRef = useRef();

  useEffect(() => {
    if (!isOpen) {
      setEmployee('');
      setStartHourMinute('');
      setEndHourMinute('');
      setStartPeriod('AM');
      setEndPeriod('PM');
      setRole('');
      setNotes('');
    }
  }, [isOpen]);

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    setEmployee(employeeId);
    const selected = members.find((m) => m.id === parseInt(employeeId));
    if (selected) {
      setRole(selected.role || '');
    }
  };

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

  function convertTo24Hour(time, period) {
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { hours: startH, minutes: startM } = convertTo24Hour(startHourMinute, startPeriod);
      const { hours: endH, minutes: endM } = convertTo24Hour(endHourMinute, endPeriod);

      const start = new Date(selectedDate);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(endH, endM, 0, 0);

      const res = await axios.post(`/api/schedules/${scheduleId}/shifts/create/`, {
        employee,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        position: role,
        notes
      });
      onCreate(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to create shift', err);
      alert('Something went wrong.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create Shift</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Employee</label>
            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={employee}
              onChange={handleEmployeeChange}
              required
            >
              <option value="">Select...</option>
              {members.filter(m => m && m.id).map((member) => (
                <option key={`emp-${member.id}`} value={member.id}>
                  {member.full_name || member.username}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="hh:mm"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={startHourMinute}
                  onChange={(e) => setStartHourMinute(formatTimeCustom(e.target.value))}
                  required
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
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="hh:mm"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                  value={endHourMinute}
                  onChange={(e) => setEndHourMinute(formatTimeCustom(e.target.value))}
                  required
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
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

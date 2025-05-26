// src/components/ShiftCreateModal.jsx
import { useState, useEffect } from 'react';
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEmployee('');
      setStartTime('');
      setEndTime('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await axios.post(`/api/schedules/${scheduleId}/shifts/create/`, {
        employee,
        start_time: `${dateStr}T${startTime}`,
        end_time: `${dateStr}T${endTime}`,
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
              {members
                .filter((m) => m && m.id)
                .map((member) => (
                    <option key={`emp-${member.id}`} value={member.id}>
                    {member.full_name || member.username}
                    </option>
                ))}

            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
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

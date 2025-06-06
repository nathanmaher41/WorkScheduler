import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function ScheduleCreateModal({
  isOpen,
  onClose,
  onCreate,
  calendarId,
  mode = 'create',          // or 'edit'
  existingSchedule = null,  // used in edit mode
  onUpdate       // called when editing is done
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setStartDate('');
      setEndDate('');
    }
    else if (mode === 'edit' && existingSchedule) {
      setName(existingSchedule.name || '');
      setStartDate(existingSchedule.start_date || '');
      setEndDate(existingSchedule.end_date || '');
    }
  }, [isOpen, mode, existingSchedule]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'edit' && existingSchedule) {
        const res = await axios.patch(`/api/schedules/${existingSchedule.id}/edit/`, {
          name,
          start_date: startDate,
          end_date: endDate,
        });
        onUpdate(res.data);
      } else {
        const res = await axios.post('/api/schedules/create/', {
          calendar_id: calendarId,
          name,
          start_date: startDate,
          end_date: endDate
        });
        onCreate(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save schedule', err);
      alert('Something went wrong.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{mode === 'edit' ? 'Edit Schedule' : 'Create Schedule'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Schedule Name (optional)
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. June Schedule"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
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
              {mode === 'edit' ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

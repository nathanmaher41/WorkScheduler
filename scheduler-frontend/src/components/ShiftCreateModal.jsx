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
  members,
  existingShift = null,
  mode = 'create',
  onShiftSaved = () => {},
  timeOffRequests = [],
  onShiftDeleted = () => {},
  workplaceHolidays = []
  }) {
  const [employee, setEmployee] = useState('');
  const [startHourMinute, setStartHourMinute] = useState('');
  const [endHourMinute, setEndHourMinute] = useState('');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('PM');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const selectedStr = new Date(selectedDate).toISOString().split('T')[0];

  const unavailableIds = timeOffRequests
    .filter((req) =>
      selectedStr >= req.start_date && selectedStr <= req.end_date
    )
    .map((req) => req.employee);


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
    if (mode === 'edit' && existingShift) {
      setEmployee(existingShift.employee?.toString() || '');
      const start = new Date(existingShift.start_time);
      const end = new Date(existingShift.end_time);

      let sh = start.getHours(), sm = start.getMinutes();
      let eh = end.getHours(), em = end.getMinutes();

      setStartPeriod(sh >= 12 ? 'PM' : 'AM');
      setEndPeriod(eh >= 12 ? 'PM' : 'AM');

      sh = sh % 12 || 12;
      eh = eh % 12 || 12;

      setStartHourMinute(`${sh}:${sm.toString().padStart(2, '0')}`);
      setEndHourMinute(`${eh}:${em.toString().padStart(2, '0')}`);

      setRole(existingShift.position || '');
      setNotes(existingShift.notes || '');
    } else {
      // reset for create mode
      setEmployee('');
      setStartHourMinute('');
      setEndHourMinute('');
      setStartPeriod('AM');
      setEndPeriod('PM');
      setRole('');
      setNotes('');
    }
  }, [isOpen, mode, existingShift]);

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
      if (!selectedDate) {
        alert('No date selected for the shift.');
        return;
      }

      const normalizeTime = (timeStr) => {
        const trimmed = timeStr.trim();
        if (trimmed === '') return null;
        if (!trimmed.includes(':')) return `${trimmed}:00`;
        if (trimmed.endsWith(':')) return `${trimmed}00`;
        return trimmed;
      };

      const startRaw = normalizeTime(startHourMinute);
      const endRaw = normalizeTime(endHourMinute);

      if (!startRaw || !endRaw) {
        alert('Please enter valid start and end times.');
        return;
      }

      const { hours: startH, minutes: startM } = convertTo24Hour(startRaw, startPeriod);
      const { hours: endH, minutes: endM } = convertTo24Hour(endRaw, endPeriod);

      if ([startH, startM, endH, endM].some((val) => isNaN(val))) {
        alert('Please enter a valid time.');
        return;
      }

      const [year, month, day] = selectedDate.split('-').map(Number);
      const start = new Date(year, month - 1, day); 
      if (isNaN(start.getTime())) {
        throw new RangeError('Invalid start date');
      }
      start.setHours(startH, startM, 0, 0);

      const end = new Date(year, month - 1, day);
      if (isNaN(end.getTime())) {
        throw new RangeError('Invalid end date');
      }
      end.setHours(endH, endM, 0, 0);

      const res = await axios({
        method: mode === 'edit' ? 'patch' : 'post',
        url:
          mode === 'edit'
            ? `/api/shifts/${existingShift.id}/`
            : `/api/schedules/${scheduleId}/shifts/create/`,
        data: {
          employee,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          position: role,
          notes,
        },
      });
      if (mode === 'edit') {
        onShiftSaved(res.data);
      } else {
        onCreate(res.data);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save shift', err);
      alert('Something went wrong.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{mode === 'edit' ? 'Edit Shift' : 'Create Shift'}</h2>
        {/* {warningMessage && (
          <div className="mb-4 p-3 rounded bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-500 text-sm">
            {warningMessage}
          </div>
        )} */}
        {(() => {
          if (!selectedDate) return null;

          const selectedStr = new Date(selectedDate).toISOString().split('T')[0];

          const holiday = workplaceHolidays.find(h => {
            const startStr = new Date(h.date).toISOString().split('T')[0];
            const endStr = h.end_date
              ? new Date(h.end_date).toISOString().split('T')[0]
              : startStr;

            return selectedStr >= startStr && selectedStr <= endStr;
          });

          if (!holiday) return null;

          const boxClasses = holiday.type === 'custom'
            ? 'bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-500'
            : 'bg-red-100 dark:bg-red-700 text-red-800 dark:text-red-100 border border-red-300 dark:border-red-500';

          const message = (() => {
            const hasTitle = holiday.title && holiday.title.trim();
            if (holiday.type === 'custom') {
              const [h, m] = holiday.start_time.split(':');
              const startHour = parseInt(h, 10);
              const startSuffix = startHour >= 12 ? 'PM' : 'AM';
              const startDisplayHour = startHour % 12 || 12;
              const start12 = `${startDisplayHour}:${m} ${startSuffix}`;

              const [eh, em] = holiday.end_time.split(':');
              const endHour = parseInt(eh, 10);
              const endSuffix = endHour >= 12 ? 'PM' : 'AM';
              const endDisplayHour = endHour % 12 || 12;
              const end12 = `${endDisplayHour}:${em} ${endSuffix}`;

              return hasTitle
                ? `⚠️ ${holiday.title} (${start12} - ${end12}) ${holiday.note ? ' — ' + holiday.note : ''} `
                : `⚠️ Altered Hours: ${start12} - ${end12} ${holiday.note ? ' — ' + holiday.note : ''}`;
            }

            return hasTitle
              ? `${holiday.title}${holiday.note ? ' — ' + holiday.note : ''}`
              : `🚫 This is a holiday (no work expected)${holiday.note ? ' — ' + holiday.note : ''}`;
          })();

          return (
            <div className={`mb-4 p-3 rounded text-sm ${boxClasses}`}>
              {message}
            </div>
          );
        })()}
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
              {members.filter(m => {
                if (!m || !m.id) return false;
                const getDayStr = (date) => date.toISOString().split('T')[0];
                const isOff = timeOffRequests.some(req => {
                  if (req.employee !== m.id) return false;
                  const selectedStr = getDayStr(new Date(selectedDate));
                  return selectedStr >= req.start_date && selectedStr <= req.end_date;
                });
                return !isOff;
              }).map((member) => (
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

          {mode === 'edit' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-red-600 hover:underline text-sm"
              >
                Delete this shift
              </button>
            </div>
          )}

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
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Delete Shift?</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete this shift? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await axios.delete(`/api/shifts/${existingShift.id}/delete/`);
                    onShiftDeleted(existingShift.id);
                    onClose();
                  } catch (err) {
                    console.error('Failed to delete shift', err);
                    alert('Something went wrong while deleting.');
                  }
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

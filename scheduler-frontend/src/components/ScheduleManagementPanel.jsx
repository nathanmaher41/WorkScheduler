import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ScheduleCreateModal from './ScheduleCreateModal';

export default function ScheduleManagementPanel({ calendarId }) {
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState({ confirmed_members: [], unconfirmed_members: [] });



  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('/api/schedules/', { params: { calendar_id: calendarId } });
      setSchedules(res.data);
      if (res.data.length > 0) setActiveSchedule(res.data[0]);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const handleSave = async (schedule) => {
    try {
        const res = await axios.patch(`/api/schedules/${schedule.id}/edit/`, {
        name: schedule.name,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        });

        const updatedSchedule = res.data;

        // Update schedules list
        setSchedules(prev => {
        const next = prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s);
        // Sync activeSchedule with updated reference
        if (activeSchedule?.id === updatedSchedule.id) {
            setActiveSchedule(updatedSchedule); // ← crucial
        }
        return next;
        });

        setEditingId(null);
    } catch (err) {
        console.error('Error saving schedule:', err);
    }
    };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/schedules/${id}/delete/`);
      setSchedules(prev => prev.filter(s => s.id !== id));
      if (activeSchedule?.id === id) setActiveSchedule(null);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const handlePushRelease = async () => {
    try {
      await axios.post(`/api/calendars/${calendarId}/schedules/${activeSchedule.id}/notify/`, { notes: releaseNotes });
      setReleaseNotes('');
    } catch (err) {
      console.error('Error pushing release:', err);
    }
  };

  const handleForceReset = async () => {
    try {
      await axios.post(`/api/schedules/${activeSchedule.id}/confirmations/reset/`);
      await fetchConfirmations(activeSchedule.id);
    } catch (err) {
      console.error('Error resetting confirmations:', err);
    }
  };

  const handleResendReminder = async () => {
    try {
      await axios.post(`/api/schedules/${activeSchedule.id}/remind-unconfirmed/`);
    } catch (err) {
      console.error('Error resending reminders:', err);
    }
  };


  const startResizing = (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', resizeSidebar);
    document.addEventListener('mouseup', stopResizing);
  };

  const resizeSidebar = (e) => {
    const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
    if (newWidth > 150 && newWidth < 600) {
      setSidebarWidth(newWidth);
    }
  };

  const stopResizing = () => {
    document.removeEventListener('mousemove', resizeSidebar);
    document.removeEventListener('mouseup', stopResizing);
  };

  useEffect(() => {
    if (activeSchedule?.id) {
        fetchConfirmations(activeSchedule.id);
    }
    }, [activeSchedule?.id]);

    const fetchConfirmations = async (scheduleId) => {
    try {
        const res = await axios.get(`/api/schedules/${scheduleId}/confirmations/`);
        setConfirmationData({
        confirmed_members: res.data.confirmed_members || [],
        unconfirmed_members: res.data.unconfirmed_members || [],
        });
    } catch (err) {
        console.error('Error fetching confirmations:', err);
    }
    };

  const editingSchedule = schedules.find(s => s.id === editingId);


  return (
    <div ref={containerRef} className="flex h-full relative">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="border-r dark:border-gray-700 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black dark:text-white">Schedules</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-sm px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            + Create
          </button>
        </div>
        <div className="space-y-2">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              className={`p-2 rounded cursor-pointer ${activeSchedule?.id === schedule.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => {
                const fresh = schedules.find(s => s.id === schedule.id);
                setActiveSchedule(fresh);
            }}
            >
              <div className="flex justify-between items-center">
                <span className="text-black dark:text-white font-medium">{schedule.name}</span>
                <div className="flex space-x-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(schedule.id); }} className="text-sm text-blue-600 hover:underline">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(schedule.id); }} className="text-sm text-red-600 hover:underline">Delete</button>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(schedule.start_date + 'T00:00:00').toLocaleDateString('en-US')} → {new Date(schedule.end_date + 'T00:00:00').toLocaleDateString('en-US')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Draggable divider */}
      <div
        ref={resizerRef}
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize bg-gray-300 dark:bg-gray-600"
        style={{ height: '100%' }}
      />

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeSchedule && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handlePushRelease} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Send Schedule</button>
              <button onClick={handleForceReset} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Reset Confirmations</button>
              <button onClick={handleResendReminder} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Remind Unconfirmed</button>
            </div>
            <div>
              <input
                placeholder="Release notes (optional)"
                value={releaseNotes}
                onChange={e => setReleaseNotes(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-black"
              />
            </div>
            <div className="flex gap-8">
              <div>
                <h4 className="text-md font-semibold mb-2 text-black dark:text-white">Confirmed</h4>
                <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-300">
                    {confirmationData.confirmed_members.map(member => (
                        <li key={member.id}>{member.first_name} {member.last_name}</li>
                    ))}
                </ul>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-2 text-black dark:text-white">Not Yet Confirmed</h4>
                <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-300">
                    {confirmationData.unconfirmed_members.map(member => (
                        <li key={member.id}>{member.first_name} {member.last_name}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {editingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Edit Schedule</h2>
              <input
                value={schedules.find(s => s.id === editingId)?.name || ''}
                onChange={e => setSchedules(prev => prev.map(s => s.id === editingId ? { ...s, name: e.target.value } : s))}
                className="w-full p-2 border border-gray-300 rounded mb-2 bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
              />
              <DatePicker
                dateFormat="MM/dd/yyyy"
                selected={editingSchedule?.start_date ? new Date(editingSchedule.start_date + 'T00:00:00') : null}
                onChange={date =>
                    setSchedules(prev =>
                    prev.map(s =>
                        s.id === editingId ? { ...s, start_date: date.toISOString().split('T')[0] } : s
                    )
                    )
                }
                placeholderText="Select start date"
                className="w-full p-2 border border-gray-300 rounded mb-4 bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                />
              <DatePicker
                    dateFormat="MM/dd/yyyy"
                    selected={editingSchedule?.end_date ? new Date(editingSchedule.end_date + 'T00:00:00') : null}
                    openToDate={editingSchedule?.start_date ? new Date(editingSchedule.start_date + 'T00:00:00') : undefined}
                    onChange={date =>
                        setSchedules(prev =>
                        prev.map(s =>
                            s.id === editingId ? { ...s, end_date: date.toISOString().split('T')[0] } : s
                        )
                        )
                    }
                    placeholderText="Select end date"
                    className="w-full p-2 border border-gray-300 rounded mb-4 bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                    />
              <div className="flex justify-end gap-2">
                <button onClick={() => handleSave(schedules.find(s => s.id === editingId))} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save</button>
                <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Confirm Deletion</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you'd like to delete this schedule? All shifts in this schedule will be deleted.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {showCreateModal && (
        <ScheduleCreateModal
            isOpen={true}
            onClose={() => setShowCreateModal(false)}
            onCreate={(newSchedule) => {
            setSchedules(prev => [...prev, newSchedule]);
            setActiveSchedule(newSchedule);
            setShowCreateModal(false);
            }}
            calendarId={calendarId}
            mode="create"
        />
        )}
      </div>
    </div>
  );
}

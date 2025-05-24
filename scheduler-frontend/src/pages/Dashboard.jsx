import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import ThemeToggle from '../components/ThemeToggle';
import CreateCalendarModal from '../components/CreateCalendarModal';
import CalendarCard from '../components/CalendarCard'
import JoinCalendarModal from '../components/JoinCalendarModal';


export default function Dashboard() {
  const [calendars, setCalendars] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);


  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const res = await axios.get('/api/calendars/');
        setCalendars(res.data);
      } catch (err) {
        console.error('Error fetching calendars:', err);
      }
    };
    fetchCalendars();
  }, []);

  useEffect(() => {
    if (!selectedCalendar) return;
    const fetchMembers = async () => {
      try {
        const res = await axios.get(`/api/calendars/${selectedCalendar.id}/members/`);
        setMembers(res.data);
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    };
    fetchMembers();
  }, [selectedCalendar]);

    const handleDeleteCalendar = async (calendarId) => {
        try {
            await axios.delete(`/api/calendars/${calendarId}/`);
            setCalendars((prev) => prev.filter((c) => c.id !== calendarId));
            if (selectedCalendar?.id === calendarId) {
            setSelectedCalendar(null);
            setMembers([]); // Clear sidebar if the selected one is deleted
            }
        } catch (err) {
            console.error('Error deleting calendar:', err);
            alert('Failed to delete calendar. Please try again.');
        }
    };

  const handleCreateCalendar = async (data) => {
    try {
        const res = await axios.post('/api/calendars/create/', data);
        setCalendars((prev) => [...prev, res.data]);
    } catch (err) {
        console.error('Error creating calendar:', err);
    } finally {
        setShowForm(false);
    }
  };  

  

  const joinCalendar = async (code) => {
    try {
        const res = await axios.post('/api/calendars/join/', { join_code: code });
        alert(res.data.message);
        // Refresh list
        const calendarsRes = await axios.get('/api/calendars/');
        setCalendars(calendarsRes.data);
    } catch (err) {
        alert('Failed to join calendar: ' + (err.response?.data?.error || 'Unknown error'));
        console.error('Join error:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 p-4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-purple-500">SchedulaLounge</h2>
        </div>
        <h3 className="text-lg font-semibold mb-2">Members</h3>
        {selectedCalendar ? (
          <ul className="space-y-3">
            {members.map((member) => (
                <li key={member.username}>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                    {member.role || 'None'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    {member.full_name || member.username} ({member.username})
                </p>
                </li>
            ))}
            </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a calendar</p>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Your Calendars</h1>
                <ThemeToggle />
            </div>
            <button
                onClick={() => setShowForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
                ➕ Create Calendar
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              🔗 Join Calendar
          </button>
            </div>
        <div className="space-y-4">
          {calendars.map((calendar) => (
            <CalendarCard
              key={calendar.id}
              calendar={calendar}
              isSelected={selectedCalendar?.id === calendar.id}
              isMenuOpen={openMenuId === calendar.id}
              onToggleMenu={() => setOpenMenuId(openMenuId === calendar.id ? null : calendar.id)}
              onSelect={setSelectedCalendar}
              onDelete={handleDeleteCalendar}
              onShare={(calendar) => alert(`Share link or message for ${calendar.name}`)}
            />

          ))}
        </div>
      </main>

      {showForm && (
        <CreateCalendarModal
          onClose={() => setShowForm(false)}
          onCreate={handleCreateCalendar}
        />
      )}
      {showJoinModal && (
        <JoinCalendarModal
          onClose={() => setShowJoinModal(false)}
          onJoin={async () => {
            setShowJoinModal(false);
            const calendarsRes = await axios.get('/api/calendars/');
            setCalendars(calendarsRes.data);
          }}
        />
      )}
    </div>
  );
}

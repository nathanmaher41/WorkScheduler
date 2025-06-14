import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function AnnouncementsPanel({ calendarId }) {
  const [announcement, setAnnouncement] = useState('');
  const [senderName, setSenderName] = useState('');
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [calendarId]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/api/calendars/${calendarId}/announcements/`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load announcement history:', err);
    }
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return;

    setSending(true);
    try {
      await axios.post(`/api/calendars/${calendarId}/announcements/send/`, {
        message: announcement,
        sender_name: senderName || undefined,
      });
      setStatus('success');
      setAnnouncement('');
      setSenderName('');
      fetchHistory(); // Refresh history
    } catch (err) {
      console.error('Failed to send announcement:', err);
      setStatus('error');
    } finally {
      setSending(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-2">Send New Announcement</h2>
        <textarea
          className="w-full border rounded p-2 dark:bg-gray-800 dark:text-white"
          rows={3}
          placeholder="Type your announcement here..."
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
        />
        <input
          type="text"
          className="w-full border rounded p-2 mt-2 dark:bg-gray-800 dark:text-white"
          placeholder="Sender name (e.g. Management)"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Leave blank to use your full name by default.
        </p>
        <div className="mt-2 flex gap-3 items-center">
          <button
            onClick={sendAnnouncement}
            disabled={sending}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
          {status === 'success' && <span className="text-green-600">✅ Sent!</span>}
          {status === 'error' && <span className="text-red-600">❌ Failed to send</span>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-2">Announcement History</h2>
        <ul className="divide-y divide-gray-300 dark:divide-gray-600">
          {history.length === 0 ? (
            <li className="text-sm text-gray-600 dark:text-gray-300">No announcements yet.</li>
          ) : (
            history.map((a) => {
              const dt = new Date(a.created_at);
              const formatted = `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}, ${dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;
              return (
                <li key={a.id} className="py-2 text-sm">
                  <div className="text-black dark:text-white">{a.message}</div>
                  <div className="text-xs text-gray-500">
                    {formatted} — <span className="font-semibold">{a.sender_name}</span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

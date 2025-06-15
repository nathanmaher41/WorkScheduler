import { useState, useEffect } from 'react';
import axios from '../utils/axios';

export default function HistoryPanel({ calendarId }) {
  const [history, setHistory] = useState([]);
  const [eventType, setEventType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [prevUrl, setPrevUrl] = useState('');
  const [nextUrl, setNextUrl] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [calendarId, eventType, startDate, endDate]);

  const fetchHistory = async (url = null) => {
    setLoading(true);
    try {
        const params = {
        ...(eventType !== 'all' && { type: eventType }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        page_size: 20,
        };

        const res = await axios.get(url || `/api/calendars/${calendarId}/history/`, { params });
        setHistory(res.data.results);
        setNextUrl(res.data.next);
        setPrevUrl(res.data.previous);
    } catch (err) {
        console.error('Error fetching history:', err);
    } finally {
        setLoading(false);
    }
    };

  const renderEntry = (entry) => {
    const { type, timestamp, data } = entry;
    const date = new Date(timestamp).toLocaleString();

    switch (type) {
      case 'swap_request':
        return (
          <p><strong>Swap:</strong> {data.requester} ↔ {data.target_user} (Shift #{data.shift_id}) — <em>{data.status}</em></p>
        );
      case 'take_request':
        return (
          <p><strong>Take:</strong> {data.requester} → {data.target_user} (Shift #{data.shift_id}) — <em>{data.status}</em></p>
        );
      case 'time_off':
        return (
          <p><strong>Time Off:</strong> {data.user} ({data.start_date} to {data.end_date}) — {data.reason}</p>
        );
      case 'schedule_release':
        return (
          <p><strong>Schedule Release:</strong> {data.sender} — "{data.message}"</p>
        );
      default:
        return <p>Unknown event type</p>;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold text-black dark:text-white">History</h2>

      <div className="flex flex-wrap gap-4 items-center ">
        <select value={eventType} onChange={e => setEventType(e.target.value)} className="p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500">
          <option value="all">All Types</option>
          <option value="swap_request">Swap Requests</option>
          <option value="take_request">Take Requests</option>
          <option value="time_off">Approved Time Off</option>
          <option value="schedule_release">Schedule Releases</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto pr-1 mt-2">
        <ul className="space-y-2">
            {history.map((entry, idx) => (
            <li key={idx} className="p-3 border rounded bg-white dark:bg-gray-800 text-black dark:text-white">
                <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(entry.timestamp).toLocaleString()}</div>
                {renderEntry(entry)}
            </li>
            ))}
        </ul>
        <div className="flex justify-between mt-2">
            <button
                onClick={() => fetchHistory(prevUrl)}
                disabled={!prevUrl}
                className="px-4 py-1 rounded border bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
                Previous
            </button>
            <button
                onClick={() => fetchHistory(nextUrl)}
                disabled={!nextUrl}
                className="px-4 py-1 rounded border bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
                Next
            </button>
            </div>
        </div>
      )}
    </div>
  );
}

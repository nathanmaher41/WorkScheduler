import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Swap Requests', value: 'SWAP_REQUEST' },
  { label: 'Take Requests', value: 'TAKE_REQUEST' },
  { label: 'Schedule Releases', value: 'SCHEDULE_RELEASE' },
  { label: 'Request Off Approvals', value: 'REQUEST_OFF_APPROVAL' },
];

export default function DashboardInboxModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      try {
        let url = '/api/inbox/';
        const params = new URLSearchParams();
        if (activeTab) params.append('type', activeTab);
        if (filterUnread) params.append('read', 'false');
        if ([...params].length > 0) url += `?${params.toString()}`;

        const res = await axios.get(url);
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch inbox notifications:', err);
      }
    };

    fetchNotifications();
  }, [isOpen, activeTab, filterUnread]);

  if (!isOpen) return null;

  const grouped = notifications.reduce((acc, note) => {
    const calendarName = note.calendar?.name || 'Other';
    if (!acc[calendarName]) acc[calendarName] = [];
    acc[calendarName].push(note);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-4 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent">
        <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Inbox</h2>
          <button
            className="text-gray-500 hover:text-gray-800 dark:hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex space-x-2 mb-2">
          <button
            className={`text-sm px-2 py-1 rounded ${filterUnread ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-700 text-black dark:text-white'}`}
            onClick={() => setFilterUnread(!filterUnread)}
          >
            {filterUnread ? 'Show All' : 'Show Unread'}
          </button>
        </div>

        <div className="relative mb-4">
          <div className="overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent">
            <div className="flex space-x-2 w-max pr-2 pb-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-1 rounded-full font-semibold text-sm transition whitespace-nowrap ${
                    activeTab === tab.value ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {Object.entries(grouped).length === 0 ? (
          <p className="text-gray-500 dark:text-gray-300">No notifications found.</p>
        ) : (
          Object.entries(grouped).map(([calendarName, notes]) => (
            <div key={calendarName} className="mb-6">
              <h3 className="text-md font-bold mt-4 mb-2 text-purple-500">{calendarName}</h3>
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className={`p-3 rounded transition border 
                      ${note.is_active ? 'border-blue-400' : 'border-transparent'} 
                      ${note.is_read ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-800'}
                    `}
                  >
                    <p className="text-sm text-gray-900 dark:text-white">{note.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(note.created_at).toLocaleDateString() + ', ' + new Date(note.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

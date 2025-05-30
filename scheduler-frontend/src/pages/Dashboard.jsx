import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import CreateCalendarModal from '../components/CreateCalendarModal';
import CalendarCard from '../components/CalendarCard';
import JoinCalendarModal from '../components/JoinCalendarModal';
import UserSettingsModal from '../components/UserSettingsModal';

export default function Dashboard() {
   const [calendars, setCalendars] = useState([]);
   const [members, setMembers] = useState([]);
   const [selectedCalendar, setSelectedCalendar] = useState(null);
   const [showForm, setShowForm] = useState(false);
   const [showJoinModal, setShowJoinModal] = useState(false);
   const [showSettingsModal, setShowSettingsModal] = useState(false);
   const [openMenuId, setOpenMenuId] = useState(null);
   const [sidebarVisible, setSidebarVisible] = useState(true);
   const [dropdownOpen, setDropdownOpen] = useState(false);
   const [sortMethod, setSortMethod] = useState('alphabetical');
   const [roleFilters, setRoleFilters] = useState([]);

   const currentUsername = localStorage.getItem('username');

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
               setMembers([]);
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
           const calendarsRes = await axios.get('/api/calendars/');
           setCalendars(calendarsRes.data);
       } catch (err) {
           alert('Failed to join calendar: ' + (err.response?.data?.error || 'Unknown error'));
           console.error('Join error:', err);
       }
   };

   const isCurrentUserAdmin = members.some(
       (member) => member.username === currentUsername && member.is_admin
   );

   const allRoles = Array.from(new Set(members.map((m) => m.role).filter(Boolean)));
   if (!allRoles.includes('Admin')) allRoles.push('Admin');

   const filteredMembers = members.filter((member) => {
       if (roleFilters.length === 0) return true;
       return (
           (member.role && roleFilters.includes(member.role)) ||
           (member.is_admin && roleFilters.includes('Admin'))
       );
   });

   const sortedMembers = [...filteredMembers].sort((a, b) => {
       if (sortMethod === 'role') {
           return (a.role || '').localeCompare(b.role || '');
       }
       return (a.full_name || a.username).localeCompare(b.full_name || b.username);
   });

   return (
       <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
           <aside
               className={`transition-all duration-500 ease-in-out bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${
                   sidebarVisible ? 'w-64 p-4' : 'w-0 overflow-hidden p-0'
               }`}
           >
               {sidebarVisible && (
                   <>
                       <div className="flex items-center justify-between mb-6">
                           <h2 className="text-xl font-bold text-purple-500">ScheduLounge</h2>
                       </div>
                       <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sort by:</label>
                       <select
                           value={sortMethod}
                           onChange={(e) => setSortMethod(e.target.value)}
                           className="w-full text-xs mb-3 px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600"
                       >
                           <option value="alphabetical">Alphabetical</option>
                           <option value="role">Role</option>
                       </select>

                       <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 mt-2">Filter by role:</label>
                       <div className="space-y-1 mb-3">
                           {allRoles.map((role) => (
                               <label key={role} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                                   <input
                                       type="checkbox"
                                       className="mr-2"
                                       checked={roleFilters.includes(role)}
                                       onChange={(e) => {
                                           if (e.target.checked) {
                                               setRoleFilters((prev) => [...prev, role]);
                                           } else {
                                               setRoleFilters((prev) => prev.filter((r) => r !== role));
                                           }
                                       }}
                                   />
                                   {role}
                               </label>
                           ))}
                       </div>

                       <h3 className="text-lg font-semibold mb-2">Members</h3>
                       <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                           <span className="not-italic inline-block mr-1">ⓘ</span>
                           Members highlighted in <span className="text-purple-500 font-medium not-italic">purple</span> have admin permissions.
                       </p>
                       {selectedCalendar ? (
                           <ul className="space-y-3">
                               {sortedMembers.map((member) => (
                                   <li key={member.username}>
                                       <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                                           {member.role || 'None'}
                                       </p>
                                       <p
                                           className={`text-sm ${
                                               member.is_admin
                                                   ? 'text-purple-500 font-semibold'
                                                   : 'text-gray-700 dark:text-gray-300'
                                           }`}
                                       >
                                           {member.full_name || member.username} ({member.username})
                                       </p>
                                   </li>
                               ))}
                           </ul>
                       ) : (
                           <p className="text-sm text-gray-500 dark:text-gray-400">Select a calendar</p>
                       )}
                   </>
               )}
           </aside>

           <main className="flex-1 transition-all duration-500 ease-in-out p-6 space-y-4">
               <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                   <div className="flex items-center gap-4">
                       <button onClick={() => setSidebarVisible(!sidebarVisible)} className="text-sm text-gray-500">
                           {sidebarVisible ? 'Hide Members' : 'Show Members'}
                       </button>
                       {!sidebarVisible && <h2 className="text-3xl font-extrabold text-purple-500">ScheduLounge</h2>}
                       <h1 className="text-2xl font-bold">Your Calendars</h1>
                   </div>
                   <div className="flex gap-2 relative">
                       <div className="relative">
                           <button
                               onClick={() => setDropdownOpen(!dropdownOpen)}
                               className="bg-purple-500 dark:bg-purple-600 text-black dark:text-white px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-500"
                           >
                               ➕ Options
                           </button>
                           {dropdownOpen && (
                               <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 shadow-lg rounded-md z-10">
                                   <button
                                       onClick={() => {
                                           setShowForm(true);
                                           setDropdownOpen(false);
                                       }}
                                       className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                   >
                                       ╋ Create Calendar
                                   </button>
                                   <button
                                       onClick={() => {
                                           setShowJoinModal(true);
                                           setDropdownOpen(false);
                                       }}
                                       className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                   >
                                       🔗 Join Calendar
                                   </button>
                               </div>
                           )}
                       </div>
                       <button
                           onClick={() => setShowSettingsModal(true)}
                           className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                       >
                           ⚙️ Settings
                       </button>
                   </div>
               </div>

               <div className={`grid gap-4 ${!sidebarVisible ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                   {calendars.map((calendar) => (
                       <CalendarCard
                           key={calendar.id}
                           calendar={calendar}
                           isSelected={selectedCalendar?.id === calendar.id}
                           isMenuOpen={openMenuId === calendar.id}
                           onToggleMenu={() => setOpenMenuId(openMenuId === calendar.id ? null : calendar.id)}
                           onSelect={(calendar) => {
                               setSelectedCalendar(calendar);
                               setOpenMenuId(null);
                           }}
                           onDelete={isCurrentUserAdmin ? handleDeleteCalendar : null}
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
           {showSettingsModal && (
               <UserSettingsModal
                   onClose={() => setShowSettingsModal(false)}
               />
           )}
       </div>
   );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../utils/axios';
import SwapsAndTakesPanel from '../components/SwapsAndTakesPanel';
import TimeOffRequestsPanel from '../components/TimeOffRequestPanel';
import RolesPanel from '../components/RolesPanel';
import { useLocation } from 'react-router-dom';
import PermissionsPanel from '../components/PermissionsPanel';
import MembershipManagementPanel from '../components/MemberManagementPanel';
import AnnouncementsPanel from '../components/AnnouncmentsPanel';
import ScheduleManagementPanel from '../components/ScheduleManagementPanel';
import HistoryPanel from '../components/HistoryPanel';


const tabs = [
  { key: 'members', label: 'Member Management' },
  { key: 'roles', label: 'Role Management' },
  { key: 'permissions', label: 'Permissions and Rules'},
  { key: 'schedule', label: 'Schedule Management' },
  { key: 'timeoff', label: 'Time Off Requests' },
  { key: 'swaps', label: 'Swaps & Takes' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'history', label: 'History Log' },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('inbox');
  const { id: calendarId } = useParams();
  const navigate = useNavigate();
  const [calendarRoles, setCalendarRoles] = useState([]);
  const handleBack = () => navigate(`/calendar/${calendarId}`);
  const [calendar, setCalendar] = useState(null);
  const [members, setMembers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState([]);
  const [memberPermissions, setMemberPermissions] = useState([]);

  // const location = useLocation();
  // const { state } = location;
  // const passedRoles = state?.roles || [];

  const handleUpdateSettings = async (calendarId, updatedFields) => {
    try {
      const res = await axios.patch(`/api/calendars/${calendarId}/`, updatedFields);
      setCalendar(prev => ({
        ...prev,
        ...res.data,
      }));
    } catch (err) {
      console.error('Failed to update calendar settings:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [calendarRes, membersRes, userRes, permissionsRes] = await Promise.all([
          axios.get(`/api/calendars/${calendarId}/`),
          axios.get(`/api/calendars/${calendarId}/members/`),
          axios.get('/api/user/'),
          axios.get('/api/calendars/permissions/'),
        ]);

        setCalendarRoles(calendarRes.data.roles);
        setCalendar(calendarRes.data);
        setMembers(membersRes.data);
        setCurrentUserId(userRes.data.id);
        setAllPermissions(permissionsRes.data);

        const userMembership = membersRes.data.find(m => m.id === userRes.data.id);
          if (!userMembership) throw new Error("Current user not found in members list");

          const effectivePerms = await axios.get(
            `/api/calendars/${calendarId}/members/${userMembership.membership_id}/effective-permissions/`
          );
          setMemberPermissions(effectivePerms.data);

      } catch (err) {
        console.error('Failed to load calendar, members, or user:', err);
      }
    };

    fetchData();
  }, [calendarId]);


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button
            onClick={handleBack}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            ← Back to Calendar
          </button>
        </div>

        <div className="flex gap-4">
          {/* Sidebar */}
          <div className="w-64 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`text-left px-3 py-2 rounded transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-black dark:text-white'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Animated Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-4 bg-white dark:bg-gray-800 rounded shadow"
          >
            {activeTab === 'members' &&<MembershipManagementPanel calendarId={calendarId} roles={calendarRoles} currentUserId={currentUserId} permissions={memberPermissions}
            allPermissions={allPermissions} members={members}/>}
            {activeTab === 'roles' && <RolesPanel calendarId={calendarId} roles={calendarRoles} />}
            {activeTab === 'permissions' && (
              <PermissionsPanel
                calendarId={calendarId}
                calendar={calendar}
                roles={calendarRoles}
                members={members}
                onUpdateSettings={handleUpdateSettings}
              />
            )}
            {activeTab === 'schedule' && <ScheduleManagementPanel calendarId={calendarId}/>}
            {activeTab === 'timeoff' && <TimeOffRequestsPanel calendarId={calendarId} />}
            {activeTab === 'swaps' && <SwapsAndTakesPanel calendarId={calendarId} />} {/* ✅ */}
            {activeTab === 'announcements' && <AnnouncementsPanel calendarId={calendarId} />}
            {activeTab === 'history' && <HistoryPanel calendarId={calendarId}/>}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

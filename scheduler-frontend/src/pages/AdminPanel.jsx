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


export default function AdminPanel() {
  //xconst [activeTab, setActiveTab] = useState(null);
  const { id: calendarId } = useParams();
  const navigate = useNavigate();
  const [calendarRoles, setCalendarRoles] = useState([]);
  const handleBack = () => navigate(`/calendar/${calendarId}`);
  const [calendar, setCalendar] = useState(null);
  const [members, setMembers] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState([]);
  const [memberPermissions, setMemberPermissions] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);


  // const location = useLocation();
  // const { state } = location;
  // const passedRoles = state?.roles || [];

  const tabs = [
  {
    key: 'members',
    label: '👥 Members',
    permissionCheck: () =>
      userHasPermission('invite_remove_members') || userHasPermission('assign_roles'),
  },
  {
    key: 'schedule',
    label: '📅 Schedule Management',
    permission: 'create_edit_delete_schedules',
  },
  {
    key: 'swaps',
    label: '🔁 Swaps & Takes',
    permissionCheck: () =>
      userHasPermission('approve_reject_swap_requests') || userHasPermission('approve_reject_take_requests'),
  },
  {
    key: 'timeoff',
    label: '🛌 Time Off Requests',
    permission: 'approve_reject_time_off',
  },
  {
    key: 'roles',
    label: '🏷️ Roles',
    permission: 'manage_roles',
  },
  {
    key: 'permissions',
    label: '🔐 Permissions',
    permission: 'promote_demote_admins',
  },
  {
    key: 'announcements',
    label: '📣 Announcements',
    permission: 'send_announcements',
  },
  {
    key: 'history',
    label: '📜 History',
    permissionCheck: () => currentMember?.is_admin,
  },
];


  function userHasPermission(perm) {
    if (!perm || currentMember?.is_admin) return true;
    return Array.isArray(memberPermissions) && memberPermissions.some(p => p.codename === perm);
  }

  const userAllowedTabs = tabs.filter(t =>
    t.permissionCheck ? t.permissionCheck() : userHasPermission(t.permission)
  );

  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (userAllowedTabs.length > 0 && !activeTab) {
      setActiveTab(userAllowedTabs[0].key);
    }
  }, [userAllowedTabs]);

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
        console.log(membersRes.data);
        const matchedMember = membersRes.data.find(m => m.user_id === userRes.data.id);
        if (!matchedMember) throw new Error("Current user not found in members list");

        setCurrentMember(matchedMember);

        const permsRes = await axios.get(
          `/api/calendars/${calendarId}/members/${matchedMember.id}/effective-permissions/`
        );
        setMemberPermissions(permsRes.data.permissions || []);


      } catch (err) {
        console.error('Failed to load calendar, members, or user:', err);
      }
    };

    fetchData();
  }, [calendarId]);

  console.log(memberPermissions);
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
            {userAllowedTabs.map((tab) => (
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

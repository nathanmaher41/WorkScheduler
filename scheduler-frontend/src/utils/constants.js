export const PERMISSION_SECTIONS = [
  {
    label: '🔐 General Admin Permissions',
    permissions: [
      'manage_calendar_settings',
      'manage_roles',
      'manage_colors',
    ],
  },
  {
    label: '📅 Schedule & Shift Management',
    permissions: [
      'create_edit_delete_schedules',
      'create_edit_delete_shifts',
      'approve_reject_swap_requests',
      'approve_reject_take_requests',
    ],
  },
  {
    label: '📆 Time Off & Holiday Management',
    permissions: [
      'approve_reject_time_off',
      'manage_holidays',
    ],
  },
  {
    label: '👥 Member Management',
    permissions: [
      'invite_remove_members',
      'assign_roles',
      'promote_demote_admins',
    ],
  },
  {
    label: '🔔 Notification & Communication',
    permissions: [
      'send_announcements',
    ],
  },
];

export const PERMISSION_SECTIONS = [
  {
    label: '🔐 General Admin Permissions',
    permissions: [
      'manage_calendar_settings', //calendarSettingsModal
      'manage_roles', //admin panel
      'manage_colors', //admin panel
    ],
  },
  {
    label: '📅 Schedule & Shift Management',
    permissions: [
      'create_edit_delete_schedules', //schedules + admin panel
      'create_edit_delete_shifts', //shift create modal, edit modal, shift modal
      'approve_reject_swap_requests', //admin panel
      'approve_reject_take_requests', //admin panel
    ],
  },
  {
    label: '📆 Time Off & Holiday Management',
    permissions: [
      'approve_reject_time_off', //admin panel
      'manage_holidays', //main schedule holiday modal/request off modal, time off modal for edit
    ],
  },
  {
    label: '👥 Member Management',
    permissions: [
      'invite_remove_members', //calendar card and admin panel
      'assign_roles', //admin panel
      'promote_demote_admins', //admin panel
    ],
  },
  {
    label: '🔔 Notification & Communication',
    permissions: [
      'send_announcements', //admin panel
    ],
  },
];

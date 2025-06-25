export const PERMISSION_SECTIONS = [
  {
    label: '🔐 General Admin Permissions',
    permissions: [
      'manage_calendar_settings', //calendarSettingsModal DONE DONE DONE
      'manage_roles', //admin panel DONE DONE DONE
    ],
  },
  {
    label: '📅 Schedule & Shift Management',
    permissions: [
      'create_edit_delete_schedules', //schedules + admin panel DONE DONE DONE DONE
      'manage_schedule_pushes_and_confirmations', //DONE DONE DONE DONE
      'create_edit_delete_shifts', //shift create modal, edit modal, shift modal DONE DONE DONE
      'approve_reject_swap_requests', //admin panel DONE pr sure done will triple test
      'approve_reject_take_requests', //admin panel DONE pr sure done will triple test
    ],
  },
  {
    label: '📆 Time Off & Holiday Management',
    permissions: [
      'approve_reject_time_off', //admin panel DONE DONE DONE
      'manage_holidays', //main schedule holiday modal/request off modal, time off modal for edit DONE DONE DONE DONE
    ],
  },
  {
    label: '👥 Member Management',
    permissions: [
      'invite_remove_members', //calendar card and admin panel (Do I need to do calendar card) DONE (need to test invite still but should work)
      'assign_roles', //admin panel DONE DONE DONE
      'manage_colors', //admin panel DONE DONE DONE
      'promote_demote_admins', //admin panel DONE DONE DONE DONE
    ],
  },
  {
    label: '🔔 Notification & Communication',
    permissions: [
      'send_announcements', //admin panel DONE
    ],
  },
];

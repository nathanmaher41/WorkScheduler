
# ✅ Permissions-Based Conditional Rendering

## 🔐 General Admin Permissions
- [] **Manage Calendar Settings**
  - Conditionally render general, rules, role management sections in `CalendarSettingsModal`
- [x] **Manage Roles**
  - Allow toggling roles and editing role names
- [x] **Manage Colors**
  - _(Planned for removal)_

## 📅 Schedule & Shift Management
- [x] **Create/Edit/Delete Schedules**
  - Show kebab dropdown on schedule cards
  - Show “Create Schedule” button in `CalendarView`
- [x] **Create/Edit/Delete Shifts**
  - Conditionally render `ShiftCreateModal`
- [x] **Approve/Reject Swap Requests**
  - Conditionally show review queue in Admin Panel (not yet built)
- [x] **Approve/Reject Take Requests**
  - Admin panel logic to handle takes (not yet built)

## 📆 Time Off & Holiday Management
- [x] **Approve/Reject Time Off**
  - Admin panel review functionality (not yet built)
- [x] **Manage Holidays**
  - Show holiday creation tools in `RequestOffModal`
  - Add **Holiday Modal** to edit/delete holidays

## 👥 Member Management
- [x] **Invite/Remove Members**
  - Admin panel functionality (not yet built)
- [x] **Assign Roles**
  - Admin panel role assignment interface
- [x] **Promote/Demote Admins**
  - Conditionally show `PermissionsPanel` in `SettingsModal`

## 🔔 Notification & Communication
- [x] **Send Announcements**
  - Admin panel interface (not yet built)

## 🚨 Danger Zone
- [x] Only display if user has **all permissions** ISADMIN

# 💡 Quality of Life Improvements

- [x] **Calendar Start/End Date Sync**
  - When clicking a future month start date, ensure end date is set to same month
- [ ] **Default Role on Calendar Creation**
  - If admin leaves role blank, fallback to `"None"` or skip adding role
- [x] **Notes in Shift Creation**
  - Show and persist `notes` input in `ShiftCreateModal`
- [ ] **Login via Username or Email**
  - Allow flexible login with either
- [ ] **Holiday Edit/Delete Modal**
  - New modal for updating or removing workplace holidays
- [x] **Show Role in Shift Modal**
  - Add user’s role next to name in `ShiftSwapModal` / `ShiftCreateModal`

# ⚙️ Rules Section (Settings Modal)
- [ ] **Allow shift swaps without admin approval**
- [ ] **Require admin approval for take shift requests**
- [ ] Add toggles in Rules section
- [ ] Wire toggles to backend and integrate into admin panel logic

# 🛠️ Admin Panel (Major Feature)
- [ ] Review + approve swap/take/off requests
- [ ] Manage member invites/removals
- [ ] Assign roles, promote/demote admins
- [ ] Send announcements
- [ ] Respect permission gating per section

# 📢 Schedule Release Notifications
- [ ] Implement “Push Schedule” button
- [ ] Trigger inbox/push notification to members

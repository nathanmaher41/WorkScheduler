
# ✅ Permissions-Based Conditional Rendering

## 🔐 General Admin Permissions
- [ ] **Manage Calendar Settings**
  - Conditionally render general, rules, role management sections in `CalendarSettingsModal`
- [ ] **Manage Roles**
  - Allow toggling roles and editing role names
- [ ] **Manage Colors**
  - _(Planned for removal)_

## 📅 Schedule & Shift Management
- [ ] **Create/Edit/Delete Schedules**
  - Show kebab dropdown on schedule cards
  - Show “Create Schedule” button in `CalendarView`
- [ ] **Create/Edit/Delete Shifts**
  - Conditionally render `ShiftCreateModal`
- [ ] **Approve/Reject Swap Requests**
  - Conditionally show review queue in Admin Panel (not yet built)
- [ ] **Approve/Reject Take Requests**
  - Admin panel logic to handle takes (not yet built)

## 📆 Time Off & Holiday Management
- [ ] **Approve/Reject Time Off**
  - Admin panel review functionality (not yet built)
- [ ] **Manage Holidays**
  - Show holiday creation tools in `RequestOffModal`
  - Add **Holiday Modal** to edit/delete holidays

## 👥 Member Management
- [ ] **Invite/Remove Members**
  - Admin panel functionality (not yet built)
- [ ] **Assign Roles**
  - Admin panel role assignment interface
- [ ] **Promote/Demote Admins**
  - Conditionally show `PermissionsPanel` in `SettingsModal`

## 🔔 Notification & Communication
- [ ] **Send Announcements**
  - Admin panel interface (not yet built)

## 🚨 Danger Zone
- [ ] Only display if user has **all permissions**

# 💡 Quality of Life Improvements

- [ ] **Calendar Start/End Date Sync**
  - When clicking a future month start date, ensure end date is set to same month
- [ ] **Default Role on Calendar Creation**
  - If admin leaves role blank, fallback to `"None"` or skip adding role
- [ ] **Notes in Shift Creation**
  - Show and persist `notes` input in `ShiftCreateModal`
- [ ] **Login via Username or Email**
  - Allow flexible login with either
- [ ] **Holiday Edit/Delete Modal**
  - New modal for updating or removing workplace holidays
- [ ] **Show Role in Shift Modal**
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

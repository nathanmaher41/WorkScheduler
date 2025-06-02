
# ✅ WorkScheduler Feature Roadmap

## 🟢 Current Features
- [x] User Registration & Activation (email-based)
- [x] JWT Authentication
- [x] Calendar creation & joining (via code)
- [x] Schedule creation (date-bounded)
- [x] Shift creation per schedule
- [x] Admin permissions on schedules
- [x] Swap request & approval system (basic)

---

## 🔨 Near-Term Improvements

### 🔐 Permissions & Role UX
- [x] Hide "Create Shift" for non-admins
- [x] Remove `ADMIN -` prefix in shift dropdown (keep in dashboard only)
- [x] Color-code shifts by user’s calendar color

### 🗂️ Sorting & Filtering
- [x] Sort members by:
  - [x] Alphabetical
  - [x] Role
- [x] Filter calendar view by:
  - [x] Selected employee
  - [x] "My shifts only"

### 📅 View Experience
- [x] Improve week & day views
- [x] Highlight current day more clearly
- [ ] Show empty days as visually distinct
- [ ] Add hover or click tooltips on shifts

---

## ⚙️ Calendar & Schedule Settings
- [ ] Add calendar settings modal/page
  - [ ] Promote/demote admin status
  - [ ] Toggle "admin swap approval required"
  - [ ] Assign permissions by role group
- [ ] Prevent shift creation on closed days
- [ ] Add workplace-wide holidays
- [ ] Request days off on main calendar
- [ ] Inbox
- [ ] Ask for a shift without swapping 
  - [ ] Admin approval required so not too many hours

---

## 🔄 Shift Swapping Flow
- [x] UI for selecting swap target shift
- [x] Pending swap queue
- [ ] Employee + Admin approvals
- [x] Rejection flow
- [ ] Push notifications or email alert

---

## 🔔 Notifications & Communication
- [ ] SendGrid integration (activation, invites)
- [ ] Twilio integration (SMS reminders)
- [ ] Optional phone verification
- [ ] Push notifications:
  - [ ] New shifts
  - [ ] Swaps requested
  - [ ] Take/Give requested
  - [ ] New schedule release
  - [ ] Approvals

---

## 🧪 Admin Tools & History
- [ ] Activity/audit logs (who changed what, when)
- [ ] View user schedule history
- [ ] Export calendar as PDF or CSV
- [ ] Backup/restore calendar state

---

## 🧼 Quality-of-Life / UX
- [ ] Better error handling + toasts
- [ ] Show loading states when fetching
- [x] Date/time bugs around timezones fully resolved
- [ ] Consistent visual styling across views
- [ ] Middle Name showing as well as pronouns
- [x] Highlight admins in dashboard


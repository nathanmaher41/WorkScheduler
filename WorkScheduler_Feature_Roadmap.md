
# ✅ WorkScheduler Feature Roadmap

## 🟢 Current Features
- [x] User Registration & Activation (email-based)
- [x] JWT Authentication
- [x] Calendar creation & joining (via code)
- [x] Schedule creation (date-bounded)
- [x] Shift creation per schedule
- [x] Admin permissions on schedules
- [x] Swap request & approval system (basic)
- [x] edit calendars, schedules, and shifts
- [x] delete calendars, schedules, and shifts

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
- [o] Prevent shift creation on closed days
- [x] Add workplace-wide holidays
- [x] Request days off on main calendar
- [ ] Publishing Schedules
- [x] Inbox
- [x] Ask for a shift without swapping 
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
- [ ] See who has and hasn't seen the new schedule
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

Side notes:
When creating a calendar if admin does not put role it defaults to NONE
We don't leverage notes section in create shift
We also don't say the role in the shift modal
What to put in settings modal for calendar:
 - changing name of calendar
 - Promoting/demoting admin
 - giving privelages by role
 - changing your color
 - changing your role
 - admin allowing people to change their role (default on)
 - non admin's having the ability to change their role
 - allowing shift swaps without approval from admin (default no admin approval)
logging in with username or email
MOBILE CANT GET PAST LOGIN!!
When creating a schedule and clicking a start date in a different month, end date should update to that month not go back to current date

NEXT TODO: Cancel/Delete your OWN time off request.
from django.db import models

# Create your models here.

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
import uuid

class User(AbstractUser):
    middle_name = models.CharField(max_length=30, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    pronouns = models.CharField(max_length=50, blank=True, null=True)
    show_pronouns = models.BooleanField(default=True)
    show_middle_name = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=True)
    notify_sms = models.BooleanField(default=False)

class Schedule(models.Model):
    name = models.CharField(max_length=100)
    calendar = models.ForeignKey('Calendar', on_delete=models.CASCADE, related_name='schedules', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedules_created')
    start_date = models.DateField()
    end_date = models.DateField()
    is_published = models.BooleanField(default=False)
    acknowledged_by = models.ManyToManyField(User, related_name='acknowledged_schedules', blank=True)
    require_admin_swap_approval = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

class ScheduleMembership(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
        ('viewer', 'Viewer'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    class Meta:
        unique_together = ('user', 'schedule')

    def __str__(self):
        return f"{self.user.username} - {self.schedule.name} ({self.role})"

class Shift(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='shifts')
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shifts')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    position = models.CharField(max_length=100)
    is_swap_pending = models.BooleanField(default=False)
    swap_requested_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='swap_requests')
    swap_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='swap_approvals')
    swap_with = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    require_admin_swap_approval = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.employee.username} - {self.start_time} to {self.end_time}"

class TimeOffRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    )

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_off_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.employee.username}: {self.start_date} to {self.end_date} ({self.status})"

User = get_user_model()

class Calendar(models.Model):
    def generate_join_code():
        chars = string.ascii_uppercase + string.digits
        return ''.join(random.choices(chars, k=6))
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_calendars')
    members = models.ManyToManyField(User, through='CalendarMembership', related_name='calendars')
    join_code = models.CharField(max_length=12, unique=True, default=generate_join_code)

    def __str__(self):
        return self.name

class CalendarRole(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name="roles")
    name = models.CharField(max_length=50)

    class Meta:
        unique_together = ('calendar', 'name')

    def __str__(self):
        return f"{self.name} ({self.calendar.name})"

class CalendarMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE)
    title = models.ForeignKey(CalendarRole, null=True, blank=True, on_delete=models.SET_NULL)  # display role/title
    is_admin = models.BooleanField(default=False)  # permission flag
    color = models.CharField(max_length=7, blank=True, null=True)

    class Meta:
        unique_together = ('user', 'calendar')
    
class ShiftSwapRequest(models.Model):
    requesting_shift = models.ForeignKey(Shift, related_name='swap_requests_sent', on_delete=models.CASCADE)
    target_shift = models.ForeignKey(Shift, related_name='swap_requests_received', on_delete=models.CASCADE)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_by_target = models.BooleanField(default=False)
    approved_by_admin = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.requested_by.username} requests {self.target_shift} in exchange for {self.requesting_shift}"


class ShiftTakeRequest(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='take_requests_sent')
    requested_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='take_requests_received')
    approved_by_target = models.BooleanField(default=False)
    approved_by_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.requested_by.username} → take {self.shift} from {self.requested_to.username}"

class InboxNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('SWAP_REQUEST', 'Swap Request'),
        ('TAKE_REQUEST', 'Take Request'),
        ('SCHEDULE_RELEASE', 'Schedule Release'),
        ('REQUEST_OFF_APPROVAL', 'Request Off Approval'),
        # Add more as needed
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=32, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    related_object_id = models.IntegerField(null=True, blank=True)  # optional: link to shift/schedule/etc.
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')

    def __str__(self):
        return f"{self.user} - {self.notification_type} - {self.message[:20]}"

# models.py
class WorkplaceHoliday(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE)
    date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    type = models.CharField(
        max_length=10,
        choices=[
            ('off', 'Day Off'),
            ('half', 'Half Day'),
            ('custom', 'Custom Hours')
        ]
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    title = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.calendar.name} — {self.date} ({self.get_type_display()})"
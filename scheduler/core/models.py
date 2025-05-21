from django.db import models

# Create your models here.

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    # No global role — handled per schedule via ScheduleMembership
    pass

class Schedule(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedules_created')
    start_date = models.DateField()
    end_date = models.DateField()
    is_published = models.BooleanField(default=False)
    acknowledged_by = models.ManyToManyField(User, related_name='acknowledged_schedules', blank=True)

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

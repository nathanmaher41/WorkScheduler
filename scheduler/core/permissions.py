from rest_framework import permissions
from .models import ScheduleMembership, CalendarMembership
from rest_framework.permissions import BasePermission

class IsScheduleAdmin(permissions.BasePermission):
    """
    Allow access only if user is an admin on the schedule.
    """

    def has_object_permission(self, request, view, obj):
        return ScheduleMembership.objects.filter(
            schedule=obj,
            user=request.user,
            role='admin'
        ).exists()

def HasCalendarPermissionOrAdmin(required_perm):
    class _HasCalendarPermissionOrAdmin(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user.is_authenticated:
                return False

            # Try getting calendar_id from view.kwargs
            calendar_id = getattr(view, 'kwargs', {}).get('calendar_id')

            # Fallback: derive from schedule_id if present
            if not calendar_id:
                schedule_id = getattr(view, 'kwargs', {}).get('schedule_id')
                if schedule_id:
                    from core.models import Schedule  # or your actual path
                    try:
                        calendar_id = Schedule.objects.get(id=schedule_id).calendar_id
                    except Schedule.DoesNotExist:
                        return False

            if not calendar_id:
                return False

            try:
                membership = CalendarMembership.objects.get(user=user, calendar_id=calendar_id)
            except CalendarMembership.DoesNotExist:
                return False

            return (
                membership.is_admin or
                any(p.codename == required_perm for p in membership.get_effective_permissions())
            )
    return _HasCalendarPermissionOrAdmin


    # def __call__(self):
    #     return self

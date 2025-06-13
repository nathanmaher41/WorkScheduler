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

class HasCalendarPermissionOrAdmin(BasePermission):
    def __init__(self, required_perm):
        self.required_perm = required_perm

    def has_permission(self, request, view):
        calendar_id = view.kwargs.get("calendar_id")
        user = request.user
        if not user.is_authenticated or not calendar_id:
            return False

        try:
            membership = CalendarMembership.objects.get(user=user, calendar_id=calendar_id)
        except CalendarMembership.DoesNotExist:
            return False

        return membership.is_admin or self.required_perm in membership.get_effective_permissions()

    def __call__(self):
        return self

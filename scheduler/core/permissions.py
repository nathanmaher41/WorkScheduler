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
        print(f"🔍 Running has_permission with required: {self.required_perm}")
        # Try getting calendar_id from view.kwargs or fallback to request.parser_context
        calendar_id = (
            getattr(view, 'kwargs', {}).get('calendar_id')
            or getattr(getattr(request, 'parser_context', {}), 'kwargs', {}).get('calendar_id')
        )

        user = request.user
        if not user.is_authenticated or not calendar_id:
            return False

        try:
            membership = CalendarMembership.objects.get(user=user, calendar_id=calendar_id)
        except CalendarMembership.DoesNotExist:
            return False

        print(f"✅ Found membership for {user.username}. Is admin: {membership.is_admin}. Effective perms: {membership.get_effective_permissions()}")
        return membership.is_admin or any(p.codename == self.required_perm for p in membership.get_effective_permissions())

    # def __call__(self):
    #     return self

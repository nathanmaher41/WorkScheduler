from rest_framework import permissions
from .models import ScheduleMembership

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

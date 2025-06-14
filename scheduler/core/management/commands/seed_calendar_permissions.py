# core/management/commands/seed_calendar_permissions.py

from django.core.management.base import BaseCommand
from core.models import CalendarPermission

class Command(BaseCommand):
    help = "Seeds the database with default calendar permissions"

    def handle(self, *args, **kwargs):
        permission_tuples = [
            ("manage_calendar_settings", "Can manage calendar settings (rename calendar, toggle rules)"),
            ("manage_roles", "Can manage roles (create, rename, delete roles)"),
            ("manage_colors", "Can change a members color"),
            ("create_edit_delete_schedules", "Can create/edit/delete schedules"),
            ("create_edit_delete_shifts", "Can create/edit/delete shifts"),
            ("approve_reject_swap_requests", "Can approve/reject shift swap requests"),
            ("approve_reject_take_requests", "Can approve/reject take shift requests"),
            ("approve_reject_time_off", "Can approve/reject time off requests"),
            ("manage_holidays", "Can mark holidays or altered work hours"),
            ("invite_remove_members", "Can invite/remove members"),
            ("assign_roles", "Can assign/change roles for others"),
            ("promote_demote_admins", "Can promote/demote members to/from admin"),
            ("send_announcements", "Can send announcements/notifications to calendar"),
        ]

        created_count = 0
        for codename, label in permission_tuples:
            obj, created = CalendarPermission.objects.get_or_create(
                codename=codename,
                defaults={"label": label}
            )
            if created:
                self.stdout.write(f"✅ Created permission: {codename}")
                created_count += 1

        if created_count == 0:
            self.stdout.write("🎉 All calendar permissions already exist.")
        else:
            self.stdout.write(f"✅ Seeded {created_count} new permissions.")

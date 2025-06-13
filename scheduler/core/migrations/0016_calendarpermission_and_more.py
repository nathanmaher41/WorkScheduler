from django.db import migrations, models

def seed_calendar_permissions(apps, schema_editor):
    CalendarPermission = apps.get_model('core', 'CalendarPermission')
    permissions = [
        ("manage_calendar_settings", "Can manage calendar settings (rename calendar, toggle rules)"),
        ("manage_roles", "Can manage roles (create, rename, delete roles)"),
        ('manage_colors', "Can change a members color")
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
    for codename, label in permissions:
        CalendarPermission.objects.get_or_create(codename=codename, defaults={'label': label})

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_auto_20250610_0412'),
    ]

    operations = [
        migrations.CreateModel(
            name='CalendarPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codename', models.CharField(max_length=50, unique=True)),
                ('label', models.CharField(max_length=100)),
            ],
        ),
        migrations.AddField(
            model_name='calendarmembership',
            name='custom_permissions',
            field=models.ManyToManyField(blank=True, to='core.calendarpermission'),
        ),
        migrations.AddField(
            model_name='calendarrole',
            name='permissions',
            field=models.ManyToManyField(blank=True, to='core.calendarpermission'),
        ),
        migrations.RunPython(seed_calendar_permissions),
    ]

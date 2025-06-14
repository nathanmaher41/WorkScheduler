from django.db import migrations

def add_manage_colors_permission(apps, schema_editor):
    CalendarPermission = apps.get_model('core', 'CalendarPermission')
    CalendarPermission.objects.get_or_create(
        codename='manage_colors',
        defaults={'label': 'Can change a members color'}
    )

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_timeoffrequest_rejection_reason_and_more'),
    ]

    operations = [
        migrations.RunPython(add_manage_colors_permission),
    ]

# Generated by Django 4.2.21 on 2025-06-05 06:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_workplaceholiday_end_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='workplaceholiday',
            name='title',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]

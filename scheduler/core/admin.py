from django.contrib import admin

# Register your models here.

from django.contrib import admin
from .models import User, Schedule, Shift, TimeOffRequest

admin.site.register(User)
admin.site.register(Schedule)
admin.site.register(Shift)
admin.site.register(TimeOffRequest)

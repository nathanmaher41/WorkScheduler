from django.urls import path
from .views import RegisterView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import ScheduleCreateView, ScheduleListView, ScheduleInviteView
from .views import ScheduleMemberListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('schedules/create/', ScheduleCreateView.as_view(), name='schedule-create'),
    path('schedules/', ScheduleListView.as_view(), name='schedule-list'),
    path('schedules/<int:schedule_id>/invite/', ScheduleInviteView.as_view(), name='schedule-invite'),
    path('schedules/<int:schedule_id>/members/', ScheduleMemberListView.as_view(), name='schedule-members'),
]

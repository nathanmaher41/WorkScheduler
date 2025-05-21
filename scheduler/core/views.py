from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer
from django.contrib.auth import get_user_model
from .models import Schedule, ScheduleMembership
from .serializers import ScheduleListSerializer, ScheduleInviteSerializer, ScheduleMemberSerializer
from rest_framework.response import Response
from .permissions import IsScheduleAdmin


User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class ScheduleCreateView(generics.CreateAPIView):
    serializer_class = ScheduleListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        schedule = serializer.save(created_by=self.request.user)
        ScheduleMembership.objects.create(
            user=self.request.user,
            schedule=schedule,
            role='admin'
        )

class ScheduleListView(generics.ListAPIView):
    serializer_class = ScheduleListSerializer
    permission_classes = [permissions.IsAuthenticated]  # No IsScheduleAdmin here

    def get_queryset(self):
        return Schedule.objects.filter(schedulemembership__user=self.request.user)

class ScheduleInviteView(generics.GenericAPIView):
    serializer_class = ScheduleInviteSerializer
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]

    def get_object(self):
        return Schedule.objects.get(id=self.kwargs['schedule_id'])

    def post(self, request, schedule_id):
        schedule = self.get_object()  # Now triggers permission check
        serializer = self.get_serializer(data=request.data, context={'schedule': schedule})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "User added to schedule."}, status=status.HTTP_201_CREATED)

class ScheduleMemberListView(generics.ListAPIView):
    serializer_class = ScheduleMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return ScheduleMembership.objects.filter(schedule_id=schedule_id)

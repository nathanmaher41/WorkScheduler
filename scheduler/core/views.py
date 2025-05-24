from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Schedule, ScheduleMembership, Shift, TimeOffRequest, Calendar, CalendarMembership, CalendarRole
from .permissions import IsScheduleAdmin
from .serializers import (
    RegisterSerializer,
    ScheduleListSerializer,
    ScheduleInviteSerializer,
    ScheduleMemberSerializer,
    ScheduleSettingsSerializer,
    ShiftSerializer,
    TimeOffRequestCreateSerializer,
    TimeOffRequestManageSerializer,
    UserProfileSerializer,
    CalendarSerializer,
    ScheduleCreateSerializer,
    CalendarMembershipSerializer,
    CalendarRoleSerializer,
    CalendarJoinSerializer,
)
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect
from django.db.utils import IntegrityError
import string
import random

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save(is_active=False)  # Save first
        print("Sending email to:", user.email)  # Now this works
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        activation_link = self.request.build_absolute_uri(
            reverse('activate-user', kwargs={'uidb64': uid, 'token': token})
        )
        send_mail(
            subject='Activate Your Account',
            message=f'Click to activate: {activation_link}',
            from_email='no-reply@example.com',
            recipient_list=[user.email],
            fail_silently=False,
        )

class ActivateUserView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = get_object_or_404(User, pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            frontend_url = f"http://localhost:5173/activate-success?access={access_token}&refresh={refresh_token}"
            return redirect(frontend_url)

        return HttpResponse("Invalid or expired activation link.", status=400)

class ScheduleCreateView(generics.CreateAPIView):
    serializer_class = ScheduleCreateSerializer
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

class ShiftCreateView(generics.CreateAPIView):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]

    def get_object(self):
        return Schedule.objects.get(id=self.kwargs['schedule_id'])

    def perform_create(self, serializer):
        schedule = self.get_object()
        serializer.save(schedule=schedule)

class ShiftListView(generics.ListAPIView):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return Shift.objects.filter(schedule__id=schedule_id)

class TimeOffRequestCreateView(generics.CreateAPIView):
    serializer_class = TimeOffRequestCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user)

class TimeOffRequestManageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, request_id):
        try:
            time_off_request = TimeOffRequest.objects.get(id=request_id)
        except TimeOffRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=http_status.HTTP_404_NOT_FOUND)

        # You could add more logic to verify admin permissions here

        serializer = TimeOffRequestManageSerializer(time_off_request, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Request updated.", "status": serializer.data['status']})

class TimeOffRequestListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]
    serializer_class = TimeOffRequestCreateSerializer  # or create a new one with more details

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return TimeOffRequest.objects.filter(
            employee__schedulemembership__schedule_id=schedule_id
        )

class ShiftSwapRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        shift_a_id = request.data.get('requesting_shift_id')
        shift_b_id = request.data.get('target_shift_id')

        try:
            shift_a = Shift.objects.get(id=shift_a_id)
            shift_b = Shift.objects.get(id=shift_b_id)
        except Shift.DoesNotExist:
            return Response({"error": "One or both shifts not found."}, status=status.HTTP_404_NOT_FOUND)

        if shift_a.employee != request.user:
            return Response({"error": "You can only request swaps for your own shifts."}, status=status.HTTP_403_FORBIDDEN)

        if shift_a.schedule != shift_b.schedule:
            return Response({"error": "Shifts must belong to the same schedule."}, status=status.HTTP_400_BAD_REQUEST)

        schedule = shift_a.schedule

        shift_a.is_swap_pending = True
        shift_a.swap_requested_by = request.user
        shift_a.swap_approved_by = None  # Reset approval in case
        shift_a.save()

        return Response({"message": "Swap request sent.", "requires_admin_approval": schedule.require_admin_swap_approval})

class ShiftSwapApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        shift_a_id = request.data.get('requesting_shift_id')
        shift_b_id = request.data.get('target_shift_id')

        try:
            shift_a = Shift.objects.get(id=shift_a_id)
            shift_b = Shift.objects.get(id=shift_b_id)
        except Shift.DoesNotExist:
            return Response({"error": "One or both shifts not found."}, status=status.HTTP_404_NOT_FOUND)

        if shift_b.employee != request.user:
            return Response({"error": "You can only approve swaps involving your own shift."}, status=status.HTTP_403_FORBIDDEN)

        schedule = shift_a.schedule
        if shift_a.schedule != shift_b.schedule:
            return Response({"error": "Shifts must belong to the same schedule."}, status=status.HTTP_400_BAD_REQUEST)

        if not shift_a.is_swap_pending or shift_a.swap_requested_by is None:
            return Response({"error": "No pending swap on this shift."}, status=status.HTTP_400_BAD_REQUEST)

        if schedule.require_admin_swap_approval:
            shift_a.swap_approved_by = request.user
            shift_a.save()
            return Response({"message": "Swap approved by target employee, pending admin approval."})

        # No admin approval needed — perform swap
        with transaction.atomic():
            shift_a_employee = shift_a.employee
            shift_a.employee = shift_b.employee
            shift_b.employee = shift_a_employee

            shift_a.is_swap_pending = False
            shift_a.swap_requested_by = None
            shift_a.swap_approved_by = request.user

            shift_a.save()
            shift_b.save()

        return Response({"message": "Shift swap completed successfully."})


class IncomingSwapRequestsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shifts = Shift.objects.filter(
            swap_with__employee=request.user,
            is_swap_pending=True
        ).select_related('employee', 'swap_with')

        data = [
            {
                "your_shift_id": s.swap_with.id,
                "your_shift_time": {
                    "start": s.swap_with.start_time,
                    "end": s.swap_with.end_time
                },
                "requesting_shift_id": s.id,
                "requesting_employee": s.employee.username,
                "requesting_shift_time": {
                    "start": s.start_time,
                    "end": s.end_time
                },
                "position": s.position
            }
            for s in shifts
        ]

        return Response(data)

class ShiftSwapRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, shift_id):
        try:
            target_shift = Shift.objects.get(id=shift_id, employee=request.user)
        except Shift.DoesNotExist:
            return Response({"error": "Shift not found or not yours."}, status=404)

        initiator_shift = Shift.objects.filter(swap_with=target_shift, is_swap_pending=True).first()
        if not initiator_shift:
            return Response({"error": "No pending swap found for this shift."}, status=404)

        # Clear the request
        initiator_shift.is_swap_pending = False
        initiator_shift.swap_requested_by = None
        initiator_shift.swap_with = None
        initiator_shift.save()

        return Response({"message": "Swap request rejected."})

class ScheduleSettingsUpdateView(generics.UpdateAPIView):
    serializer_class = ScheduleSettingsSerializer
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]
    queryset = Schedule.objects.all()
    lookup_url_kwarg = 'schedule_id'

class ShiftSwapAdminApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsScheduleAdmin]

    def post(self, request):
        shift_a_id = request.data.get('requesting_shift_id')
        shift_b_id = request.data.get('target_shift_id')

        try:
            shift_a = Shift.objects.get(id=shift_a_id)
            shift_b = Shift.objects.get(id=shift_b_id)
        except Shift.DoesNotExist:
            return Response({"error": "One or both shifts not found."}, status=status.HTTP_404_NOT_FOUND)

        schedule = shift_a.schedule

        if shift_a.schedule != shift_b.schedule:
            return Response({"error": "Shifts must belong to the same schedule."}, status=status.HTTP_400_BAD_REQUEST)

        if not shift_a.is_swap_pending or shift_a.swap_requested_by is None or shift_a.swap_approved_by is None:
            return Response({"error": "Swap has not been approved by the target employee yet."}, status=status.HTTP_400_BAD_REQUEST)

        self.check_object_permissions(request, schedule)  # Use IsScheduleAdmin to confirm admin access

        # Perform the swap
        with transaction.atomic():
            shift_a_employee = shift_a.employee
            shift_a.employee = shift_b.employee
            shift_b.employee = shift_a_employee

            shift_a.is_swap_pending = False
            shift_a.swap_requested_by = None
            # Keep the swap_approved_by to reflect employee's approval

            shift_a.save()
            shift_b.save()

        return Response({"message": "Shift swap finalized by admin."})

class UserSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
        })

    def patch(self, request):
        user = request.user
        phone = request.data.get("phone_number")
        if phone is not None:
            user.phone_number = phone
            user.save()
        return Response({"message": "Settings updated"})

class ResendActivationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
            if user.is_active:
                return Response({"message": "User is already active."})
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            activation_link = request.build_absolute_uri(
                reverse('activate-user', kwargs={'uidb64': uid, 'token': token})
            )
            send_mail(
                subject='Activate Your Account',
                message=f'Click to activate: {activation_link}',
                from_email='no-reply@example.com',
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response({"message": "Activation email resent."})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CalendarCreateView(generics.CreateAPIView):
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated]

    def generate_unique_code(self, length=6):
        chars = string.ascii_uppercase + string.digits
        for _ in range(10):  # Try 10 times
            code = ''.join(random.choices(chars, k=length))
            if not Calendar.objects.filter(join_code=code).exists():
                return code
        raise ValueError("Could not generate a unique join code.")

    def perform_create(self, serializer):
        calendar = serializer.save(
            created_by=self.request.user,
            join_code=self.generate_unique_code()
        )

        # Always create core roles
        CalendarRole.objects.create(calendar=calendar, name='Staff')

        # Extract and sanitize
        creator_title_raw = self.request.data.get("creator_title", "").strip()
        extra_roles = self.request.data.get("roles", [])
        add_creator_title = creator_title_raw and creator_title_raw.lower() not in ['admin', 'staff']

        # Optionally create the creator's title as a role
        creator_title_obj = None
        if creator_title_raw:
            # Normalize capitalization (e.g., Manager not manager)
            existing = calendar.roles.filter(name__iexact=creator_title_raw).first()
            creator_title_obj = existing or CalendarRole.objects.create(
                calendar=calendar,
                name=creator_title_raw.capitalize()
            )

        # Add any additional non-core roles
        if isinstance(extra_roles, list):
            for role_name in extra_roles:
                if role_name.lower() not in ['staff', 'admin']:
                    calendar.roles.get_or_create(name=role_name.capitalize())

        # Now finally assign the membership correctly
        CalendarMembership.objects.create(
            user=self.request.user,
            calendar=calendar,
            title=creator_title_obj,
            is_admin=True
        )



class CalendarListView(generics.ListAPIView):
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Calendar.objects.filter(members=self.request.user)

class CalendarInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, calendar_id):
        username = request.data.get('username')
        role = request.data.get('role', 'staff')

        try:
            calendar = Calendar.objects.get(id=calendar_id)
        except Calendar.DoesNotExist:
            return Response({"error": "Calendar not found."}, status=404)

        # Only admins can invite
        membership = CalendarMembership.objects.filter(user=request.user, calendar=calendar, role='admin').first()
        if not membership:
            return Response({"error": "You are not an admin of this calendar."}, status=403)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        _, created = CalendarMembership.objects.get_or_create(user=user, calendar=calendar, defaults={'role': role})
        if not created:
            return Response({"message": "User already in calendar."})

        return Response({"message": f"{user.username} added to calendar as {role}."})

class CalendarJoinByCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('join_code')
        title_id = request.data.get('title_id')
        color = request.data.get('color')

        try:
            calendar = Calendar.objects.get(join_code=code)
        except Calendar.DoesNotExist:
            return Response({"error": "Invalid join code."}, status=404)

        if CalendarMembership.objects.filter(calendar=calendar, color=color).exists():
            return Response({"error": "Color already taken."}, status=400)

        title = None
        if calendar.roles.exists():
            if not title_id:
                return Response({"error": "Title is required."}, status=400)
            try:
                title = calendar.roles.get(id=title_id)
            except CalendarRole.DoesNotExist:
                return Response({"error": "Invalid title selected."}, status=400)

        _, created = CalendarMembership.objects.get_or_create(
            user=request.user,
            calendar=calendar,
            defaults={
                'title': title,
                'color': color,
                'is_admin': False  # must be granted later by another admin
            }
        )

        if not created:
            return Response({"message": "Already a member of this calendar."})

        return Response({"message": f"Joined calendar: {calendar.name}"})

class CalendarMemberListView(generics.ListAPIView):
    serializer_class = CalendarMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        return CalendarMembership.objects.filter(calendar_id=calendar_id)

class CalendarDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Calendar.objects.all()
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated]

class CalendarLookupByCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'Missing join code.'}, status=400)

        try:
            calendar = Calendar.objects.get(join_code=code)
        except Calendar.DoesNotExist:
            return Response({'error': 'Invalid join code.'}, status=404)

        serializer = CalendarJoinSerializer(calendar)
        return Response(serializer.data)

        
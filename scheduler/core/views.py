from django.db import transaction
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import models
from collections import defaultdict
from datetime import timedelta
from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .permissions import IsScheduleAdmin, HasCalendarPermissionOrAdmin
from django.utils.timezone import localtime
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from rest_framework.exceptions import PermissionDenied
from .models import (
    Schedule, 
    ScheduleMembership, 
    Shift, 
    TimeOffRequest, 
    Calendar, 
    CalendarMembership, 
    CalendarRole, 
    ShiftSwapRequest,
    ShiftTakeRequest,
    InboxNotification,
    WorkplaceHoliday,
    CalendarPermission,
    ScheduleConfirmation
)
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
    CalendarMembershipSimpleSerializer,
    ShiftSwapRequestSerializer,
    ShiftTakeRequestSerializer,
    InboxNotificationSerializer,
    TimeOffRequestSerializer,
    WorkplaceHolidaySerializer,
    CalendarPermissionSerializer,
    CalendarMembershipPermissionSerializer,
    CustomTokenObtainPairSerializer,
    ScheduleWithConfirmationsSerializer
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
from rest_framework.exceptions import PermissionDenied
from django.db.models import OuterRef, Subquery

User = get_user_model()


#helper functions
def format_shift_time(shift):
    start = localtime(shift.start_time)
    end = localtime(shift.end_time)
    date = start.strftime("%b %-d")  # e.g. "Jun 2"
    time_range = f"{start.strftime('%-I:%M %p')}–{end.strftime('%-I:%M %p')}"  # e.g. "2:00 PM–6:00 PM"
    return f"{date} from {time_range}"

#views functions

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save(is_active=False)
        print("Sending email to:", user.email)
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

class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
        calendar_id = self.request.data.get("calendar_id")
        if not calendar_id:
            raise ValidationError("calendar_id is required.")

        calendar = get_object_or_404(Calendar, id=calendar_id)

        schedule = serializer.save(
            created_by=self.request.user,
            calendar=calendar
        )

        ScheduleMembership.objects.create(
            user=self.request.user,
            schedule=schedule,
            role='admin'
        )

        members = CalendarMembership.objects.filter(calendar=calendar).exclude(user=self.request.user)
        for member in members:
            ScheduleMembership.objects.get_or_create(
                user=member.user,
                schedule=schedule,
                role='viewer'
            )

        self.created_schedule = schedule

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        full_data = ScheduleListSerializer(self.created_schedule, context={'request': request}).data
        return Response(full_data, status=status.HTTP_201_CREATED)


class ScheduleListView(generics.ListAPIView):
    serializer_class = ScheduleListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        calendar_id = self.request.query_params.get("calendar_id")

        queryset = Schedule.objects.filter(schedulemembership__user=user)

        if calendar_id:
            queryset = queryset.filter(calendar_id=calendar_id)

        return queryset

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

    def post(self, request, *args, **kwargs):
        print("RAW POST DATA:", request.data)
        schedule = self.get_object()
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            print("SHIFT CREATE ERROR:", serializer.errors) 
            return Response(serializer.errors, status=400)
        
        serializer.save(schedule=schedule)
        return Response(serializer.data, status=201)

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

        # could add more logic to verify admin permissions here

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
        requesting_shift_id = request.data.get('requesting_shift_id')
        target_shift_id = request.data.get('target_shift_id')

        if not requesting_shift_id or not target_shift_id:
            return Response({"error": "Missing shift IDs."}, status=400)

        try:
            requesting_shift = Shift.objects.get(id=requesting_shift_id, employee=request.user)
            target_shift = Shift.objects.get(id=target_shift_id)
        except Shift.DoesNotExist:
            return Response({"error": "Invalid shift(s) or unauthorized."}, status=404)

        if requesting_shift.schedule != target_shift.schedule:
            return Response({"error": "Shifts must be in the same schedule."}, status=400)

        # Create new swap request
        swap_request = ShiftSwapRequest.objects.create(
            requesting_shift=requesting_shift,
            target_shift=target_shift,
            requested_by=request.user
        )

        # Notify the target employee
        InboxNotification.objects.create(
            user=target_shift.employee,
            notification_type='SWAP_REQUEST',
            message=f"{request.user.get_full_name()} wants to swap their shift on {format_shift_time(requesting_shift)} with your shift on {format_shift_time(target_shift)}.",
            related_object_id=requesting_shift.id,
            calendar=requesting_shift.schedule.calendar
        )

        return Response({"message": "Swap request submitted."})


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

        if not schedule.calendar.allow_swap_without_approval:
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

        self.check_object_permissions(request, schedule)  # IsScheduleAdmin to confirm admin access

        # Perform the swap
        with transaction.atomic():
            shift_a_employee = shift_a.employee
            shift_a.employee = shift_b.employee
            shift_b.employee = shift_a_employee

            shift_a.is_swap_pending = False
            shift_a.swap_requested_by = None
            # swap_approved_by to reflect employee's approval

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
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name,
            "pronouns": getattr(user, "pronouns", ""),
            "show_pronouns": getattr(user, "show_pronouns", True),
            "show_middle_name": getattr(user, "show_middle_name", True),
            "notify_email": getattr(user, "notify_email", True),
            "notify_sms": getattr(user, "notify_sms", False),
        })

    def patch(self, request):
        user = request.user
        data = request.data

        fields = [
            "phone_number", "first_name", "middle_name", "last_name",
            "pronouns", "show_pronouns", "show_middle_name",
            "notify_email", "notify_sms"
        ]
        for field in fields:
            if field in data:
                setattr(user, field, data[field])

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

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("❌ Calendar creation failed validation:")
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        print("✅ Validation passed, calling perform_create")
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def generate_unique_code(self, length=6):
        chars = string.ascii_uppercase + string.digits
        for _ in range(10):
            code = ''.join(random.choices(chars, k=length))
            if not Calendar.objects.filter(join_code=code).exists():
                return code
        raise ValueError("Could not generate a unique join code.")

    def perform_create(self, serializer):
        try:
            print("📌 Inside perform_create")
            calendar = serializer.save(
                created_by=self.request.user,
                join_code=self.generate_unique_code()
            )
        except Exception as e:
            print("❌ Calendar serializer save failed:", e)
            print("🧪 Serializer validated data:", serializer.validated_data)
            raise

        # Always create core roles
        CalendarRole.objects.create(calendar=calendar, name='Staff')
        staff_role = CalendarRole.objects.get(calendar=calendar, name='Staff')

        # Extract from request
        data = self.request.data
        creator_title_raw = serializer.validated_data.get("creator_title", "").strip()
        extra_roles = serializer.validated_data.get("input_roles", [])
        add_creator_title = creator_title_raw and creator_title_raw.lower() not in ['admin', 'staff']

        # Create title role if needed
        creator_title_obj = None
        if creator_title_raw:
            existing = calendar.roles.filter(name__iexact=creator_title_raw).first()
            creator_title_obj = existing or CalendarRole.objects.create(
                calendar=calendar,
                name=creator_title_raw.capitalize()
            )

        # Add extra roles
        if isinstance(extra_roles, list):
            for role_name in extra_roles:
                if role_name.lower() not in ['staff', 'admin']:
                    calendar.roles.get_or_create(name=role_name.capitalize())

        # Assign membership with color
        CalendarMembership.objects.create(
            user=self.request.user,
            calendar=calendar,
            title=creator_title_obj or staff_role,
            is_admin=True,
            color=data.get('color'),  # pulled from self.request.data
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
            return Response({"message": "Already a member of this calendar."}, status=400)


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

    def perform_destroy(self, instance):
        user = self.request.user
        is_admin = CalendarMembership.objects.filter(
            calendar=instance,
            user=user,
            is_admin=True
        ).exists()

        if not is_admin:
            raise PermissionDenied("You do not have permission to delete this calendar.")
        
        instance.delete()

    def update(self, request, *args, **kwargs):
        calendar = self.get_object()
        user = request.user
        is_admin = CalendarMembership.objects.filter(
            calendar=calendar,
            user=user,
            is_admin=True
        ).exists()

        if not is_admin:
            raise PermissionDenied("You do not have permission to update this calendar.")

        return super().update(request, *args, **kwargs)


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

        already_joined = CalendarMembership.objects.filter(calendar=calendar, user=request.user).exists()
        serializer = CalendarJoinSerializer(calendar)
        data = serializer.data
        data['already_joined'] = already_joined
        return Response(data)

class ShiftSwapRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sent_requests = ShiftSwapRequest.objects.filter(requested_by=request.user)
        received_requests = ShiftSwapRequest.objects.filter(target_shift__employee=request.user)
        combined = sent_requests.union(received_requests)
        serializer = ShiftSwapRequestSerializer(combined, many=True)
        return Response(serializer.data)


class ShiftSwapAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, swap_id):
        try:
            swap = ShiftSwapRequest.objects.select_related(
                'requesting_shift__schedule__calendar',
                'target_shift__schedule__calendar'
            ).get(id=swap_id)
        except ShiftSwapRequest.DoesNotExist:
            return Response({"error": "Swap request not found."}, status=404)

        calendar = swap.target_shift.schedule.calendar

        is_target = swap.target_shift.employee == request.user
        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        self.calendar = calendar  # for permission class if needed
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_swap_requests").has_permission(request, self)

        if not (is_target or is_admin or has_perm):
            return Response({"error": "You do not have permission to approve this swap."}, status=403)

        requires_admin_approval = not calendar.allow_swap_without_approval

        # Target approves — wait for admin
        if requires_admin_approval and is_target and not (is_admin or has_perm):
            swap.approved_by_target = True
            swap.save()
            return Response({
                "message": "Swap accepted by target. Pending admin approval.",
                "requires_admin_approval": True
            })

        # Otherwise fully approve
        swap.approved_by_target = True
        swap.approved_by_admin = True
        swap.save()

        with transaction.atomic():
            a = swap.requesting_shift
            b = swap.target_shift
            a_employee = a.employee

            a.employee = b.employee
            b.employee = a_employee

            a.save()
            b.save()

            InboxNotification.objects.create(
                user=swap.requested_by,
                notification_type='SWAP_REQUEST',
                message=f"Your swap request for {format_shift_time(swap.requesting_shift)} was approved.",
                related_object_id=swap.requesting_shift.id,
                calendar=calendar
            )

            ShiftSwapRequest.objects.filter(
                models.Q(requesting_shift=a) | models.Q(target_shift=a) |
                models.Q(requesting_shift=b) | models.Q(target_shift=b)
            ).exclude(id=swap.id).delete()

            swap.delete()

        return Response({
            "message": "Swap approved successfully.",
            "requires_admin_approval": False
        })

class ShiftSwapRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, swap_id):
        try:
            swap = ShiftSwapRequest.objects.select_related("target_shift__schedule__calendar").get(id=swap_id)
        except ShiftSwapRequest.DoesNotExist:
            return Response({"error": "Swap request not found."}, status=404)

        calendar = swap.target_shift.schedule.calendar

        is_target = swap.target_shift.employee == request.user
        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        self.calendar = calendar
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_swap_requests").has_permission(request, self)

        if not (is_target or is_admin or has_perm):
            return Response({"error": "You do not have permission to reject this swap."}, status=403)

        InboxNotification.objects.create(
            user=swap.requested_by,
            notification_type='SWAP_REQUEST',
            message=f"Your swap request for {format_shift_time(swap.requesting_shift)} was rejected.",
            related_object_id=swap.requesting_shift.id,
            calendar=calendar
        )

        swap.delete()
        return Response({"message": "Swap request rejected."})


class ShiftTakeRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        shift_id = request.data.get('shift_id')
        direction = request.data.get('direction')
        target_user_id = request.data.get('user_id')

        try:
            shift = Shift.objects.get(id=shift_id)
        except Shift.DoesNotExist:
            return Response({"error": "Shift not found."}, status=404)

        from .models import InboxNotification

        if direction == "take":
            if shift.employee.id == request.user.id:
                return Response({"error": "You already own this shift."}, status=400)
            take_request = ShiftTakeRequest.objects.create(
                shift=shift,
                requested_by=request.user,
                requested_to=shift.employee
            )
            InboxNotification.objects.create(
                user=shift.employee,
                notification_type='TAKE_REQUEST',
                message=f"{request.user.get_full_name()} wants to take your shift on {format_shift_time(shift)}",
                related_object_id=take_request.shift.id,
                calendar=shift.schedule.calendar
            )

        elif direction == "give":
            if shift.employee.id != request.user.id:
                return Response({"error": "You can't give away someone else's shift."}, status=403)
            recipient = get_object_or_404(User, id=target_user_id)
            take_request = ShiftTakeRequest.objects.create(
                shift=shift,
                requested_by=request.user,
                requested_to=recipient
            )
            InboxNotification.objects.create(
                user=recipient,
                notification_type='TAKE_REQUEST',
                message=f"{request.user.get_full_name()} is asking you to take their shift on {format_shift_time(shift)}",
                related_object_id=take_request.shift.id,
                calendar=shift.schedule.calendar
            )
        else:
            return Response({"error": "Invalid direction."}, status=400)

        return Response({"message": "Take request submitted."})


class ShiftTakeAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, take_id):
        try:
            take = ShiftTakeRequest.objects.select_related("shift", "shift__schedule__calendar").get(id=take_id)
        except ShiftTakeRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=404)

        calendar = take.shift.schedule.calendar

        # Permission checks
        is_target = take.requested_to == request.user
        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        self.calendar = calendar  # required for HasCalendarPermissionOrAdmin to work properly
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_take_requests").has_permission(request, self)

        if not (is_target or is_admin or has_perm):
            return Response({"error": "You do not have permission to accept this take request."}, status=403)

        requires_admin = calendar.require_take_approval

        # If admin approval is required and current user is the recipient
        if requires_admin and is_target and not (is_admin or has_perm):
            take.approved_by_target = True
            take.save()
            return Response({
                "success": True,
                "requires_admin_approval": True
            })

        # Determine direction of shift transfer
        direction = "give" if take.requested_by == take.shift.employee else "take"

        with transaction.atomic():
            if direction == "take":
                take.shift.employee = take.requested_by
            else:
                take.shift.employee = take.requested_to
            take.shift.save()

            from .models import InboxNotification
            InboxNotification.objects.create(
                user=take.requested_by,
                notification_type='TAKE_REQUEST',
                message=f"Your shift take request for {format_shift_time(take.shift)} was approved.",
                related_object_id=take.shift.id,
                calendar=calendar
            )

            take.delete()

        return Response({
            "success": True,
            "requires_admin_approval": False
        })


class ShiftTakeRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, take_id):
        try:
            take = ShiftTakeRequest.objects.select_related("shift__schedule__calendar").get(id=take_id)
        except ShiftTakeRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=404)

        calendar = take.shift.schedule.calendar

        # Permission checks
        is_target = take.requested_to == request.user
        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        self.calendar = calendar
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_take_requests").has_permission(request, self)

        if not (is_target or is_admin or has_perm):
            return Response({"error": "You do not have permission to reject this take request."}, status=403)

        InboxNotification.objects.create(
            user=take.requested_by,
            notification_type='TAKE_REQUEST',
            message=f"Your shift take request for {format_shift_time(take.shift)} was rejected.",
            related_object_id=take.shift.id,
            calendar=calendar
        )
        take.delete()

        return Response({"message": "Shift take request rejected."})

class ShiftTakeRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        schedule_ids = ScheduleMembership.objects.filter(
            user=request.user
        ).values_list('schedule_id', flat=True)

        qs = ShiftTakeRequest.objects.filter(
            shift__schedule_id__in=schedule_ids
        ).filter(
            models.Q(requested_by=request.user) |
            models.Q(shift__employee=request.user) |
            models.Q(requested_to=request.user)
        )

        serializer = ShiftTakeRequestSerializer(qs, many=True)
        return Response(serializer.data)


class InboxNotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notification_type = request.query_params.get('type')
        is_active = request.query_params.get('active')
        is_read = request.query_params.get('read')
        calendar_id = request.query_params.get('calendar_id')  # 👈 NEW

        qs = InboxNotification.objects.filter(user=request.user)

        if calendar_id:
            qs = qs.filter(calendar_id=calendar_id)
        if notification_type:
            qs = qs.filter(notification_type=notification_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')

        qs = qs.order_by('-created_at')

        serializer = InboxNotificationSerializer(qs, many=True)
        return Response(serializer.data)

class InboxUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        calendar_id = request.query_params.get('calendar_id')
        qs = InboxNotification.objects.filter(user=request.user, is_read=False)
        if calendar_id:
            qs = qs.filter(calendar_id=calendar_id)
        return Response({"unread_count": qs.count()})

class InboxNotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = InboxNotification.objects.get(pk=pk, user=request.user)
        except InboxNotification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        serializer = InboxNotificationSerializer(notification, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class ShiftDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            shift = Shift.objects.get(pk=pk)
        except Shift.DoesNotExist:
            return Response({'detail': 'Shift not found.'}, status=404)

        from .serializers import ShiftSerializer
        serializer = ShiftSerializer(shift)
        return Response(serializer.data)

    def patch(self, request, pk):
        shift = get_object_or_404(Shift, pk=pk)
        serializer = ShiftSerializer(shift, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# views.py
class CalendarShiftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        shifts = Shift.objects.filter(schedule__calendar_id=calendar_id)
        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)

class ShiftSwapCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, swap_id):
        try:
            swap = ShiftSwapRequest.objects.select_related('target_shift__employee', 'requesting_shift__schedule').get(id=swap_id)
        except ShiftSwapRequest.DoesNotExist:
            return Response({"error": "Swap request not found."}, status=404)

        if swap.requested_by != request.user:
            return Response({"error": "You are not authorized to cancel this swap request."}, status=403)

        # Notify recipient
        InboxNotification.objects.create(
            user=swap.target_shift.employee,
            notification_type='SWAP_REQUEST',
            message=f"{request.user.get_full_name()} cancelled their swap request.",
            related_object_id=swap.requesting_shift.id,
            calendar=swap.requesting_shift.schedule.calendar
        )

        swap.delete()
        return Response({"message": "Swap request cancelled."})

class ShiftTakeCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, take_id):
        try:
            take = ShiftTakeRequest.objects.select_related('shift__schedule', 'requested_to').get(id=take_id)
        except ShiftTakeRequest.DoesNotExist:
            return Response({"error": "Take request not found."}, status=404)

        if take.requested_by != request.user:
            return Response({"error": "You are not authorized to cancel this take request."}, status=403)

        # Notify recipient
        InboxNotification.objects.create(
            user=take.requested_to,
            notification_type='TAKE_REQUEST',
            message=f"{request.user.get_full_name()} cancelled their shift take request.",
            related_object_id=take.shift.id,
            calendar=take.shift.schedule.calendar
        )

        take.delete()
        return Response({"message": "Take request cancelled."})

from .serializers import ScheduleCreateSerializer

class ScheduleEditView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            schedule = Schedule.objects.get(pk=pk)
        except Schedule.DoesNotExist:
            return Response({'detail': 'Schedule not found.'}, status=404)

        serializer = ScheduleCreateSerializer(schedule, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            full_data = ScheduleListSerializer(schedule, context={'request': request}).data
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class ScheduleDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsScheduleAdmin]

    def delete(self, request, pk):
        try:
            schedule = Schedule.objects.get(id=pk)
        except Schedule.DoesNotExist:
            return Response({'error': 'Schedule not found.'}, status=404)

        self.check_object_permissions(request, schedule)
        schedule.delete()
        return Response({"message": "Schedule deleted."}, status=204)

class ShiftDeleteView(generics.DestroyAPIView):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]


class RequestOffCreateView(APIView):
    def post(self, request, calendar_id):
        print("📥 Incoming request data:", request.data)
        serializer = TimeOffRequestSerializer(data=request.data)
        if serializer.is_valid():
            try:
                calendar = Calendar.objects.get(id=calendar_id)
            except Calendar.DoesNotExist:
                return Response({"error": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

            serializer.save(employee=request.user, calendar=calendar)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print("❌ Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TimeOffListView(ListAPIView):
    serializer_class = TimeOffRequestSerializer

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        user = self.request.user

        return TimeOffRequest.objects.filter(
            calendar_id=calendar_id
        ).filter(
            Q(status='approved', visible_to_others=True) |
            Q(employee=user)
        )


class TimeOffRequestDeleteView(generics.DestroyAPIView):
    queryset = TimeOffRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.employee != request.user:
            return Response({"detail": "You can only delete your own requests."}, status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

class WorkplaceHolidayListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkplaceHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        return WorkplaceHoliday.objects.filter(calendar_id=calendar_id)

    def perform_create(self, serializer):
        calendar_id = self.kwargs['calendar_id']
        serializer.save(calendar_id=calendar_id)

class WorkplaceHolidayDeleteView(generics.DestroyAPIView):
    serializer_class = WorkplaceHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        return WorkplaceHoliday.objects.filter(calendar_id=calendar_id)

class WorkplaceHolidayDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkplaceHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        return WorkplaceHoliday.objects.filter(calendar_id=calendar_id)

class CalendarMemberDetailView(APIView):
    def patch(self, request, calendar_id, user_id):
        try:
            membership = CalendarMembership.objects.get(calendar_id=calendar_id, user_id=user_id)
            calendar = Calendar.objects.get(id=calendar_id)
        except CalendarMembership.DoesNotExist:
            return Response({'error': 'Membership not found'}, status=404)

        current_user_membership = CalendarMembership.objects.get(calendar_id=calendar_id, user=request.user)
        is_admin = current_user_membership.is_admin
        self_change_allowed = calendar.self_role_change_allowed

        # ✅ Only allow if admin or user modifying their own role and self-change is allowed
        if not (is_admin or (request.user.id == user_id and self_change_allowed)):
            return Response({'error': 'Permission denied'}, status=403)

        title_id = request.data.get('title')
        if title_id:
            try:
                title = CalendarRole.objects.get(id=title_id)
                membership.title = title
            except CalendarRole.DoesNotExist:
                return Response({'error': 'Invalid title'}, status=400)
        if 'color' in request.data:
            membership.color = request.data['color']
        membership.save()
        return Response(CalendarMembershipSerializer(membership).data)

class CalendarRoleCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, calendar_id):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({"error": "Role name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            calendar = Calendar.objects.get(id=calendar_id)
        except Calendar.DoesNotExist:
            return Response({"error": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)

        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        if not is_admin:
            raise PermissionDenied("Only admins can add roles.")

        role, created = CalendarRole.objects.get_or_create(calendar=calendar, name=name)
        if not created:
            return Response({"message": "Role already exists."}, status=status.HTTP_200_OK)

        return Response(CalendarRoleSerializer(role).data, status=status.HTTP_201_CREATED)

class CalendarRoleDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, calendar_id, role_id):
        try:
            calendar = Calendar.objects.get(id=calendar_id)
            print(f"🔍 Found calendar {calendar.id} for delete request")
            role = CalendarRole.objects.get(id=role_id, calendar=calendar)
            print(f"🔍 Found role {role.id} for calendar {calendar.id}")
        except Calendar.DoesNotExist:
            return Response({"error": "Calendar not found."}, status=status.HTTP_404_NOT_FOUND)
        except CalendarRole.DoesNotExist:
            return Response({"error": "Role not found."}, status=status.HTTP_404_NOT_FOUND)

        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        if not is_admin:
            raise PermissionDenied("Only admins can delete roles.")

        member_count = CalendarMembership.objects.filter(calendar=calendar, title=role).count()
        if member_count > 0:
            return Response({
                "error": f"There are {member_count} user(s) with this role and it cannot be deleted. "
                         f"Have them change to another role first or consider renaming this one."
            }, status=status.HTTP_400_BAD_REQUEST)

        role.delete()
        return Response({"message": "Role deleted."}, status=status.HTTP_204_NO_CONTENT)

class CalendarRoleRenameView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, calendar_id, role_id):
        try:
            calendar = Calendar.objects.get(id=calendar_id)
            role = CalendarRole.objects.get(id=role_id, calendar=calendar)
        except (Calendar.DoesNotExist, CalendarRole.DoesNotExist):
            return Response({"error": "Role not found."}, status=status.HTTP_404_NOT_FOUND)

        is_admin = CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists()
        if not is_admin:
            raise PermissionDenied("Only admins can rename roles.")

        new_name = request.data.get('name', '').strip()
        if not new_name:
            return Response({"error": "New name required."}, status=status.HTTP_400_BAD_REQUEST)

        role.name = new_name
        role.save()
        return Response(CalendarRoleSerializer(role).data)

class CalendarPermissionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permissions = CalendarPermission.objects.all()
        serializer = CalendarPermissionSerializer(permissions, many=True)
        return Response(serializer.data)

class CalendarRolePermissionsUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id, role_id):
        try:
            role = CalendarRole.objects.get(id=role_id, calendar_id=calendar_id)
        except CalendarRole.DoesNotExist:
            return Response({"error": "Role not found."}, status=404)

        perms = role.permissions.all()
        data = CalendarPermissionSerializer(perms, many=True).data
        return Response({"permissions": data})

    def post(self, request, calendar_id, role_id):
        permission_codenames = request.data.get('permissions', [])

        try:
            role = CalendarRole.objects.get(id=role_id, calendar_id=calendar_id)
        except CalendarRole.DoesNotExist:
            return Response({"error": "Role not found."}, status=404)

        # Get new permission objects from codenames
        new_permissions = set(CalendarPermission.objects.filter(codename__in=permission_codenames))
        
        # Update role permissions directly
        role.permissions.set(new_permissions)
        role.save()

        # ❗ No member updates here — let get_effective_permissions handle it
        return Response({"message": "Role permissions updated successfully."})



class CalendarMemberPermissionsUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, calendar_id, member_id):
        permission_codenames = request.data.get('permissions', [])

        try:
            member = CalendarMembership.objects.get(id=member_id, calendar_id=calendar_id)
        except CalendarMembership.DoesNotExist:
            return Response({"error": "Member not found."}, status=404)

        # Fetch permission objects from codenames
        selected_perms = set(CalendarPermission.objects.filter(codename__in=permission_codenames))

        # Role permissions fallback to empty set if no role
        role_perms = set(member.title.permissions.all()) if member.title else set()

        # Calculate custom and excluded sets
        custom_perms = selected_perms - role_perms
        excluded_perms = role_perms - selected_perms

        # Apply changes
        member.custom_permissions.set(custom_perms)
        member.excluded_permissions.set(excluded_perms)

        # Calculate effective permissions
        final_perms = (role_perms | custom_perms) - excluded_perms
        granted_codenames = {perm.codename for perm in final_perms}

        # Check if member has all possible permissions
        all_possible = set(CalendarPermission.objects.values_list('codename', flat=True))
        member.is_admin = granted_codenames == all_possible
        member.save()

        return Response({"message": "Member permissions updated."})


class CalendarMemberEffectivePermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id, member_id):
        try:
            membership = CalendarMembership.objects.get(id=member_id, calendar_id=calendar_id)
        except CalendarMembership.DoesNotExist:
            return Response({"error": "Member not found."}, status=404)

        perms = membership.get_effective_permissions()
        data = CalendarPermissionSerializer(perms, many=True).data
        return Response({"permissions": data})  # ✅ wrap in "permissions"

class PendingSwapsAndTakesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        user = request.user

        try:
            membership = CalendarMembership.objects.get(calendar_id=calendar_id, user=user)
        except CalendarMembership.DoesNotExist:
            raise PermissionDenied("You are not a member of this calendar.")

        has_permission = (
            membership.is_admin or
            membership.permissions.filter(codename="approve_swaps").exists() or
            membership.permissions.filter(codename="approve_takes").exists()
        )

        if not has_permission:
            raise PermissionDenied("You do not have permission to view swap/take requests.")

        swap_requests = ShiftSwapRequest.objects.filter(
            shift__calendar_id=calendar_id,
            is_active=True,
            accepted_at__isnull=True,
            rejected_at__isnull=True,
        ).select_related("shift", "requester", "requested_with")

        take_requests = ShiftTakeRequest.objects.filter(
            shift__calendar_id=calendar_id,
            is_active=True,
            accepted_at__isnull=True,
            rejected_at__isnull=True,
        ).select_related("shift", "requester", "requested_to")

        return Response({
            "swap_requests": ShiftSwapRequestSerializer(swap_requests, many=True).data,
            "take_requests": ShiftTakeRequestSerializer(take_requests, many=True).data,
        })

class AdminPendingRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        calendar = get_object_or_404(Calendar, id=calendar_id)
        user = request.user

        # ✅ Check membership
        try:
            membership = CalendarMembership.objects.get(calendar=calendar, user=user)
        except CalendarMembership.DoesNotExist:
            return Response({"error": "You are not a member of this calendar."}, status=403)

        has_swap_perm = membership.is_admin or membership.has_permission("approve_reject_swap_requests")
        has_take_perm = membership.is_admin or membership.has_permission("approve_reject_take_requests")

        if not has_swap_perm and not has_take_perm:
            return Response({"error": "You do not have approval permissions."}, status=403)

        data = {}

        # 🟣 Pending swap requests
        if has_swap_perm and calendar.allow_swap_without_approval is False:
            pending_swaps = ShiftSwapRequest.objects.filter(
                requesting_shift__schedule__calendar=calendar,
                approved_by_target=True,
                approved_by_admin=False
            ).select_related('requesting_shift__employee', 'target_shift__employee')

            data['swap_requests'] = ShiftSwapRequestSerializer(pending_swaps, many=True).data

        # 🔵 Pending take requests
        if has_take_perm and calendar.require_take_approval:
            pending_takes = ShiftTakeRequest.objects.filter(
                shift__schedule__calendar=calendar,
                approved_by_target=True,
                approved_by_admin=False
            ).select_related('shift__employee', 'requested_by', 'requested_to')

            data['take_requests'] = ShiftTakeRequestSerializer(pending_takes, many=True).data

        return Response(data)

class PendingSwapRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        user = request.user
        is_admin = CalendarMembership.objects.filter(calendar_id=calendar_id, user=user, is_admin=True).exists()
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_swap_requests").has_permission(request, self)

        if not (is_admin or has_perm):
            return Response({"detail": "Permission denied."}, status=403)

        swaps = ShiftSwapRequest.objects.filter(
            requesting_shift__schedule__calendar_id=calendar_id,
            approved_by_target=True,
            approved_by_admin=False
        )
        return Response(ShiftSwapRequestSerializer(swaps, many=True).data)


class PendingTakeRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        user = request.user
        is_admin = CalendarMembership.objects.filter(calendar_id=calendar_id, user=user, is_admin=True).exists()
        has_perm = HasCalendarPermissionOrAdmin("approve_reject_take_requests").has_permission(request, self)

        if not (is_admin or has_perm):
            return Response({"detail": "Permission denied."}, status=403)

        takes = ShiftTakeRequest.objects.filter(
            shift__schedule__calendar_id=calendar_id,
            approved_by_target=True,
            approved_by_admin=False
        )
        return Response(ShiftTakeRequestSerializer(takes, many=True).data)

class CalendarTimeOffApprovalListView(ListAPIView):
    permission_classes = [HasCalendarPermissionOrAdmin('approve_reject_time_off')]
    serializer_class = TimeOffRequestSerializer

    def get_queryset(self):
        calendar_id = self.kwargs['calendar_id']
        return TimeOffRequest.objects.filter(calendar_id=calendar_id, status='pending')


# Approve a specific time off request
class TimeOffApproveView(APIView):
    permission_classes = [HasCalendarPermissionOrAdmin('approve_reject_time_off')]

    def post(self, request, calendar_id, pk):
        try:
            timeoff = TimeOffRequest.objects.get(id=pk, calendar_id=calendar_id)
        except TimeOffRequest.DoesNotExist:
            return Response({'error': 'Time off not found.'}, status=404)

        timeoff.status = 'approved'
        timeoff.visible_to_others = True
        timeoff.rejection_reason = ''
        timeoff.save()

        return Response({'success': 'Time off approved.'}, status=200)


class TimeOffRejectView(APIView):
    permission_classes = [HasCalendarPermissionOrAdmin('approve_reject_time_off')]

    def post(self, request, calendar_id, pk):
        reason = request.data.get('rejection_reason', '')

        try:
            timeoff = TimeOffRequest.objects.get(id=pk, calendar_id=calendar_id)
        except TimeOffRequest.DoesNotExist:
            return Response({'error': 'Time off not found.'}, status=404)

        timeoff.status = 'denied'
        timeoff.visible_to_others = False
        timeoff.rejection_reason = reason
        timeoff.save()

        # TODO: Create inbox notification for rejection (we'll add this after)
        return Response({'success': 'Time off rejected.'}, status=200)

class CalendarMemberDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, calendar_id, user_id):
        try:
            calendar = Calendar.objects.get(id=calendar_id)
            membership = CalendarMembership.objects.get(calendar=calendar, user_id=user_id)
        except (Calendar.DoesNotExist, CalendarMembership.DoesNotExist):
            return Response({"error": "Calendar or membership not found."}, status=404)

        if not CalendarMembership.objects.filter(calendar=calendar, user=request.user, is_admin=True).exists():
            return Response({"error": "You do not have permission to remove members."}, status=403)

        Shift.objects.filter(schedule__calendar=calendar, employee_id=user_id).delete()

        membership.delete()
        return Response({"message": "Member removed from calendar and shifts deleted."}, status=204)

class AnnouncementCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, calendar_id):
        message = request.data.get('message')
        sender_display = request.data.get('sender_name')  # optional override

        if not message:
            return Response({'error': 'Message is required'}, status=400)

        members = CalendarMembership.objects.filter(calendar_id=calendar_id).select_related('user')

        notifications = [
            InboxNotification(
                user=member.user,
                calendar_id=calendar_id,
                notification_type='ANNOUNCEMENT',
                message=message,
                sender=request.user,
                sender_display=sender_display or None
            )
            for member in members
        ]
        InboxNotification.objects.bulk_create(notifications)

        return Response({'message': 'Announcement sent!'})

class AnnouncementHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, calendar_id):
        all_announcements = InboxNotification.objects.filter(
            calendar_id=calendar_id,
            notification_type='ANNOUNCEMENT'
        ).select_related('sender').order_by('-created_at')

        grouped = {}
        for notif in all_announcements:
            key = (
                notif.message.strip(),
                notif.sender_id or notif.sender_display
            )
            # Store the first one only (most recent due to ordering)
            if key not in grouped:
                grouped[key] = notif

        serializer = InboxNotificationSerializer(grouped.values(), many=True)
        return Response(serializer.data)

class ScheduleNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, calendar_id, schedule_id):
        try:
            schedule = Schedule.objects.get(id=schedule_id, calendar_id=calendar_id)
        except Schedule.DoesNotExist:
            return Response({'error': 'Schedule not found'}, status=404)

        members = CalendarMembership.objects.filter(calendar_id=calendar_id).select_related('user')
        
        # ✅ Include optional notes
        release_notes = request.data.get('notes', '').strip()
        message = f"A new schedule has been released: {schedule.name or schedule.start_date}.\n"
        if release_notes:
            message += f"\n\n**Rlease Notes:**\n{release_notes}"

        # Step 1: Deactivate old notifications
        InboxNotification.objects.filter(
            related_object_id=schedule_id,
            notification_type='SCHEDULE_RELEASE'
        ).update(is_active=False, is_read=True)

        # Step 2: Create new notifications
        notifications = [
            InboxNotification(
                user=member.user,
                calendar_id=calendar_id,
                notification_type='SCHEDULE_RELEASE',
                related_object_id=schedule_id,
                message=message,
                is_active=True,
                is_read=False
            )
            for member in members
        ]

        InboxNotification.objects.bulk_create(notifications)
        return Response({'message': 'Schedule release notification sent!'})

class ScheduleConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, schedule_id):
        schedule = get_object_or_404(Schedule, id=schedule_id)
        ScheduleConfirmation.objects.get_or_create(user=request.user, schedule=schedule)

        # Optionally deactivate notification
        InboxNotification.objects.filter(
            user=request.user,
            related_object_id=schedule_id,
            notification_type='SCHEDULE_CONFIRMATION'
        ).update(is_active=False, is_read=True)

        return Response({'message': 'Schedule confirmed.'})

class ScheduleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, schedule_id):
        schedule = get_object_or_404(Schedule, id=schedule_id)
        serializer = ScheduleDetailSerializer(schedule)
        return Response(serializer.data)

class ScheduleConfirmationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, schedule_id):
        schedule = get_object_or_404(Schedule, id=schedule_id)
        serializer = ScheduleWithConfirmationsSerializer(schedule)
        return Response(serializer.data)

class ScheduleConfirmationResetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, schedule_id):
        schedule = get_object_or_404(Schedule, id=schedule_id)

        # Only allow calendar admins or users with a certain permission (optional)
        # if not request.user.is_staff: ...

        ScheduleConfirmation.objects.filter(schedule=schedule).delete()

        return Response({'message': 'Confirmations reset successfully.'}, status=200)

class ScheduleRemindUnconfirmedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, schedule_id):
        schedule = get_object_or_404(Schedule, id=schedule_id)
        calendar = schedule.calendar
        sender = request.user

        # Find confirmed users
        confirmed_user_ids = ScheduleConfirmation.objects.filter(
            schedule=schedule
        ).values_list('user_id', flat=True)

        # Get all members who are not in the confirmed list
        unconfirmed_members = ScheduleMembership.objects.filter(
            schedule=schedule
        ).exclude(user__id__in=confirmed_user_ids)

        notifications = []
        for membership in unconfirmed_members:
            user = membership.user
            msg = (
                f"Reminder: A new schedule **{schedule.name}** has been released.\n\n"
                "REMINDER: Please confirm that you have seen and viewed the schedule."
            )
            notifications.append(InboxNotification(
                user=user,
                calendar=calendar,
                message=msg,
                related_object_id=schedule.id,  # ✅ Use related_object_id
                notification_type="SCHEDULE_RELEASE",  # ✅ Use notification_type
                sender=sender,
            ))

        InboxNotification.objects.bulk_create(notifications)

        return Response({'status': 'reminders sent'})
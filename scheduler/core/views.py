from django.db import transaction
from django.db import models
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .permissions import IsScheduleAdmin
from django.utils.timezone import localtime
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
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
    WorkplaceHolidaySerializer
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

    def generate_unique_code(self, length=6):
        chars = string.ascii_uppercase + string.digits
        for _ in range(10):
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

        # assign the membership correctly
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
            return Response({"message": "Already a member of this calendar."}, status=400)


        return Response({"message": f"Joined calendar: {calendar.name}"})

# class CalendarMemberListView(generics.ListAPIView):
#     serializer_class = CalendarMembershipSimpleSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         calendar_id = self.kwargs['calendar_id']
#         return CalendarMembership.objects.filter(calendar_id=calendar_id)

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
                'requesting_shift__schedule',
                'target_shift__schedule'
            ).get(id=swap_id)
        except ShiftSwapRequest.DoesNotExist:
            return Response({"error": "Swap request not found."}, status=404)

        if swap.target_shift.employee != request.user:
            return Response({"error": "You are not authorized to approve this swap."}, status=403)

        swap.approved_by_target = True
        swap.save()

        if not swap.target_shift.schedule.require_admin_swap_approval:
            with transaction.atomic():
                a = swap.requesting_shift
                b = swap.target_shift
                a_employee = a.employee

                a.employee = b.employee
                b.employee = a_employee

                a.save()
                b.save()

                swap.approved_by_admin = True
                swap.save()

                from .models import InboxNotification
                InboxNotification.objects.create(
                    user=swap.requested_by,
                    notification_type='SWAP_REQUEST',
                    message=f"Your swap request for {format_shift_time(swap.requesting_shift)} was approved.",
                    related_object_id=swap.requesting_shift.id,
                    calendar=swap.requesting_shift.schedule.calendar  # ✅ always scoped correctly
                )
                ShiftSwapRequest.objects.filter(
                    models.Q(requesting_shift=a) | models.Q(target_shift=a) |
                    models.Q(requesting_shift=b) | models.Q(target_shift=b)
                ).exclude(id=swap.id).delete()

                swap.delete()

        return Response({"message": "Swap approved successfully."})


class ShiftSwapRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, swap_id):
        try:
            swap = ShiftSwapRequest.objects.select_related('requesting_shift__schedule').get(id=swap_id)
        except ShiftSwapRequest.DoesNotExist:
            return Response({"error": "Swap request not found."}, status=404)

        if swap.target_shift.employee != request.user:
            return Response({"error": "You are not authorized to reject this swap."}, status=403)

        # Create rejection notification before deleting the swap
        InboxNotification.objects.create(
            user=swap.requested_by,
            notification_type='SWAP_REQUEST',
            message=f"Your swap request for {format_shift_time(swap.requesting_shift)} was rejected.",
            related_object_id=swap.requesting_shift.id,
            calendar=swap.requesting_shift.schedule.calendar
        )

        swap.delete()
        return Response({"message": "Swap request rejected and deleted."})


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
            take = ShiftTakeRequest.objects.select_related("shift").get(id=take_id)
        except ShiftTakeRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=404)

        if take.requested_to != request.user:
            return Response({"error": "You are not the recipient."}, status=403)

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
                related_object_id=take.shift.id,  # ✅ needs to open the shift modal
                calendar=take.shift.schedule.calendar
            )

            take.delete()

        return Response({"message": "Shift successfully taken."})


class ShiftTakeRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, take_id):
        try:
            take = ShiftTakeRequest.objects.get(id=take_id)
        except ShiftTakeRequest.DoesNotExist:
            return Response({"error": "Request not found."}, status=404)

        if take.requested_to != request.user:
            return Response({"error": "You are not the recipient."}, status=403)
        
        InboxNotification.objects.create(
            user=take.requested_by,
            notification_type='TAKE_REQUEST',
            message=f"Your shift take request for {format_shift_time(take.shift)} was rejected.",
            related_object_id=take.shift.id,
            calendar=take.shift.schedule.calendar
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
        serializer = TimeOffRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(employee=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TimeOffListView(ListAPIView):
    serializer_class = TimeOffRequestSerializer

    def get_queryset(self):
        return TimeOffRequest.objects.filter(status__in=['pending', 'approved'])

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
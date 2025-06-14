from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import(
    Schedule, 
    ScheduleMembership, 
    Shift, 
    TimeOffRequest, 
    CalendarMembership, 
    Calendar, 
    CalendarRole, 
    ShiftSwapRequest, 
    ShiftTakeRequest, 
    InboxNotification,
    WorkplaceHoliday,
    CalendarPermission,
    ScheduleConfirmation,
)


User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class ScheduleCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(allow_blank=True, required=False)
    class Meta:
        model = Schedule
        fields = ['name', 'start_date', 'end_date']

class ScheduleListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    confirmation_count = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id',
            'name',
            'start_date',
            'end_date',
            'is_published',
            'role',
            'confirmation_count',
        ]

    def get_role(self, obj):
        user = self.context['request'].user
        membership = ScheduleMembership.objects.filter(schedule=obj, user=user).first()
        return membership.role if membership else None

    def get_confirmation_count(self, obj):
        confirmed = obj.scheduleconfirmation_set.count()
        total = ScheduleMembership.objects.filter(schedule=obj).count()
        return f"{confirmed}/{total}"

User = get_user_model()

class ScheduleInviteSerializer(serializers.Serializer):
    username = serializers.CharField()
    role = serializers.ChoiceField(choices=ScheduleMembership.ROLE_CHOICES)

    def validate(self, data):
        username = data.get('username')
        try:
            data['user'] = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return data

    def create(self, validated_data):
        schedule = self.context['schedule']
        user = validated_data['user']
        role = validated_data['role']

        membership, created = ScheduleMembership.objects.get_or_create(
            schedule=schedule,
            user=user,
            defaults={'role': role}
        )
        if not created:
            raise serializers.ValidationError("User is already a member of this schedule.")
        return membership

class ScheduleMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')

    class Meta:
        model = ScheduleMembership
        fields = ['username', 'role']

class ShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    schedule = serializers.PrimaryKeyRelatedField(read_only=True)
    color = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            'id', 'schedule', 'start_time', 'end_time',
            'position', 'employee', 'employee_name', 'color', 'notes'
        ]

    def get_employee_name(self, obj):
        first = obj.employee.first_name or ""
        last = obj.employee.last_name or ""
        return f"{first} {last}".strip()

    def get_color(self, obj):
        calendar = obj.schedule.calendar
        try:
            membership = CalendarMembership.objects.get(user=obj.employee, calendar=calendar)
            return membership.color
        except CalendarMembership.DoesNotExist:
            return "#8b5cf6"  # fallback

class TimeOffRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOffRequest
        fields = ['id', 'start_date', 'end_date', 'reason']

class TimeOffRequestManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOffRequest
        fields = ['status']

class TimeOffRequestDetailSerializer(serializers.ModelSerializer):
    employee_username = serializers.CharField(source='employee.username', read_only=True)

    class Meta:
        model = TimeOffRequest
        fields = ['id', 'employee_username', 'start_date', 'end_date', 'reason', 'status']

class ScheduleSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = []

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'first_name',
            'middle_name',
            'last_name',
            'phone_number',
            'pronouns',
            'show_pronouns',
            'show_middle_name',
            'notify_email',
            'notify_sms',
            'username',
            'email',
        ]

    def validate(self, data):
        errors = {}

        if not data.get('first_name'):
            errors['first_name'] = 'First name is required.'
        if not data.get('last_name'):
            errors['last_name'] = 'Last name is required.'

        if errors:
            raise serializers.ValidationError(errors)

        return data

class CalendarMembershipSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(read_only=True)
    color = serializers.CharField()
    title_id = serializers.IntegerField(source='title.id', read_only=True)  # for dropdown selection
    membership_id = serializers.IntegerField(source='id')

    class Meta:
        model = CalendarMembership
        fields = ['id', 'username', 'full_name', 'role', 'is_admin', 'color', 'title_id', 'membership_id']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_role(self, obj):
        if obj.title:
            return obj.title.name.upper()
        return "None"

class CalendarPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarPermission
        fields = ['id', 'codename', 'label']

class CalendarMembershipPermissionSerializer(serializers.ModelSerializer):
    custom_permissions = CalendarPermissionSerializer(many=True, read_only=True)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = CalendarMembership
        fields = ['id', 'user', 'custom_permissions', 'effective_permissions']

    def get_effective_permissions(self, obj):
        perms = obj.get_effective_permissions()
        return [p.codename for p in perms]

class CalendarRoleSerializer(serializers.ModelSerializer):
    permissions = CalendarPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = CalendarRole
        fields = ['id', 'name', 'permissions']

class CalendarSerializer(serializers.ModelSerializer):
    members = CalendarMembershipSerializer(source='calendarmembership_set', many=True, read_only=True)
    roles = CalendarRoleSerializer(many=True, read_only=True)
    self_role_change_allowed = serializers.BooleanField(default=True)
    allow_swap_without_approval = serializers.BooleanField(default=True)
    require_take_approval = serializers.BooleanField(default=True)

    # Fields only used during creation
    creator_title = serializers.CharField(write_only=True, required=False, allow_blank=True)
    input_roles = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    def create(self, validated_data):
        print("📤 CalendarSerializer.create() called with:", validated_data)
        color = validated_data.pop("color", None)
        creator_title = validated_data.pop("creator_title", None)
        input_roles = validated_data.pop("input_roles", None)

        calendar = super().create(validated_data)

        user = self.context['request'].user

        # Set the color on the CalendarMembership for the creator
        CalendarMembership.objects.filter(calendar=calendar, user=user).update(color=color)

        return calendar

    class Meta:
        model = Calendar
        fields = [
            'id', 'name', 'join_code', 'members', 'roles', 'self_role_change_allowed',
            'creator_title', 'input_roles', 'allow_swap_without_approval', 'require_take_approval',
        ]

class CalendarJoinSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    used_colors = serializers.SerializerMethodField()

    class Meta:
        model = Calendar
        fields = ['id', 'name', 'roles', 'used_colors']

    def get_roles(self, obj):
        roles = obj.roles.exclude(name__iexact='admin')
        return CalendarRoleSerializer(roles, many=True).data
    def get_used_colors(self, obj):     
        return list(obj.calendarmembership_set.filter(color__isnull=False).values_list('color', flat=True))

class CalendarMembershipSimpleSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = CalendarMembership
        fields = ['id', 'username', 'full_name', 'role', 'is_admin']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_role(self, obj):
        return obj.title.name.upper() if obj.title else "None"

    def get_is_admin(self, obj):
        return obj.is_admin

# serializers.py

class ShiftSwapRequestSerializer(serializers.ModelSerializer):
    requesting_employee = serializers.SerializerMethodField()
    target_employee = serializers.SerializerMethodField()
    requesting_shift_time = serializers.SerializerMethodField()
    target_shift_time = serializers.SerializerMethodField()
    position = serializers.CharField(source='requesting_shift.position', read_only=True)
    requesting_employee_id = serializers.IntegerField(source='requesting_shift.employee.id', read_only=True)
    target_employee_id = serializers.IntegerField(source='target_shift.employee.id', read_only=True)
    approved_by_target = serializers.BooleanField(read_only=True)
    approved_by_admin = serializers.BooleanField(read_only=True)
    requires_admin_approval = serializers.SerializerMethodField()


    class Meta:
        model = ShiftSwapRequest
        fields = [
            'id',
            'requesting_shift_id',
            'target_shift_id',
            'requesting_employee',
            'target_employee',
            'requesting_shift_time',
            'target_shift_time',
            'position',
            'requesting_employee_id',
            'target_employee_id',
            'approved_by_target',
            'approved_by_admin',
            'requires_admin_approval',
        ]

    def get_requesting_shift_time(self, obj):
        return {
            'start': obj.requesting_shift.start_time,
            'end': obj.requesting_shift.end_time,
        }

    def get_target_shift_time(self, obj):
        return {
            'start': obj.target_shift.start_time,
            'end': obj.target_shift.end_time,
        }
    def get_requesting_employee(self, obj):
        user = obj.requesting_shift.employee
        return f"{user.first_name} {user.last_name}".strip() or user.username

    def get_target_employee(self, obj):
        user = obj.target_shift.employee
        return f"{user.first_name} {user.last_name}".strip() or user.username

    def get_requires_admin_approval(self, obj):
        return not obj.target_shift.schedule.calendar.allow_swap_without_approval


class ShiftTakeRequestSerializer(serializers.ModelSerializer):
    shift_time = serializers.SerializerMethodField()
    shift_owner = serializers.SerializerMethodField()
    requester = serializers.SerializerMethodField()
    direction = serializers.SerializerMethodField()
    requested_by_id = serializers.IntegerField(source="requested_by.id")
    requested_to_id = serializers.IntegerField(source="requested_to.id")
    requires_admin_approval = serializers.SerializerMethodField()
    approved_by_target = serializers.BooleanField()

    class Meta:
        model = ShiftTakeRequest
        fields = [
            'id', 'shift', 'shift_time', 'shift_owner', 'requester', 'direction',
            'requested_by_id', 'requested_to_id', 'requires_admin_approval',
            'approved_by_target'
        ]

    def get_shift_time(self, obj):
        return {
            "start": obj.shift.start_time,
            "end": obj.shift.end_time
        }

    def get_shift_owner(self, obj):
        return f"{obj.requested_to.first_name} {obj.requested_to.last_name}".strip()

    def get_requester(self, obj):
        return f"{obj.requested_by.first_name} {obj.requested_by.last_name}".strip()

    def get_direction(self, obj):
        # If the requester is not the shift owner, they want to *take* the shift
        return "take" if obj.requested_to == obj.shift.employee else "give"

    def get_requires_admin_approval(self, obj):
        return obj.shift.schedule.calendar.require_take_approval

class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField(read_only=True)
    calendar = serializers.PrimaryKeyRelatedField(read_only=True) 

    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'employee', 'employee_name', 'calendar',
            'start_date', 'end_date', 'reason',
            'status', 'created_at', 'visible_to_others',
            'rejection_reason',
        ]
        read_only_fields = ['employee', 'status', 'created_at', 'visible_to_others', 'rejection_reason']

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username


class WorkplaceHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkplaceHoliday
        fields = ['id', 'calendar', 'date', 'end_date', 'type', 'start_time', 'end_time', 'note', 'title']
        read_only_fields = ['calendar']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_input = attrs.get("username")  # could be username or email
        password = attrs.get("password")

        # Try to find user by email or username
        user = User.objects.filter(email__iexact=login_input).first() \
            or User.objects.filter(username__iexact=login_input).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError("Incorrect username or password.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        data = super().validate({
            "username": user.username,  # force super to use username
            "password": password
        })
        return data

class InboxNotificationSerializer(serializers.ModelSerializer):
    calendar = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = InboxNotification
        fields = [
            'id',
            'notification_type',
            'message',
            'created_at',
            'is_read',
            'is_active',
            'related_object_id',
            'calendar',
            'sender_name',
        ]

    def get_calendar(self, obj):
        if obj.calendar:
            return {
                'id': obj.calendar.id,
                'name': obj.calendar.name
            }
        return None

    def get_sender_name(self, obj):
        if obj.sender_display:
            return obj.sender_display
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return "Unknown"

class ScheduleDetailSerializer(serializers.ModelSerializer):
    confirmed_by = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = ['id', 'name', 'start_date', 'end_date', 'is_published', 'confirmed_by']

    def get_confirmed_by(self, obj):
        confirmations = ScheduleConfirmation.objects.filter(schedule=obj).select_related('user')
        return [
            {
                'id': sc.user.id,
                'username': sc.user.username,
                'first_name': sc.user.first_name,
                'last_name': sc.user.last_name,
                'confirmed_at': sc.confirmed_at,
            }
            for sc in confirmations
        ]

class ScheduleWithConfirmationsSerializer(serializers.ModelSerializer):
    confirmed_members = serializers.SerializerMethodField()
    unconfirmed_members = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'name', 'start_date', 'end_date',
            'is_published', 'confirmed_members', 'unconfirmed_members'
        ]

    def get_confirmed_members(self, obj):
        confirmations = ScheduleConfirmation.objects.filter(schedule=obj).select_related('user')
        return [
            {
                'id': sc.user.id,
                'first_name': sc.user.first_name,
                'last_name': sc.user.last_name,
            }
            for sc in confirmations
        ]

    def get_unconfirmed_members(self, obj):
        all_members = ScheduleMembership.objects.filter(schedule=obj).select_related('user')
        confirmed_ids = ScheduleConfirmation.objects.filter(schedule=obj).values_list('user_id', flat=True)
        return [
            {
                'id': m.user.id,
                'first_name': m.user.first_name,
                'last_name': m.user.last_name,
            }
            for m in all_members if m.user.id not in confirmed_ids
        ]
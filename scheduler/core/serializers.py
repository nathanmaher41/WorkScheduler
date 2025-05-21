from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Schedule, ScheduleMembership, Shift, TimeOffRequest



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


class ScheduleListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    require_admin_swap_approval = serializers.BooleanField()

    class Meta:
        model = Schedule
        fields = ['id', 'name', 'start_date', 'end_date', 'is_published', 'role', 'require_admin_swap_approval']

    def get_role(self, obj):
        user = self.context['request'].user
        membership = ScheduleMembership.objects.filter(schedule=obj, user=user).first()
        return membership.role if membership else None

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
    employee_name = serializers.CharField(source='employee.username', read_only=True)

    class Meta:
        model = Shift
        fields = ['id', 'schedule', 'start_time', 'end_time', 'position', 'employee_name']

    def validate_employee_username(self, value):
        try:
            return User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

    def create(self, validated_data):
        employee = validated_data.pop('employee_username')
        return Shift.objects.create(employee=employee, **validated_data)

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
        fields = ['require_admin_swap_approval']
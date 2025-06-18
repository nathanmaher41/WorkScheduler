from django.core.mail import send_mail
from django.conf import settings

def send_activation_email(to_email, username):
    subject = 'Activate your ScheduLounge account'
    message = f'Hello {username},\n\nThanks for registering! Please verify your email to continue using ScheduLounge.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [to_email]

    send_mail(subject, message, from_email, recipient_list, fail_silently=False)

def send_notification_email(subject, message, to_email):
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [to_email]

    send_mail(subject, message, from_email, recipient_list, fail_silently=False)
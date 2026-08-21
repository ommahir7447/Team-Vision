"""
notifications.py — Same-Day Absence Alert Engine (SmartAttend Module 4)
Handles sending real-time notification alerts (Email / SMS / FCM Push)
when a student is recorded absent or flagged during classroom entry.
"""

from datetime import datetime

def send_absence_notification(student_email: str, student_name: str, course_name: str, timestamp=None) -> dict:
    """
    Triggers immediate notification for absent event.
    """
    time_str = timestamp.strftime('%Y-%m-%d %I:%M %p') if timestamp else datetime.now().strftime('%Y-%m-%d %I:%M %p')
    
    subject = f"[SmartAttend Alert] Absence Recorded — {course_name}"
    body = (
        f"Dear {student_name},\n\n"
        f"You were recorded ABSENT for {course_name} on {time_str}.\n"
        f"If this is an error, you may submit a formal attendance appeal via your SmartAttend Student Portal within 48 hours.\n\n"
        f"Regards,\nSmartAttend Monitoring System\nKarnavati University (UIT CSE)"
    )

    # Logging mock dispatch
    print(f"[INFO] Notification Sent to [{student_email}]: {subject}")

    return {
        'status': 'sent',
        'recipient': student_email,
        'subject': subject,
        'timestamp': time_str,
        'channel': 'Email/Push'
    }


def send_defaulter_warning(student_email: str, student_name: str, course_name: str, current_pct: float) -> dict:
    """
    Triggers defaulter warning alert when student drops near or below 75%.
    """
    subject = f"[SmartAttend Warning] Defaulter Risk Alert — {course_name} ({current_pct}%)"
    body = (
        f"Dear {student_name},\n\n"
        f"Your attendance in {course_name} is currently {current_pct}%, which is below the mandatory 75% threshold.\n"
        f"Please attend upcoming lectures to avoid academic disqualification.\n\n"
        f"Regards,\nDepartment of CSE - Karnavati University"
    )

    print(f"[WARNING] Defaulter Warning Sent to [{student_email}]: {subject}")

    return {
        'status': 'sent',
        'recipient': student_email,
        'subject': subject,
        'channel': 'Email/Push'
    }

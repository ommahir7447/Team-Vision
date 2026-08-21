"""
attendance.py — AttendanceRecord Model (SmartAttend Module 2)
"""

from datetime import datetime
from backend.models.database import db

class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'

    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.course_id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), nullable=False) # 'Present', 'Absent', 'Flagged'
    confidence_score = db.Column(db.Float, nullable=True) # 0.0 to 1.0
    verification_type = db.Column(db.String(20), nullable=True) # 'Auto', 'Manual'

    def to_dict(self):
        return {
            'record_id': self.record_id,
            'student_id': self.student_id,
            'course_id': self.course_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'date': self.timestamp.strftime('%Y-%m-%d') if self.timestamp else None,
            'time': self.timestamp.strftime('%I:%M %p') if self.timestamp else '—',
            'status': self.status,
            'confidence': self.confidence_score,
            'verification_type': self.verification_type
        }

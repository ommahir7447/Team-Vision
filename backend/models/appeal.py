"""
appeal.py — Appeal Model (SmartAttend Module 2 & Module 4)
"""

from datetime import datetime
from backend.models.database import db

class Appeal(db.Model):
    __tablename__ = 'appeals'

    id = db.Column(db.Integer, primary_key=True)
    appeal_id = db.Column(db.String(50), unique=True, nullable=False)
    record_id = db.Column(db.String(50), db.ForeignKey('attendance_records.record_id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.course_id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Pending', nullable=False) # 'Pending', 'Approved', 'Rejected'
    reviewed_by = db.Column(db.String(50), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'appeal_id': self.appeal_id,
            'record_id': self.record_id,
            'student_id': self.student_id,
            'course_id': self.course_id,
            'reason': self.reason,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

"""
mentor.py — Mentor Assignment Model (SmartAttend Module 2)
Maps a mentor (faculty user) to assigned students for a given academic term.
Mentors can only view academic details of their assigned students.
"""

from datetime import datetime
from backend.models.database import db


class MentorAssignment(db.Model):
    __tablename__ = 'mentor_assignments'

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.String(50), unique=True, nullable=False)   # e.g. MA-F001-S701
    mentor_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    semester = db.Column(db.String(20), nullable=False, default='Semester 7')
    academic_year = db.Column(db.String(20), nullable=False, default='2025-2026')
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    notes = db.Column(db.Text, nullable=True)   # mentor's private notes on the student

    def to_dict(self):
        return {
            'assignment_id': self.assignment_id,
            'mentor_id': self.mentor_id,
            'student_id': self.student_id,
            'semester': self.semester,
            'academic_year': self.academic_year,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'notes': self.notes,
        }

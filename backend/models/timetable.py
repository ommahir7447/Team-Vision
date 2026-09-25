"""
timetable.py — Timetable Model (SmartAttend Module 2)
Stores weekly class schedule: day-of-week, time slot, course, room, faculty.
"""

from backend.models.database import db


class Timetable(db.Model):
    __tablename__ = 'timetables'

    id = db.Column(db.Integer, primary_key=True)
    slot_id = db.Column(db.String(50), unique=True, nullable=False)       # e.g. TT-MON-0900-C101
    faculty_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.course_id'), nullable=False)
    day_of_week = db.Column(db.String(12), nullable=False)                # Monday … Saturday
    start_time = db.Column(db.String(10), nullable=False)                 # 09:00
    end_time = db.Column(db.String(10), nullable=False)                   # 10:00
    room = db.Column(db.String(50), nullable=False, default='Room 301')
    section = db.Column(db.String(20), nullable=False, default='Section B')
    slot_type = db.Column(db.String(20), nullable=False, default='Lecture')  # Lecture, Lab, Tutorial

    def to_dict(self):
        return {
            'slot_id': self.slot_id,
            'faculty_id': self.faculty_id,
            'course_id': self.course_id,
            'day': self.day_of_week,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'room': self.room,
            'section': self.section,
            'type': self.slot_type,
        }

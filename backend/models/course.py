"""
course.py — Course & Enrollment Models (SmartAttend Module 2)
"""

from backend.models.database import db

class Course(db.Model):
    __tablename__ = 'courses'

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.String(50), unique=True, nullable=False) # e.g. C101, CS601
    course_code = db.Column(db.String(20), nullable=False)
    course_name = db.Column(db.String(150), nullable=False)
    faculty_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    faculty_name = db.Column(db.String(100), nullable=True)
    program = db.Column(db.String(100), nullable=False, default='B.Tech CSE')
    semester = db.Column(db.String(20), nullable=False, default='Semester 6')
    section = db.Column(db.String(20), nullable=False, default='Section C')
    total_classes = db.Column(db.Integer, default=40)

    def to_dict(self):
        return {
            'course_id': self.course_id,
            'code': self.course_code,
            'name': self.course_name,
            'faculty_id': self.faculty_id,
            'faculty_name': self.faculty_name,
            'program': self.program,
            'semester': self.semester,
            'section': self.section,
            'total_classes': self.total_classes
        }


class Enrollment(db.Model):
    __tablename__ = 'enrollments'

    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.user_id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.course_id'), nullable=False)
    semester = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'enrollment_id': self.enrollment_id,
            'student_id': self.student_id,
            'course_id': self.course_id,
            'semester': self.semester
        }

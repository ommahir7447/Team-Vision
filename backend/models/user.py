"""
user.py — User & Student/Faculty Models (SmartAttend Module 2)
"""

from werkzeug.security import generate_password_hash, check_password_hash
from backend.models.database import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), unique=True, nullable=False) # e.g. S045, F001
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student') # 'student', 'faculty', 'admin'
    department = db.Column(db.String(100), default='Computer Science & Engineering')
    
    # Student specific fields
    enrollment_no = db.Column(db.String(50), unique=True, nullable=True)
    program = db.Column(db.String(100), nullable=True, default='B.Tech CSE')
    semester = db.Column(db.Integer, nullable=True, default=6)
    section = db.Column(db.String(10), nullable=True, default='C')
    roll_number = db.Column(db.String(50), nullable=True)
    face_embedding_id = db.Column(db.String(100), nullable=True)
    profile_picture = db.Column(db.Text, nullable=True)  # URL or Base64 data URI

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'department': self.department,
            'enrollment_no': self.enrollment_no,
            'program': self.program,
            'semester': self.semester,
            'section': self.section,
            'roll_number': self.roll_number,
            'profile_picture': self.profile_picture
        }

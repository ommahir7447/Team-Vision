"""
conftest.py — Shared test fixtures for SmartAttend API tests.
Uses an in-memory SQLite database so no external DB is needed.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app import create_app
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course
from backend.config import Config


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_SECRET_KEY = 'smartattend_test_secret_key_32ch'
    WTF_CSRF_ENABLED = False


@pytest.fixture(scope='function')
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()

        # Seed a student
        student = User(
            user_id='S-202307020009',
            name='Om Ahir',
            email='202307020009@smartattend.edu',
            enrollment_no='202307020009',
            role='student',
            department='Computer Science & Engineering',
            program='B.Tech CSE',
            semester=7,
            section='B'
        )
        student.set_password('student123')

        # Seed a faculty
        faculty = User(
            user_id='F001',
            name='Dr. Priya Sharma',
            email='p.sharma@smartattend.edu',
            role='faculty',
            department='Computer Science & Engineering'
        )
        faculty.set_password('faculty123')

        # Seed a course
        course = Course(
            course_id='C101',
            course_code='CS601',
            course_name='Machine Learning',
            faculty_id='F001',
            faculty_name='Dr. Priya Sharma',
            program='B.Tech CSE',
            semester='Semester 7',
            section='Section B',
            total_classes=40
        )

        db.session.add_all([student, faculty, course])
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def student_token(client):
    """Returns a valid JWT token for the test student."""
    resp = client.post('/api/auth/login', json={
        'identifier': '202307020009',
        'password': 'student123'
    })
    return resp.get_json()['access_token']


@pytest.fixture
def faculty_token(client):
    """Returns a valid JWT token for the test faculty."""
    resp = client.post('/api/auth/login', json={
        'identifier': 'F001',
        'password': 'faculty123'
    })
    return resp.get_json()['access_token']

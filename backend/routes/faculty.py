"""
faculty.py — Faculty Dashboard REST API Handlers (SmartAttend Module 2)
Provides endpoints for faculty profile, assigned classes, and subject analytics.
"""

from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course

faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')

@faculty_bp.route('/profile', methods=['GET'])
def get_faculty_profile():
    faculty_id = request.args.get('faculty_id', 'F001')
    faculty = User.query.filter_by(user_id=faculty_id, role='faculty').first()
    
    if not faculty:
        faculty = User.query.filter_by(role='faculty').first()

    return jsonify({
        'faculty_id': faculty.user_id if faculty else 'F001',
        'name': faculty.name if faculty else 'Dr. Priya Sharma',
        'department': faculty.department if faculty else 'Computer Science & Engineering',
        'email': faculty.email if faculty else 'p.sharma@karnavati.edu',
        'initials': 'PS'
    }), 200


@faculty_bp.route('/classes', methods=['GET'])
def get_faculty_classes():
    faculty_id = request.args.get('faculty_id', 'F001')
    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    return jsonify([c.to_dict() for c in courses]), 200


@faculty_bp.route('/analytics', methods=['GET'])
def get_analytics():
    return jsonify({
        'total_enrolled': 120,
        'avg_attendance_rate': 82.4,
        'defaulters_count': 3,
        'top_performing_subject': 'Machine Learning',
        'at_risk_subject': 'Cloud Computing'
    }), 200

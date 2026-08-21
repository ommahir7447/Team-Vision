"""
attendance.py — Attendance REST API Handlers (SmartAttend Module 2)
Logs attendance events, serves filtered class data for Faculty Dashboard,
and processes manual override verification requests.
"""

from datetime import datetime
import uuid
from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course
from backend.models.attendance import AttendanceRecord

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

@attendance_bp.route('/log', methods=['POST'])
def log_attendance():
    """
    Receives face recognition result & creates attendance record.
    Payload: { student_id, course_id, confidence, liveness_passed }
    """
    data = request.get_json() or {}
    student_id = data.get('student_id')
    course_id = data.get('course_id')
    confidence = float(data.get('confidence', 0.0))
    liveness_passed = data.get('liveness_passed', True)

    if not student_id or not course_id:
        return jsonify({'error': 'student_id and course_id are required'}), 400

    if not liveness_passed:
        return jsonify({
            'status': 'Rejected',
            'reason': 'Liveness verification failed (anti-spoofing alert)',
            'record_created': False
        }), 422

    # Threshold rules: >= 0.85 Auto Present, 0.55-0.84 Flagged for Manual, < 0.55 Rejected
    if confidence >= 0.85:
        status = 'Present'
        verification_type = 'Auto'
    elif confidence >= 0.55:
        status = 'Flagged'
        verification_type = 'Manual'
    else:
        return jsonify({
            'status': 'Rejected',
            'reason': 'Confidence score below recognition cutoff',
            'confidence': confidence,
            'record_created': False
        }), 400

    record = AttendanceRecord(
        record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
        student_id=student_id,
        course_id=course_id,
        timestamp=datetime.utcnow(),
        status=status,
        confidence_score=confidence,
        verification_type=verification_type
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({
        'message': 'Attendance record logged successfully',
        'record': record.to_dict()
    }), 201


@attendance_bp.route('/class', methods=['GET'])
def get_class_attendance():
    """
    Returns filtered class statistics, student list, and trend graph for faculty.
    Query params: subject, program, semester, section
    """
    subject = request.args.get('subject', 'Machine Learning')
    program = request.args.get('program', 'B.Tech CSE')
    semester = request.args.get('semester', 'Semester 7')
    section = request.args.get('section', 'Section B')

    # Query course matching criteria
    course = Course.query.filter_by(
        course_name=subject,
        program=program,
        semester=semester,
        section=section
    ).first()

    if not course:
        # Fallback query matching course_name only
        course = Course.query.filter(Course.course_name.ilike(f"%{subject}%")).first()

    course_id = course.course_id if course else 'C101'

    # Retrieve all enrolled students in section
    students = User.query.filter_by(role='student', program=program, section=section[-1] if section else 'B').all()
    if not students:
        students = User.query.filter_by(role='student').all()

    student_list = []
    present_cnt = 0
    absent_cnt = 0
    flagged_cnt = 0

    for s in students:
        rec = AttendanceRecord.query.filter_by(student_id=s.user_id, course_id=course_id)\
                                   .order_by(AttendanceRecord.timestamp.desc()).first()
        status = rec.status if rec else 'Absent'
        conf = rec.confidence_score if rec else None
        vtype = rec.verification_type if rec else None
        ttime = rec.timestamp.strftime('%I:%M %p') if (rec and rec.timestamp) else '—'

        if status == 'Present':
            present_cnt += 1
        elif status == 'Flagged':
            flagged_cnt += 1
        else:
            absent_cnt += 1

        student_list.append({
            'id': s.enrollment_no or s.user_id,
            'name': s.name,
            'status': status,
            'confidence': conf,
            'time': ttime,
            'type': vtype
        })

    total = len(student_list) or 1
    rate = round(((present_cnt + (flagged_cnt * 0.5)) / total) * 100, 1)

    return jsonify({
        'stats': {
            'total': total,
            'present': present_cnt,
            'absent': absent_cnt,
            'flagged': flagged_cnt,
            'rate': rate
        },
        'students': student_list,
        'trend': {
            'labels': ['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7','Wk 8'],
            'datasets': [{'label': 'Attendance %', 'data': [88, 85, 82, 80, 84, 81, 83, rate]}]
        },
        'activity': [
            {'name': s['name'], 'action': f"marked {s['status']}", 'course': subject, 'time': 'Recent', 'status': s['status'].lower()}
            for s in student_list[:5]
        ]
    }), 200


@attendance_bp.route('/verify', methods=['POST'])
def verify_flagged_record():
    """
    Faculty manual override to approve/resolve a flagged record.
    Payload: { record_id, action: 'Approve' | 'Reject' }
    """
    data = request.get_json() or {}
    record_id = data.get('record_id')
    action = data.get('action', 'Approve')

    record = AttendanceRecord.query.filter_by(record_id=record_id).first()
    if not record:
        return jsonify({'error': 'Record not found'}), 404

    record.status = 'Present' if action == 'Approve' else 'Absent'
    record.verification_type = 'Manual'
    db.session.commit()

    return jsonify({
        'message': f'Record {action.lower()}d successfully',
        'record': record.to_dict()
    }), 200

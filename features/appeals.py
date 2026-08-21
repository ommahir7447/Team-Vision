"""
appeals.py — Student Appeals Service & Workflow (SmartAttend Module 4)
Handles appeal submissions, listing appeals by role, and faculty review actions.
When an appeal is APPROVED by faculty, it automatically updates the linked AttendanceRecord to Present.
"""

from datetime import datetime
import uuid
from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course
from backend.models.attendance import AttendanceRecord
from backend.models.appeal import Appeal

appeals_bp = Blueprint('appeals', __name__, url_prefix='/api/appeals')

@appeals_bp.route('', methods=['POST'])
def submit_appeal():
    """
    Student submits an appeal contesting an absent/flagged record.
    Payload: { student_id, record_id, course_id, reason }
    """
    data = request.get_json() or {}
    student_id = data.get('student_id', 'S045')
    record_id = data.get('record_id')
    course_id = data.get('course_id', 'C101')
    reason = data.get('reason', '').strip()

    if not record_id or not reason:
        return jsonify({'error': 'record_id and reason are required'}), 400

    appeal = Appeal(
        appeal_id=f"APP-{uuid.uuid4().hex[:8].upper()}",
        record_id=record_id,
        student_id=student_id,
        course_id=course_id,
        reason=reason,
        status='Pending',
        created_at=datetime.utcnow()
    )

    db.session.add(appeal)
    db.session.commit()

    return jsonify({
        'message': 'Appeal submitted successfully for faculty review',
        'appeal': appeal.to_dict()
    }), 201


@appeals_bp.route('', methods=['GET'])
def get_appeals():
    """
    Retrieves appeals filtered by student_id or faculty_id.
    """
    student_id = request.args.get('student_id')
    course_id = request.args.get('course_id')

    query = Appeal.query
    if student_id:
        query = query.filter_by(student_id=student_id)
    if course_id:
        query = query.filter_by(course_id=course_id)

    appeals = query.order_by(Appeal.created_at.desc()).all()
    results = []
    
    for a in appeals:
        rec = AttendanceRecord.query.filter_by(record_id=a.record_id).first()
        course = Course.query.filter_by(course_id=a.course_id).first()
        student = User.query.filter_by(user_id=a.student_id).first()

        item = a.to_dict()
        item['student_name'] = student.name if student else a.student_id
        item['course_name'] = course.course_name if course else a.course_id
        item['record_date'] = rec.timestamp.strftime('%Y-%m-%d') if rec else '—'
        results.append(item)

    return jsonify(results), 200


@appeals_bp.route('/<appeal_id>/review', methods=['PUT'])
def review_appeal(appeal_id):
    """
    Faculty approves or rejects an appeal.
    Payload: { status: 'Approved' | 'Rejected', reviewer_id: 'F001' }
    """
    data = request.get_json() or {}
    new_status = data.get('status', 'Approved')
    reviewer_id = data.get('reviewer_id', 'F001')

    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    if not appeal:
        return jsonify({'error': 'Appeal record not found'}), 404

    appeal.status = new_status
    appeal.reviewed_by = reviewer_id
    appeal.reviewed_at = datetime.utcnow()

    # If APPROVED, automatically correct the linked AttendanceRecord
    if new_status == 'Approved':
        record = AttendanceRecord.query.filter_by(record_id=appeal.record_id).first()
        if record:
            record.status = 'Present'
            record.verification_type = 'Manual'

    db.session.commit()

    return jsonify({
        'message': f'Appeal marked as {new_status}',
        'appeal': appeal.to_dict()
    }), 200

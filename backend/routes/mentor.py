"""
mentor.py — Mentor Dashboard REST API Handlers (SmartAttend Module 2)
Provides endpoints for mentor profile, assigned mentee list, individual mentee
academic details, attendance analytics, and at-risk alerts.
Access is SCOPED — a mentor can ONLY view data for their assigned students.
"""

from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course, Enrollment
from backend.models.attendance import AttendanceRecord
from backend.models.mentor import MentorAssignment

mentor_bp = Blueprint('mentor', __name__, url_prefix='/api/mentor')


# ────────────────────────────────────────────────────────────────
# Helper — resolve mentor_id from query params
# ────────────────────────────────────────────────────────────────
def _resolve_mentor_id():
    return request.args.get('mentor_id', 'F001')


def _get_mentee_ids(mentor_id):
    """Returns list of student_ids assigned to this mentor."""
    assignments = MentorAssignment.query.filter_by(mentor_id=mentor_id).all()
    return [a.student_id for a in assignments]


# ════════════════════════════════════════════════════════════════
#  1. MENTOR PROFILE
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/profile', methods=['GET'])
def get_mentor_profile():
    mentor_id = _resolve_mentor_id()
    mentor = User.query.filter_by(user_id=mentor_id, role='faculty').first()

    if not mentor:
        mentor = User.query.filter_by(role='faculty').first()

    mentee_count = MentorAssignment.query.filter_by(mentor_id=mentor.user_id if mentor else 'F001').count()

    name = mentor.name if mentor else 'Dr. Priya Sharma'
    name_parts = name.replace('Dr. ', '').replace('Prof. ', '').split()
    initials = ''.join([p[0] for p in name_parts[:2]]).upper()

    return jsonify({
        'mentor_id': mentor.user_id if mentor else 'F001',
        'name': name,
        'department': mentor.department if mentor else 'Computer Science & Engineering',
        'email': mentor.email if mentor else 'p.sharma@smartattend.edu',
        'initials': initials,
        'total_mentees': mentee_count,
        'profile_picture': mentor.profile_picture if mentor else None,
    }), 200


# ════════════════════════════════════════════════════════════════
#  2. MENTEE LIST — Only assigned students
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/mentees', methods=['GET'])
def get_mentees():
    """Returns list of all students assigned to this mentor with attendance summary."""
    mentor_id = _resolve_mentor_id()
    search = request.args.get('search', '').strip()
    mentee_ids = _get_mentee_ids(mentor_id)

    if not mentee_ids:
        return jsonify({'total': 0, 'mentees': []}), 200

    students_query = User.query.filter(User.user_id.in_(mentee_ids), User.role == 'student')
    if search:
        students_query = students_query.filter(
            (User.name.ilike(f'%{search}%')) |
            (User.enrollment_no.ilike(f'%{search}%'))
        )

    students = students_query.order_by(User.name).all()

    result = []
    for s in students:
        # Overall attendance across all courses
        total_recs = AttendanceRecord.query.filter_by(student_id=s.user_id).count()
        present = AttendanceRecord.query.filter_by(student_id=s.user_id, status='Present').count()
        absent = AttendanceRecord.query.filter_by(student_id=s.user_id, status='Absent').count()
        pct = round((present / total_recs) * 100, 1) if total_recs > 0 else 0.0

        # Count enrolled courses
        enrolled_courses = Enrollment.query.filter_by(student_id=s.user_id).count()

        # Get mentor notes
        assignment = MentorAssignment.query.filter_by(
            mentor_id=mentor_id, student_id=s.user_id
        ).first()

        name_parts = s.name.split()[:2] if s.name else ['?']
        initials = ''.join([n[0] for n in name_parts]).upper()

        result.append({
            'student_id': s.user_id,
            'name': s.name,
            'enrollment_no': s.enrollment_no or s.user_id,
            'email': s.email,
            'program': s.program,
            'semester': s.semester,
            'section': s.section,
            'initials': initials,
            'total_records': total_recs,
            'present': present,
            'absent': absent,
            'attendance_pct': pct,
            'enrolled_courses': enrolled_courses,
            'status': 'Satisfactory' if pct >= 75 else 'At Risk',
            'notes': assignment.notes if assignment else None,
            'profile_picture': s.profile_picture,
        })

    return jsonify({
        'total': len(result),
        'mentees': result,
    }), 200


# ════════════════════════════════════════════════════════════════
#  3. INDIVIDUAL MENTEE DETAIL
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/mentee/<student_id>', methods=['GET'])
def get_mentee_detail(student_id):
    """Returns full academic detail for a specific mentee. Scoped to mentor."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)

    # Enforce scope — mentor can only view their assigned students
    if student_id not in mentee_ids:
        return jsonify({
            'error': 'Access denied. This student is not assigned to you.',
        }), 403

    student = User.query.filter_by(user_id=student_id, role='student').first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    clean_name = student.name or 'Student'
    name_parts = clean_name.split()[:2] if clean_name else ['?']
    initials = ''.join([n[0] for n in name_parts]).upper()
    enrollment = student.enrollment_no or student.user_id.replace('S-', '')

    profile = {
        'student_id': student.user_id,
        'name': clean_name,
        'enrollment_no': enrollment,
        'email': student.email,
        'program': student.program or 'B.Tech CSE',
        'semester': student.semester or 7,
        'section': student.section or 'B',
        'department': student.department,
        'initials': initials,
        'profile_picture': student.profile_picture,
    }

    # Get assignment info
    assignment = MentorAssignment.query.filter_by(
        mentor_id=mentor_id, student_id=student_id
    ).first()

    return jsonify({
        'profile': profile,
        'assignment': assignment.to_dict() if assignment else None,
    }), 200


# ════════════════════════════════════════════════════════════════
#  4. MENTEE ATTENDANCE — Subject-wise breakdown
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/mentee/<student_id>/attendance', methods=['GET'])
def get_mentee_attendance(student_id):
    """Returns subject-wise attendance for a mentee. Scoped to mentor."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)

    if student_id not in mentee_ids:
        return jsonify({'error': 'Access denied.'}), 403

    courses = Course.query.all()
    subjects = []
    total_all = 0
    present_all = 0

    for c in courses:
        # Check if student is enrolled
        enrolled = Enrollment.query.filter_by(student_id=student_id, course_id=c.course_id).first()
        if not enrolled:
            continue

        recs = AttendanceRecord.query.filter_by(student_id=student_id, course_id=c.course_id).all()
        total = len(recs) or c.total_classes or 30
        present = len([r for r in recs if r.status == 'Present'])
        absent = len([r for r in recs if r.status == 'Absent'])
        flagged = len([r for r in recs if r.status == 'Flagged'])
        pct = round((present / total) * 100, 1) if total > 0 else 0.0

        total_all += total
        present_all += present

        subjects.append({
            'course_id': c.course_id,
            'code': c.course_code,
            'name': c.course_name,
            'faculty': c.faculty_name,
            'total': total,
            'present': present,
            'absent': absent,
            'flagged': flagged,
            'pct': pct,
            'status': 'Satisfactory' if pct >= 75 else 'Needs Attention',
        })

    overall_pct = round((present_all / total_all) * 100, 1) if total_all > 0 else 0.0

    return jsonify({
        'student_id': student_id,
        'overall_pct': overall_pct,
        'total_classes': total_all,
        'total_present': present_all,
        'subjects': subjects,
    }), 200


# ════════════════════════════════════════════════════════════════
#  5. MENTEE HISTORY — Attendance history
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/mentee/<student_id>/history', methods=['GET'])
def get_mentee_history(student_id):
    """Returns recent attendance history for a mentee. Scoped to mentor."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)

    if student_id not in mentee_ids:
        return jsonify({'error': 'Access denied.'}), 403

    limit = int(request.args.get('limit', 30))
    records = AttendanceRecord.query.filter_by(student_id=student_id)\
                                     .order_by(AttendanceRecord.timestamp.desc())\
                                     .limit(limit).all()

    history = []
    for r in records:
        course = Course.query.filter_by(course_id=r.course_id).first()
        history.append({
            'date': r.timestamp.strftime('%Y-%m-%d') if r.timestamp else '—',
            'subject': course.course_name if course else 'Unknown',
            'code': course.course_code if course else '—',
            'status': r.status,
            'time': r.timestamp.strftime('%I:%M %p') if r.timestamp else '—',
            'confidence': r.confidence_score,
            'verification': r.verification_type or '—',
        })

    return jsonify(history), 200


# ════════════════════════════════════════════════════════════════
#  6. AGGREGATE ANALYTICS
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/analytics', methods=['GET'])
def get_mentor_analytics():
    """Returns aggregate analytics across all mentees."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)

    if not mentee_ids:
        return jsonify({
            'total_mentees': 0,
            'avg_attendance': 0,
            'at_risk_count': 0,
            'satisfactory_count': 0,
            'mentee_rates': [],
        }), 200

    mentee_rates = []
    at_risk = 0
    satisfactory = 0

    for sid in mentee_ids:
        student = User.query.filter_by(user_id=sid).first()
        total = AttendanceRecord.query.filter_by(student_id=sid).count()
        present = AttendanceRecord.query.filter_by(student_id=sid, status='Present').count()
        pct = round((present / total) * 100, 1) if total > 0 else 0.0

        if pct < 75:
            at_risk += 1
        else:
            satisfactory += 1

        mentee_rates.append({
            'student_id': sid,
            'name': student.name if student else 'Unknown',
            'pct': pct,
            'status': 'At Risk' if pct < 75 else 'Satisfactory',
        })

    mentee_rates.sort(key=lambda x: x['pct'])
    avg = round(sum(m['pct'] for m in mentee_rates) / len(mentee_rates), 1) if mentee_rates else 0

    return jsonify({
        'total_mentees': len(mentee_ids),
        'avg_attendance': avg,
        'at_risk_count': at_risk,
        'satisfactory_count': satisfactory,
        'mentee_rates': mentee_rates,
    }), 200


# ════════════════════════════════════════════════════════════════
#  7. AT-RISK ALERTS
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/alerts', methods=['GET'])
def get_mentor_alerts():
    """Returns mentees below 75% attendance threshold."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)
    threshold = float(request.args.get('threshold', 75.0))

    alerts = []
    for sid in mentee_ids:
        student = User.query.filter_by(user_id=sid).first()
        if not student:
            continue

        total = AttendanceRecord.query.filter_by(student_id=sid).count()
        present = AttendanceRecord.query.filter_by(student_id=sid, status='Present').count()
        pct = round((present / total) * 100, 1) if total > 0 else 0.0

        if pct < threshold:
            # Find the worst subject
            courses = Course.query.all()
            worst_subj = '—'
            worst_pct = 100.0
            for c in courses:
                enrolled = Enrollment.query.filter_by(student_id=sid, course_id=c.course_id).first()
                if not enrolled:
                    continue
                cr = AttendanceRecord.query.filter_by(student_id=sid, course_id=c.course_id).count()
                cp = AttendanceRecord.query.filter_by(student_id=sid, course_id=c.course_id, status='Present').count()
                cpct = round((cp / cr) * 100, 1) if cr > 0 else 0.0
                if cpct < worst_pct:
                    worst_pct = cpct
                    worst_subj = c.course_name

            alerts.append({
                'student_id': student.user_id,
                'name': student.name,
                'enrollment_no': student.enrollment_no or student.user_id,
                'email': student.email,
                'overall_pct': pct,
                'deficit': round(threshold - pct, 1),
                'worst_subject': worst_subj,
                'worst_subject_pct': worst_pct,
                'severity': 'Critical' if pct < 60 else 'Warning',
            })

    alerts.sort(key=lambda a: a['overall_pct'])

    return jsonify({
        'threshold': threshold,
        'total_alerts': len(alerts),
        'alerts': alerts,
    }), 200


# ════════════════════════════════════════════════════════════════
#  8. MENTOR NOTES — Update notes for a mentee
# ════════════════════════════════════════════════════════════════
@mentor_bp.route('/mentee/<student_id>/notes', methods=['POST'])
def update_mentee_notes(student_id):
    """Update mentor's private notes for a mentee."""
    mentor_id = _resolve_mentor_id()
    mentee_ids = _get_mentee_ids(mentor_id)

    if student_id not in mentee_ids:
        return jsonify({'error': 'Access denied.'}), 403

    data = request.get_json() or {}
    notes = data.get('notes', '')

    assignment = MentorAssignment.query.filter_by(
        mentor_id=mentor_id, student_id=student_id
    ).first()

    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    assignment.notes = notes
    db.session.commit()

    return jsonify({
        'message': 'Notes updated successfully',
        'notes': notes,
    }), 200

"""
faculty.py — Faculty Dashboard REST API Handlers (SmartAttend Module 2)
Provides endpoints for faculty profile, timetable, subjects, student management,
defaulter detection, appeals review, analytics, and report export.
"""

import csv
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course, Enrollment
from backend.models.attendance import AttendanceRecord
from backend.models.appeal import Appeal
from backend.models.timetable import Timetable

faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')


# ────────────────────────────────────────────────────────────────
# Helper — resolve faculty_id from query params
# ────────────────────────────────────────────────────────────────
def _resolve_faculty_id():
    fid = request.args.get('faculty_id', 'F001')
    return fid


# ════════════════════════════════════════════════════════════════
#  1. PROFILE
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/profile', methods=['GET'])
def get_faculty_profile():
    faculty_id = _resolve_faculty_id()
    faculty = User.query.filter_by(user_id=faculty_id, role='faculty').first()

    if not faculty:
        faculty = User.query.filter_by(role='faculty').first()

    # Compute number of courses & students
    courses = Course.query.filter_by(faculty_id=faculty.user_id if faculty else 'F001').all()
    course_ids = [c.course_id for c in courses]
    student_count = 0
    if course_ids:
        student_count = db.session.query(func.count(func.distinct(Enrollment.student_id)))\
            .filter(Enrollment.course_id.in_(course_ids)).scalar() or 0

    name = faculty.name if faculty else 'Dr. Priya Sharma'
    name_parts = name.replace('Dr. ', '').replace('Prof. ', '').split()
    initials = ''.join([p[0] for p in name_parts[:2]]).upper()

    return jsonify({
        'faculty_id': faculty.user_id if faculty else 'F001',
        'name': name,
        'department': faculty.department if faculty else 'Computer Science & Engineering',
        'email': faculty.email if faculty else 'p.sharma@karnavati.edu',
        'initials': initials,
        'total_courses': len(courses),
        'total_students': student_count,
        'profile_picture': faculty.profile_picture if faculty else None,
    }), 200


# ════════════════════════════════════════════════════════════════
#  2. MY CLASSES / COURSES
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/classes', methods=['GET'])
def get_faculty_classes():
    faculty_id = _resolve_faculty_id()
    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    results = []
    for c in courses:
        enrolled = Enrollment.query.filter_by(course_id=c.course_id).count()
        # Compute attendance rate for this course
        total_recs = AttendanceRecord.query.filter_by(course_id=c.course_id).count()
        present_recs = AttendanceRecord.query.filter_by(course_id=c.course_id, status='Present').count()
        rate = round((present_recs / total_recs) * 100, 1) if total_recs > 0 else 0.0

        d = c.to_dict()
        d['enrolled_students'] = enrolled
        d['attendance_rate'] = rate
        results.append(d)

    return jsonify(results), 200


# ════════════════════════════════════════════════════════════════
#  3. TIMETABLE
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/timetable', methods=['GET'])
def get_faculty_timetable():
    """Returns the weekly timetable for a faculty member."""
    faculty_id = _resolve_faculty_id()
    slots = Timetable.query.filter_by(faculty_id=faculty_id)\
                           .order_by(Timetable.day_of_week, Timetable.start_time).all()

    # Enrich with course names
    result = []
    for s in slots:
        course = Course.query.filter_by(course_id=s.course_id).first()
        d = s.to_dict()
        d['course_name'] = course.course_name if course else 'Unknown'
        d['course_code'] = course.course_code if course else '—'
        result.append(d)

    # Group by day of week
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    grouped = {}
    for day in days_order:
        grouped[day] = [s for s in result if s['day'] == day]

    return jsonify({
        'faculty_id': faculty_id,
        'slots': result,
        'by_day': grouped,
        'total_classes_per_week': len(result),
    }), 200


# ════════════════════════════════════════════════════════════════
#  4. SUBJECTS — Per-class analytics
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/subjects', methods=['GET'])
def get_faculty_subjects():
    """Returns all subjects taught by faculty with per-subject analytics."""
    faculty_id = _resolve_faculty_id()
    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    subjects = []
    for c in courses:
        enrolled = Enrollment.query.filter_by(course_id=c.course_id).count()
        total_recs = AttendanceRecord.query.filter_by(course_id=c.course_id).count()
        present_recs = AttendanceRecord.query.filter_by(course_id=c.course_id, status='Present').count()
        absent_recs = AttendanceRecord.query.filter_by(course_id=c.course_id, status='Absent').count()
        flagged_recs = AttendanceRecord.query.filter_by(course_id=c.course_id, status='Flagged').count()
        rate = round((present_recs / total_recs) * 100, 1) if total_recs > 0 else 0.0

        # Count classes per week from timetable
        weekly_slots = Timetable.query.filter_by(faculty_id=faculty_id, course_id=c.course_id).count()

        subjects.append({
            'course_id': c.course_id,
            'code': c.course_code,
            'name': c.course_name,
            'program': c.program,
            'semester': c.semester,
            'section': c.section,
            'total_classes': c.total_classes,
            'enrolled_students': enrolled,
            'total_records': total_recs,
            'present': present_recs,
            'absent': absent_recs,
            'flagged': flagged_recs,
            'attendance_rate': rate,
            'classes_per_week': weekly_slots,
            'status': 'Good' if rate >= 80 else ('Warning' if rate >= 70 else 'Critical'),
        })

    return jsonify(subjects), 200


# ════════════════════════════════════════════════════════════════
#  5. CLASS-WEEKS — Classes per week breakdown
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/class-weeks', methods=['GET'])
def get_class_weeks():
    """Returns classes-per-week breakdown for the faculty."""
    faculty_id = _resolve_faculty_id()
    slots = Timetable.query.filter_by(faculty_id=faculty_id).all()

    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    breakdown = {}
    for day in days_order:
        day_slots = [s for s in slots if s.day_of_week == day]
        breakdown[day] = {
            'count': len(day_slots),
            'slots': [s.to_dict() for s in day_slots],
        }

    total = sum(d['count'] for d in breakdown.values())

    return jsonify({
        'faculty_id': faculty_id,
        'total_per_week': total,
        'breakdown': breakdown,
    }), 200


# ════════════════════════════════════════════════════════════════
#  6. STUDENT LIST — All students across faculty's courses
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/students', methods=['GET'])
def get_faculty_students():
    """Returns all students enrolled in the faculty's courses with attendance stats."""
    faculty_id = _resolve_faculty_id()
    search = request.args.get('search', '').strip()
    course_filter = request.args.get('course_id', '')

    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    course_ids = [c.course_id for c in courses]
    if course_filter and course_filter in course_ids:
        course_ids = [course_filter]

    # Get unique student IDs enrolled in these courses
    enrollments = Enrollment.query.filter(Enrollment.course_id.in_(course_ids)).all()
    student_ids = list(set(e.student_id for e in enrollments))

    students_query = User.query.filter(User.user_id.in_(student_ids), User.role == 'student')
    if search:
        students_query = students_query.filter(
            (User.name.ilike(f'%{search}%')) |
            (User.enrollment_no.ilike(f'%{search}%')) |
            (User.user_id.ilike(f'%{search}%'))
        )

    students = students_query.order_by(User.name).all()

    result = []
    for s in students:
        total_recs = AttendanceRecord.query.filter(
            AttendanceRecord.student_id == s.user_id,
            AttendanceRecord.course_id.in_(course_ids)
        ).count()
        present = AttendanceRecord.query.filter(
            AttendanceRecord.student_id == s.user_id,
            AttendanceRecord.course_id.in_(course_ids),
            AttendanceRecord.status == 'Present'
        ).count()
        pct = round((present / total_recs) * 100, 1) if total_recs > 0 else 0.0

        result.append({
            'student_id': s.user_id,
            'name': s.name,
            'enrollment_no': s.enrollment_no or s.user_id,
            'email': s.email,
            'program': s.program,
            'semester': s.semester,
            'section': s.section,
            'total_records': total_recs,
            'present': present,
            'attendance_pct': pct,
            'status': 'Satisfactory' if pct >= 75 else 'At Risk',
            'profile_picture': s.profile_picture,
        })

    return jsonify({
        'total': len(result),
        'students': result,
    }), 200


# ════════════════════════════════════════════════════════════════
#  7. INDIVIDUAL STUDENT DETAIL
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/student/<student_id>', methods=['GET'])
def get_student_detail(student_id):
    """Returns detailed attendance data for a specific student."""
    student = User.query.filter_by(user_id=student_id, role='student').first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    courses = Course.query.all()
    subjects = []
    for c in courses:
        recs = AttendanceRecord.query.filter_by(student_id=student_id, course_id=c.course_id).all()
        total = len(recs) or c.total_classes or 30
        present = len([r for r in recs if r.status == 'Present'])
        pct = round((present / total) * 100, 1) if total > 0 else 0.0

        subjects.append({
            'course_id': c.course_id,
            'code': c.course_code,
            'name': c.course_name,
            'faculty': c.faculty_name,
            'total': total,
            'present': present,
            'absent': total - present,
            'pct': pct,
            'status': 'Satisfactory' if pct >= 75 else 'Needs Attention',
        })

    return jsonify({
        'student': student.to_dict(),
        'subjects': subjects,
    }), 200


# ════════════════════════════════════════════════════════════════
#  8. DEFAULTERS — Students below 75%
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/defaulters', methods=['GET'])
def get_defaulters():
    """Returns students below 75% attendance in faculty's courses."""
    faculty_id = _resolve_faculty_id()
    threshold = float(request.args.get('threshold', 75.0))

    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    defaulters = []
    seen = set()

    for c in courses:
        enrollments = Enrollment.query.filter_by(course_id=c.course_id).all()
        for e in enrollments:
            if e.student_id in seen:
                continue

            recs = AttendanceRecord.query.filter_by(
                student_id=e.student_id, course_id=c.course_id
            ).all()
            total = len(recs) or c.total_classes or 30
            present = len([r for r in recs if r.status == 'Present'])
            pct = round((present / total) * 100, 1) if total > 0 else 0.0

            if pct < threshold:
                student = User.query.filter_by(user_id=e.student_id).first()
                if student:
                    seen.add(e.student_id)
                    defaulters.append({
                        'student_id': student.user_id,
                        'name': student.name,
                        'enrollment_no': student.enrollment_no or student.user_id,
                        'course': c.course_name,
                        'course_code': c.course_code,
                        'total': total,
                        'present': present,
                        'pct': pct,
                        'deficit': round(threshold - pct, 1),
                    })

    defaulters.sort(key=lambda d: d['pct'])

    return jsonify({
        'threshold': threshold,
        'count': len(defaulters),
        'defaulters': defaulters,
    }), 200


# ════════════════════════════════════════════════════════════════
#  9. APPEALS MANAGEMENT
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/appeals', methods=['GET'])
def get_faculty_appeals():
    """Returns appeals for courses taught by this faculty."""
    faculty_id = _resolve_faculty_id()
    status_filter = request.args.get('status', '')

    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    course_ids = [c.course_id for c in courses]

    query = Appeal.query.filter(Appeal.course_id.in_(course_ids))
    if status_filter:
        query = query.filter_by(status=status_filter)

    appeals = query.order_by(Appeal.created_at.desc()).all()

    result = []
    for a in appeals:
        student = User.query.filter_by(user_id=a.student_id).first()
        course = Course.query.filter_by(course_id=a.course_id).first()
        result.append({
            **a.to_dict(),
            'student_name': student.name if student else 'Unknown',
            'student_enrollment': student.enrollment_no if student else '—',
            'course_name': course.course_name if course else 'Unknown',
            'course_code': course.course_code if course else '—',
        })

    return jsonify({
        'total': len(result),
        'appeals': result,
    }), 200


@faculty_bp.route('/appeals/<appeal_id>/review', methods=['POST'])
def review_appeal(appeal_id):
    """Approve or reject a student appeal."""
    faculty_id = _resolve_faculty_id()
    data = request.get_json() or {}
    action = data.get('action', 'Approved')  # 'Approved' or 'Rejected'
    remarks = data.get('remarks', '')

    appeal = Appeal.query.filter_by(appeal_id=appeal_id).first()
    if not appeal:
        return jsonify({'error': 'Appeal not found'}), 404

    appeal.status = action
    appeal.reviewed_by = faculty_id
    appeal.reviewed_at = datetime.utcnow()

    # If approved, update the attendance record to Present
    if action == 'Approved':
        record = AttendanceRecord.query.filter_by(record_id=appeal.record_id).first()
        if record:
            record.status = 'Present'
            record.verification_type = 'Manual'

    db.session.commit()

    return jsonify({
        'message': f'Appeal {action.lower()} successfully',
        'appeal': appeal.to_dict(),
    }), 200


# ════════════════════════════════════════════════════════════════
# 10. ENHANCED ANALYTICS
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """Returns computed analytics for faculty's courses."""
    faculty_id = _resolve_faculty_id()
    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    course_ids = [c.course_id for c in courses]

    total_enrolled = db.session.query(func.count(func.distinct(Enrollment.student_id)))\
        .filter(Enrollment.course_id.in_(course_ids)).scalar() or 0

    total_recs = AttendanceRecord.query.filter(AttendanceRecord.course_id.in_(course_ids)).count()
    present_recs = AttendanceRecord.query.filter(
        AttendanceRecord.course_id.in_(course_ids),
        AttendanceRecord.status == 'Present'
    ).count()
    avg_rate = round((present_recs / total_recs) * 100, 1) if total_recs > 0 else 0.0

    # Per-course rates for best/worst
    course_rates = []
    for c in courses:
        cr = AttendanceRecord.query.filter_by(course_id=c.course_id).count()
        cp = AttendanceRecord.query.filter_by(course_id=c.course_id, status='Present').count()
        r = round((cp / cr) * 100, 1) if cr > 0 else 0.0
        course_rates.append({'name': c.course_name, 'rate': r, 'code': c.course_code})

    course_rates.sort(key=lambda x: x['rate'], reverse=True)
    top = course_rates[0] if course_rates else {'name': '—', 'rate': 0}
    bottom = course_rates[-1] if course_rates else {'name': '—', 'rate': 0}

    # Count defaulters (below 75%)
    defaulters = 0
    enrolled_ids = db.session.query(func.distinct(Enrollment.student_id))\
        .filter(Enrollment.course_id.in_(course_ids)).all()
    for (sid,) in enrolled_ids:
        sr = AttendanceRecord.query.filter(
            AttendanceRecord.student_id == sid,
            AttendanceRecord.course_id.in_(course_ids)
        ).count()
        sp = AttendanceRecord.query.filter(
            AttendanceRecord.student_id == sid,
            AttendanceRecord.course_id.in_(course_ids),
            AttendanceRecord.status == 'Present'
        ).count()
        pct = round((sp / sr) * 100, 1) if sr > 0 else 0.0
        if pct < 75.0:
            defaulters += 1

    # Weekly trend (last 8 weeks)
    weekly_data = []
    now = datetime.utcnow()
    for w in range(7, -1, -1):
        from datetime import timedelta
        week_start = now - timedelta(weeks=w + 1)
        week_end = now - timedelta(weeks=w)
        wr = AttendanceRecord.query.filter(
            AttendanceRecord.course_id.in_(course_ids),
            AttendanceRecord.timestamp >= week_start,
            AttendanceRecord.timestamp < week_end
        ).count()
        wp = AttendanceRecord.query.filter(
            AttendanceRecord.course_id.in_(course_ids),
            AttendanceRecord.status == 'Present',
            AttendanceRecord.timestamp >= week_start,
            AttendanceRecord.timestamp < week_end
        ).count()
        weekly_data.append(round((wp / wr) * 100, 1) if wr > 0 else 0)

    return jsonify({
        'total_enrolled': total_enrolled,
        'total_courses': len(courses),
        'avg_attendance_rate': avg_rate,
        'defaulters_count': defaulters,
        'top_performing_subject': top['name'],
        'top_performing_rate': top['rate'],
        'at_risk_subject': bottom['name'],
        'at_risk_rate': bottom['rate'],
        'course_rates': course_rates,
        'weekly_trend': {
            'labels': ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'],
            'data': weekly_data,
        },
    }), 200


# ════════════════════════════════════════════════════════════════
# 11. REPORTS — CSV EXPORT
# ════════════════════════════════════════════════════════════════
@faculty_bp.route('/reports/export', methods=['GET'])
def export_report():
    """Exports attendance report as CSV for a specific course or all courses."""
    faculty_id = _resolve_faculty_id()
    course_filter = request.args.get('course_id', '')

    courses = Course.query.filter_by(faculty_id=faculty_id).all()
    if not courses:
        courses = Course.query.all()

    if course_filter:
        courses = [c for c in courses if c.course_id == course_filter]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student ID', 'Name', 'Enrollment No', 'Course', 'Course Code',
                      'Total Records', 'Present', 'Absent', 'Flagged', 'Attendance %'])

    for c in courses:
        enrollments = Enrollment.query.filter_by(course_id=c.course_id).all()
        for e in enrollments:
            student = User.query.filter_by(user_id=e.student_id).first()
            if not student:
                continue
            recs = AttendanceRecord.query.filter_by(student_id=e.student_id, course_id=c.course_id).all()
            total = len(recs)
            present = len([r for r in recs if r.status == 'Present'])
            absent = len([r for r in recs if r.status == 'Absent'])
            flagged = len([r for r in recs if r.status == 'Flagged'])
            pct = round((present / total) * 100, 1) if total > 0 else 0.0

            writer.writerow([
                student.user_id, student.name, student.enrollment_no or '—',
                c.course_name, c.course_code, total, present, absent, flagged, pct
            ])

    csv_data = output.getvalue()
    output.close()

    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=attendance_report.csv'}
    )

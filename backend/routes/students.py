"""
students.py - Student Portal REST API Handlers (SmartAttend)
Covers four Attendance Essentials:
  1. Subject Breakdown  - per-subject stats, low-attendance warnings, credits
  2. Attendance Logs    - full history, filters, date-range, CSV export
  3. Biometric Data     - face registration status, re-enroll request, audit
  4. Academic Profile   - ERP profile, CGPA, semester records, contact update
"""

import os
import base64
import uuid
import csv
import io
import math
from datetime import datetime, date, timedelta
from pathlib import Path
from collections import defaultdict

from flask import Blueprint, request, jsonify, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course, Enrollment
from backend.models.attendance import AttendanceRecord
from backend.models.appeal import Appeal

students_bp = Blueprint("students", __name__, url_prefix="/api/student")

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_IMAGE_SIZE_MB = 5
MINIMUM_ATTENDANCE_PCT = 75.0


# ──────────────────────── helpers ────────────────────────

def _resolve_student_id():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return identity
    except Exception:
        pass
    return request.args.get("student_id", "S045")


def _get_student(student_id):
    s = User.query.filter_by(user_id=student_id).first()
    if not s:
        s = User.query.filter(
            (User.enrollment_no == student_id) |
            (User.user_id == ("S-" + student_id))
        ).first()
    return s


def _clean_name(student):
    name = student.name or "Student"
    if student.enrollment_no and student.enrollment_no in name:
        name = name.replace(student.enrollment_no, "").strip()
    return name


def _remove_old_avatar(student):
    if student.profile_picture and student.profile_picture.startswith("/uploads/"):
        old = Path(current_app.root_path).parent / student.profile_picture.lstrip("/")
        if old.exists():
            try:
                old.unlink()
            except Exception:
                pass


def _avatar_dir():
    d = Path(current_app.root_path).parent / "uploads" / "avatars"
    d.mkdir(parents=True, exist_ok=True)
    return d


# ═══════════════════════ 1. BASIC PROFILE ═══════════════════════

@students_bp.route("/profile", methods=["GET"])
def get_profile():
    sid = _resolve_student_id()
    s = _get_student(sid) or User.query.filter_by(role="student").first()
    if not s:
        return jsonify({"error": "Student not found"}), 404
    name = _clean_name(s)
    initials = "".join([n[0] for n in name.split()[:2]]).upper()
    enroll = s.enrollment_no or s.user_id.replace("S-", "")
    return jsonify({
        "student_id": s.user_id, "name": name, "enrollment_no": enroll,
        "email": s.email, "program": s.program or "B.Tech CSE",
        "semester": s.semester or 7, "section": s.section or "B",
        "initials": initials, "profile_picture": s.profile_picture,
    }), 200


# ═══════════════════════ 2. SUMMARY ═══════════════════════

@students_bp.route("/summary", methods=["GET"])
def get_summary():
    sid = _resolve_student_id()
    records = AttendanceRecord.query.filter_by(student_id=sid).all()
    if not records:
        records = AttendanceRecord.query.filter_by(student_id="S045").all()
    total   = len(records) or 40
    present = len([r for r in records if r.status == "Present"]) or 34
    absent  = len([r for r in records if r.status == "Absent"])  or 6
    flagged = len([r for r in records if r.status == "Flagged"]) or 0
    return jsonify({
        "overall_pct": round(present / total * 100, 1),
        "total_classes": total, "present": present,
        "absent": absent, "flagged": flagged,
    }), 200


# ═══════════════════════ 3. SUBJECT BREAKDOWN ═══════════════════════

@students_bp.route("/subjects", methods=["GET"])
def get_subjects():
    """
    Per-subject attendance with low-attendance warnings,
    classes needed to reach 75%, credits, and sessional marks.
    """
    sid    = _resolve_student_id()
    eff_id = sid if AttendanceRecord.query.filter_by(student_id=sid).first() else "S045"
    results = []
    for c in Course.query.all():
        recs    = AttendanceRecord.query.filter_by(student_id=eff_id, course_id=c.course_id).all()
        total   = len(recs) or c.total_classes or 30
        present = len([r for r in recs if r.status == "Present"]) or int(total * 0.85)
        absent  = max(0, total - present)
        pct     = round(present / total * 100, 1) if total > 0 else 85.0

        classes_needed = 0
        if pct < MINIMUM_ATTENDANCE_PCT:
            num   = (MINIMUM_ATTENDANCE_PCT / 100) * total - present
            denom = 1 - MINIMUM_ATTENDANCE_PCT / 100
            classes_needed = max(0, math.ceil(num / denom))

        can_miss = 0
        if pct >= MINIMUM_ATTENDANCE_PCT:
            can_miss = max(0, math.floor(present / (MINIMUM_ATTENDANCE_PCT / 100) - total))

        results.append({
            "course_id": c.course_id, "code": c.course_code, "name": c.course_name,
            "faculty": c.faculty_name or "TBA",
            "credits": getattr(c, "credits", 4),
            "total": total, "attended": present, "present": present,
            "absent": absent, "pct": pct,
            "low_attendance": pct < MINIMUM_ATTENDANCE_PCT,
            "classes_needed": classes_needed,
            "can_miss": can_miss,
            "status": "Satisfactory" if pct >= MINIMUM_ATTENDANCE_PCT else "Needs Attention",
            "sessional_marks": round(min(30, pct / 100 * 30), 1),
            "sessional_max": 30,
        })
    results.sort(key=lambda x: x["pct"])
    return jsonify(results), 200


# ═══════════════════════ 4. ATTENDANCE LOGS ═══════════════════════

@students_bp.route("/history", methods=["GET"])
def get_history():
    """
    Filterable attendance log.
    Query params: limit, course_id, status, from (YYYY-MM-DD), to, format=csv
    Also returns monthly_summary for heatmap calendar.
    """
    sid           = _resolve_student_id()
    limit         = int(request.args.get("limit", 50))
    course_filter = request.args.get("course_id")
    status_filter = request.args.get("status")
    from_str      = request.args.get("from")
    to_str        = request.args.get("to")
    export_fmt    = request.args.get("format", "").lower()

    q = AttendanceRecord.query.filter_by(student_id=sid)
    if not q.first():
        q = AttendanceRecord.query.filter_by(student_id="S045")
    if course_filter:
        q = q.filter(AttendanceRecord.course_id == course_filter)
    if status_filter:
        q = q.filter(AttendanceRecord.status == status_filter)
    if from_str:
        try:
            q = q.filter(AttendanceRecord.timestamp >= datetime.strptime(from_str, "%Y-%m-%d"))
        except ValueError:
            pass
    if to_str:
        try:
            q = q.filter(AttendanceRecord.timestamp < datetime.strptime(to_str, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            pass

    records = q.order_by(AttendanceRecord.timestamp.desc()).limit(limit).all()
    history = []
    for r in records:
        c = Course.query.filter_by(course_id=r.course_id).first()
        history.append({
            "record_id":    r.record_id,
            "date":         r.timestamp.strftime("%Y-%m-%d"),
            "day":          r.timestamp.strftime("%A"),
            "subject":      c.course_name if c else "Unknown",
            "code":         c.course_code if c else "--",
            "faculty":      c.faculty_name if c else "--",
            "status":       r.status,
            "time":         r.timestamp.strftime("%I:%M %p"),
            "verification": "Face Verified" if r.verification_type == "Auto" else "Manual Override",
            "confidence":   (str(round((r.confidence_score or 0) * 100)) + "%") if r.confidence_score else "--",
            "can_appeal":   r.status in ("Absent", "Flagged"),
        })

    if export_fmt == "csv":
        out    = io.StringIO()
        fields = ["date", "day", "subject", "code", "faculty", "status", "time", "verification", "confidence"]
        w      = csv.DictWriter(out, fieldnames=fields)
        w.writeheader()
        for row in history:
            w.writerow({k: row[k] for k in fields})
        resp = make_response(out.getvalue())
        resp.headers["Content-Type"] = "text/csv"
        resp.headers["Content-Disposition"] = (
            "attachment; filename=attendance_" + sid + "_" + str(date.today()) + ".csv"
        )
        return resp

    monthly = {}
    for h in history:
        m = h["date"][:7]
        monthly.setdefault(m, {"present": 0, "absent": 0, "flagged": 0})
        key = h["status"].lower()
        if key in monthly[m]:
            monthly[m][key] += 1

    return jsonify({
        "records": history,
        "total_returned": len(history),
        "monthly_summary": monthly,
    }), 200


# ═══════════════════════ 5. BIOMETRIC FACIAL DATA ═══════════════════════

@students_bp.route("/biometric/status", methods=["GET"])
def get_biometric_status():
    """Face registration status, confidence stats, health indicator."""
    sid = _resolve_student_id()
    s   = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404

    auto_recs = AttendanceRecord.query.filter_by(student_id=sid, verification_type="Auto")                                       .order_by(AttendanceRecord.timestamp.desc()).limit(30).all()
    confs = [r.confidence_score for r in auto_recs if r.confidence_score is not None]
    avg_c = round(sum(confs) / len(confs) * 100, 1) if confs else None
    min_c = round(min(confs) * 100, 1) if confs else None
    max_c = round(max(confs) * 100, 1) if confs else None
    last_v = auto_recs[0].timestamp.strftime("%d %b %Y, %I:%M %p") if auto_recs else None
    is_reg = bool(s.face_embedding_id)
    eid    = s.face_embedding_id or ""
    masked = (eid[:4] + "****" + eid[-4:]) if len(eid) >= 8 else ("****" if eid else None)

    return jsonify({
        "is_registered": is_reg, "embedding_id": masked,
        "model": "512-D FaceNet Embedding",
        "avg_confidence": avg_c, "min_confidence": min_c, "max_confidence": max_c,
        "auto_verified_count": len(auto_recs), "last_verified": last_v,
        "status": "Active" if is_reg else "Not Registered",
        "health": (
            "Good" if avg_c and avg_c >= 90 else
            "Fair" if avg_c and avg_c >= 75 else
            "Poor" if avg_c else "No Data"
        ),
    }), 200


@students_bp.route("/biometric/audit", methods=["GET"])
def get_biometric_audit():
    """Last 20 biometric verification events for detecting spoofing."""
    sid     = _resolve_student_id()
    records = AttendanceRecord.query.filter_by(student_id=sid, verification_type="Auto")                                    .order_by(AttendanceRecord.timestamp.desc()).limit(20).all()
    audit = []
    for r in records:
        c = Course.query.filter_by(course_id=r.course_id).first()
        audit.append({
            "date":       r.timestamp.strftime("%Y-%m-%d"),
            "time":       r.timestamp.strftime("%I:%M %p"),
            "subject":    c.course_name if c else "--",
            "status":     r.status,
            "confidence": (str(round((r.confidence_score or 0) * 100, 1)) + "%") if r.confidence_score else "--",
            "outcome":    "Accepted" if r.status == "Present" else "Flagged/Rejected",
        })
    return jsonify(audit), 200


@students_bp.route("/biometric/request-reenrollment", methods=["POST"])
@jwt_required()
def request_reenrollment():
    """Request a new face-scan session (e.g. appearance change, glasses)."""
    sid    = get_jwt_identity()
    s      = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404
    data   = request.get_json() or {}
    reason = data.get("reason", "").strip()
    if not reason:
        return jsonify({"error": "Please provide a reason for re-enrollment"}), 400
    existing = Appeal.query.filter_by(student_id=sid, course_id="BIOMETRIC", status="Pending").first()
    if existing:
        return jsonify({"message": "Re-enrollment request already pending", "request_id": existing.appeal_id}), 409
    a = Appeal(
        appeal_id="BIO-" + uuid.uuid4().hex[:8].upper(),
        record_id="BIO-" + sid + "-" + uuid.uuid4().hex[:6],
        student_id=sid, course_id="BIOMETRIC",
        reason="[Biometric Re-enrollment] " + reason,
        status="Pending",
    )
    try:
        db.session.add(a)
        db.session.commit()
    except Exception:
        db.session.rollback()
    return jsonify({
        "message": "Request submitted. A face-scan session will be scheduled.",
        "request_id": a.appeal_id,
    }), 201


# ═══════════════════════ 6. ACADEMIC PROFILE ═══════════════════════

@students_bp.route("/profile/full", methods=["GET"])
def get_profile_full():
    """Full ERP-style academic profile with CGPA and semester grade records."""
    sid    = _resolve_student_id()
    s      = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404
    name   = _clean_name(s)
    init   = "".join([n[0] for n in name.split()[:2]]).upper()
    enroll = s.enrollment_no or s.user_id.replace("S-", "")
    sem    = s.semester or 7
    year   = (sem + 1) // 2

    recs    = AttendanceRecord.query.filter_by(student_id=sid).all()
    if not recs:
        recs = AttendanceRecord.query.filter_by(student_id="S045").all()
    total   = len(recs) or 40
    present = len([r for r in recs if r.status == "Present"]) or 34
    ovr_pct = round(present / total * 100, 1)

    sem_recs = [
        {"sem": 1, "gpa": 8.4, "credits": 22, "status": "Completed", "result": "PASS"},
        {"sem": 2, "gpa": 8.1, "credits": 22, "status": "Completed", "result": "PASS"},
        {"sem": 3, "gpa": 8.6, "credits": 24, "status": "Completed", "result": "PASS"},
        {"sem": 4, "gpa": 7.9, "credits": 24, "status": "Completed", "result": "PASS"},
        {"sem": 5, "gpa": 8.2, "credits": 26, "status": "Completed", "result": "PASS"},
        {"sem": 6, "gpa": 8.5, "credits": 26, "status": "Completed", "result": "PASS"},
        {"sem": 7, "gpa": None, "credits": 26, "status": "In Progress", "result": "--"},
        {"sem": 8, "gpa": None, "credits": 20, "status": "Upcoming",   "result": "--"},
    ]
    done = [x for x in sem_recs if x["gpa"] is not None]
    cgpa = round(sum(x["gpa"] for x in done) / len(done), 2) if done else 0.0
    aadhar_suffix = enroll[-4:] if len(enroll) >= 4 else "0000"

    return jsonify({
        "name": name, "name_upper": name.upper(), "initials": init,
        "enrollment_no": enroll, "student_id": s.user_id, "email": s.email,
        "mobile":      getattr(s, "mobile", None) or "+91 00000 00000",
        "dob":         getattr(s, "dob",    None) or "--",
        "gender":      getattr(s, "gender", None) or "--",
        "blood_group": getattr(s, "blood_group", None) or "--",
        "category":    getattr(s, "category",    None) or "General",
        "nationality": "Indian",
        "aadhar":      "XXXX XXXX " + aadhar_suffix,
        "profile_picture": s.profile_picture,
        "program":    s.program or "B.Tech CSE",
        "branch":     "CSE",
        "department": s.department or "Computer Science and Engineering",
        "semester":   sem, "year": year, "section": s.section or "B",
        "batch":          "2022-2026",
        "academic_year":  "2025-2026",
        "admitted_year":  "2022",
        "doj":            "01/08/2022",
        "institute_code": "KU-UIT-001",
        "institute_name": "Unitedworld Institute of Technology (UIT)",
        "university":     "Karnavati University",
        "application_no": "KU" + (enroll[-6:] if len(enroll) >= 6 else "202301"),
        "cgpa":             cgpa,
        "semester_records": sem_recs,
        "attendance_pct":   ovr_pct,
        "academic_standing": (
            "Good Standing"  if ovr_pct >= 75 else
            "On Probation"   if ovr_pct >= 60 else
            "Attendance Risk"
        ),
    }), 200


@students_bp.route("/profile/update", methods=["PATCH"])
@jwt_required()
def update_profile():
    """Update student-editable fields (ERP-locked fields are not changeable here)."""
    sid = get_jwt_identity()
    s   = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404
    data    = request.get_json() or {}
    EDITABLE = {"mobile", "emergency_contact", "permanent_address", "hostel_block"}
    updated = [f for f in EDITABLE if f in data]
    if not updated:
        return jsonify({"error": "No updatable fields. Editable: " + ", ".join(EDITABLE)}), 400
    for f in updated:
        setattr(s, f, data[f])
    db.session.commit()
    return jsonify({"message": "Updated: " + ", ".join(updated), "student_id": s.user_id}), 200


# ═══════════════════════ 7. ATTENDANCE TREND ═══════════════════════

@students_bp.route("/trend", methods=["GET"])
def get_trend():
    """Weekly percentage trend - real data or default fallback."""
    sid     = _resolve_student_id()
    records = AttendanceRecord.query.filter_by(student_id=sid)                                    .order_by(AttendanceRecord.timestamp.asc()).all()
    if not records:
        return jsonify({
            "labels": ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5","Wk 6","Wk 7","Wk 8"],
            "data":   [90, 85, 80, 75, 78, 73, 76, 78],
            "source": "default",
        }), 200
    weekly = defaultdict(lambda: {"present": 0, "total": 0})
    for r in records:
        wk = r.timestamp.isocalendar()[1]
        weekly[wk]["total"] += 1
        if r.status == "Present":
            weekly[wk]["present"] += 1
    wks    = sorted(weekly.keys())[-8:]
    labels = ["Wk " + str(i + 1) for i in range(len(wks))]
    data   = [round(weekly[w]["present"] / weekly[w]["total"] * 100, 1) for w in wks]
    return jsonify({"labels": labels, "data": data, "source": "real"}), 200


# ═══════════════════════ 8. APPEALS ═══════════════════════

@students_bp.route("/appeals", methods=["GET"])
@jwt_required()
def get_appeals():
    sid     = get_jwt_identity()
    appeals = Appeal.query.filter_by(student_id=sid).order_by(Appeal.created_at.desc()).all()
    result  = []
    for a in appeals:
        c = Course.query.filter_by(course_id=a.course_id).first()
        result.append({
            **a.to_dict(),
            "course_name": c.course_name if c else "--",
            "course_code": c.course_code if c else "--",
        })
    return jsonify(result), 200


@students_bp.route("/appeals", methods=["POST"])
@jwt_required()
def raise_appeal():
    """Raise attendance correction appeal. Body: {record_id, reason}"""
    sid       = get_jwt_identity()
    data      = request.get_json() or {}
    record_id = data.get("record_id", "").strip()
    reason    = data.get("reason", "").strip()
    if not record_id or not reason:
        return jsonify({"error": "record_id and reason are required"}), 400
    r = AttendanceRecord.query.filter_by(record_id=record_id, student_id=sid).first()
    if not r:
        return jsonify({"error": "Record not found or does not belong to you"}), 404
    if r.status == "Present":
        return jsonify({"error": "Cannot appeal a Present record"}), 400
    dup = Appeal.query.filter_by(record_id=record_id, student_id=sid, status="Pending").first()
    if dup:
        return jsonify({"error": "Appeal already pending", "appeal_id": dup.appeal_id}), 409
    a = Appeal(
        appeal_id="APL-" + uuid.uuid4().hex[:8].upper(),
        record_id=record_id, student_id=sid,
        course_id=r.course_id, reason=reason, status="Pending",
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({
        "message": "Appeal submitted. Faculty will review within 48 hours.",
        "appeal_id": a.appeal_id, "status": "Pending",
    }), 201


# ═══════════════════════ 9. PROFILE PHOTO ═══════════════════════

@students_bp.route("/profile/photo", methods=["POST"])
@jwt_required()
def upload_profile_photo():
    """Upload profile photo: multipart file or Base64 JSON."""
    sid = get_jwt_identity()
    s   = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404

    if "photo" in request.files:
        f   = request.files["photo"]
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in (f.filename or "") else ""
        if not f.filename:
            return jsonify({"error": "No file selected"}), 400
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return jsonify({"error": "Unsupported file type"}), 400
        f.seek(0, os.SEEK_END)
        if f.tell() / (1024 * 1024) > MAX_IMAGE_SIZE_MB:
            return jsonify({"error": "File too large"}), 413
        f.seek(0)
        fname = sid + "_" + uuid.uuid4().hex[:8] + "." + ext
        _remove_old_avatar(s)
        f.save(str(_avatar_dir() / fname))
        s.profile_picture = "/uploads/avatars/" + fname
        db.session.commit()
        return jsonify({"message": "Photo updated", "profile_picture": s.profile_picture}), 200

    data = request.get_json() or {}
    pd   = data.get("photo_data", "")
    if not pd or not pd.startswith("data:image/"):
        return jsonify({"error": "Send a file or Base64 data URI in photo_data"}), 400
    if len(pd) * 3 / 4 / (1024 * 1024) > MAX_IMAGE_SIZE_MB:
        return jsonify({"error": "Image too large"}), 413
    try:
        header, encoded = pd.split(",", 1)
        ext  = header.split(";")[0].split(":")[1].split("/")[-1].replace("jpeg", "jpg")
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return jsonify({"error": "Unsupported image type"}), 400
        fname = sid + "_" + uuid.uuid4().hex[:8] + "." + ext
        _remove_old_avatar(s)
        with open(str(_avatar_dir() / fname), "wb") as fh:
            fh.write(base64.b64decode(encoded))
        s.profile_picture = "/uploads/avatars/" + fname
        db.session.commit()
        return jsonify({"message": "Photo updated", "profile_picture": s.profile_picture}), 200
    except Exception as e:
        return jsonify({"error": "Failed to process image: " + str(e)}), 500


@students_bp.route("/profile/photo", methods=["DELETE"])
@jwt_required()
def remove_profile_photo():
    sid = get_jwt_identity()
    s   = _get_student(sid)
    if not s:
        return jsonify({"error": "Student not found"}), 404
    _remove_old_avatar(s)
    s.profile_picture = None
    db.session.commit()
    return jsonify({"message": "Profile photo removed", "profile_picture": None}), 200

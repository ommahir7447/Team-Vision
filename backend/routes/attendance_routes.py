from flask import Blueprint, request, jsonify
from datetime import datetime

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")

# Mock attendance store
MOCK_ATTENDANCE_RECORDS = []

@attendance_bp.route("/log", methods=["POST"])
def log_attendance():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    course_id = data.get("course_id")
    confidence_score = data.get("confidence_score", 0.0)
    
    if not student_id or not course_id:
        return jsonify({"error": "student_id and course_id are required"}), 400
        
    status = "Present" if confidence_score >= 0.85 else "Flagged"
    record = {
        "record_id": f"rec_{len(MOCK_ATTENDANCE_RECORDS) + 1}",
        "student_id": student_id,
        "course_id": course_id,
        "timestamp": datetime.utcnow().isoformat(),
        "confidence_score": confidence_score,
        "status": status,
        "verification_type": "Auto" if status == "Present" else "Manual"
    }
    MOCK_ATTENDANCE_RECORDS.append(record)
    
    return jsonify({
        "message": "Attendance log recorded",
        "record": record
    }), 201

@attendance_bp.route("/student/<student_id>", methods=["GET"])
def get_student_attendance(student_id):
    records = [r for r in MOCK_ATTENDANCE_RECORDS if r["student_id"] == student_id]
    return jsonify({"student_id": student_id, "records": records}), 200

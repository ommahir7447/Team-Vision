"""
gen_postman.py
Generates SmartAttend_API_Collection.postman_collection.json
Run from Capstone root: python backend/tests/gen_postman.py
"""
import json, os

BASE = "{{base_url}}"
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'SmartAttend_API_Collection.postman_collection.json')

def t(*lines):
    return [{"listen": "test", "script": {"type": "text/javascript", "exec": list(lines)}}]

def get(name, path, query=None, auth=False, tests=None):
    q = [{"key": k, "value": v} for k, v in (query or {}).items()]
    raw = BASE + path + ("?" + "&".join(f"{k}={v}" for k, v in (query or {}).items()) if query else "")
    url = {"raw": raw, "host": [BASE], "path": path.strip("/").split("/"), "query": q}
    r = {"name": name, "request": {"method": "GET", "url": url}}
    if auth:
        r["request"]["header"] = [{"key": "Authorization", "value": "Bearer {{jwt_token}}"}]
    if tests:
        r["event"] = tests
    return r

def post(name, endpoint, body, auth=False, tests=None, query=None):
    q = [{"key": k, "value": v} for k, v in (query or {}).items()]
    raw = BASE + endpoint + ("?" + "&".join(f"{k}={v}" for k, v in (query or {}).items()) if query else "")
    url = {"raw": raw, "host": [BASE], "path": endpoint.strip("/").split("/"), "query": q}
    headers = [{"key": "Content-Type", "value": "application/json"}]
    if auth:
        headers.append({"key": "Authorization", "value": "Bearer {{jwt_token}}"})
    r = {
        "name": name,
        "request": {"method": "POST", "header": headers,
                    "body": {"mode": "raw", "raw": json.dumps(body, indent=2)},
                    "url": url}
    }
    if tests:
        r["event"] = tests
    return r

def folder(name, items):
    return {"name": name, "item": items}

collection = {
    "info": {
        "name": "SmartAttend - Full API Collection",
        "description": (
            "Complete API test collection for SmartAttend (Module 2).\n\n"
            "Base URL: http://localhost:5000\n\n"
            "HOW TO USE:\n"
            "1. Import this file into Postman\n"
            "2. Start Flask: python -m backend.app\n"
            "3. Run 'Auth > Login - Student (Valid)' FIRST - saves JWT automatically\n"
            "4. All other requests use that token from collection variables\n\n"
            "FOLDERS:\n"
            "  Auth (8 requests)\n"
            "  Attendance (8 requests)\n"
            "  Student Portal (6 requests)\n"
            "  Faculty Dashboard (12 requests)\n"
            "  Mentor Dashboard (9 requests)"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {"key": "base_url",    "value": "http://localhost:5000", "type": "string"},
        {"key": "jwt_token",   "value": "",                      "type": "string"},
        {"key": "student_id",  "value": "S-202307020009",        "type": "string"},
        {"key": "faculty_id",  "value": "F001",                  "type": "string"},
        {"key": "mentor_id",   "value": "F001",                  "type": "string"},
        {"key": "course_id",   "value": "C101",                  "type": "string"},
        {"key": "record_id",   "value": "",                      "type": "string"},
        {"key": "appeal_id",   "value": "",                      "type": "string"},
    ],
    "item": [
        folder("Auth", [
            get("Health Check",
                "/api/health",
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('System healthy', function(){ var j=pm.response.json(); pm.expect(j.status).to.eql('healthy'); pm.expect(j.system).to.eql('SmartAttend API'); });"
                )),

            post("Login - Student (Valid)",
                "/api/auth/login",
                {"identifier": "202307020009", "password": "student123"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has access_token', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('access_token'); pm.expect(j.user.role).to.eql('student'); pm.collectionVariables.set('jwt_token', j.access_token); pm.collectionVariables.set('student_id', j.user.user_id); });"
                )),

            post("Login - Wrong Password (Expect 401)",
                "/api/auth/login",
                {"identifier": "202307020009", "password": "wrongpassword"},
                tests=t(
                    "pm.test('Status 401', function(){ pm.response.to.have.status(401); });",
                    "pm.test('Has error', function(){ pm.expect(pm.response.json()).to.have.property('error'); });"
                )),

            post("Login - Empty Fields (Expect 400)",
                "/api/auth/login",
                {"identifier": "", "password": ""},
                tests=t(
                    "pm.test('Status 400', function(){ pm.response.to.have.status(400); });"
                )),

            post("Login - Faculty (Valid)",
                "/api/auth/login",
                {"identifier": "F001", "password": "faculty123"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Faculty role', function(){ var j=pm.response.json(); pm.expect(j.user.role).to.eql('faculty'); pm.collectionVariables.set('jwt_token', j.access_token); pm.collectionVariables.set('faculty_id', j.user.user_id); });"
                )),

            get("Get /me - JWT Protected",
                "/api/auth/me",
                auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('User fields', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('user_id'); pm.expect(j).to.have.property('name'); pm.expect(j).to.have.property('role'); });"
                )),

            get("Get /me - No Token (Expect 401)",
                "/api/auth/me",
                tests=t(
                    "pm.test('Status 401', function(){ pm.response.to.have.status(401); });"
                )),

            post("Change Password",
                "/api/auth/change-password",
                {"identifier": "202307020009", "current_password": "student123", "new_password": "newpass456"},
                tests=t(
                    "pm.test('200 or 400 or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,400,404]); });"
                )),
        ]),

        folder("Attendance", [
            post("Log - Auto Present (conf=0.92, liveness=true)",
                "/api/attendance/log",
                {"student_id": "{{student_id}}", "course_id": "{{course_id}}", "confidence": 0.92, "liveness_passed": True},
                tests=t(
                    "pm.test('Status 201', function(){ pm.response.to.have.status(201); });",
                    "pm.test('Present + Auto', function(){ var r=pm.response.json().record; pm.expect(r.status).to.eql('Present'); pm.expect(r.verification_type).to.eql('Auto'); pm.collectionVariables.set('record_id', r.record_id); });"
                )),

            post("Log - Flagged (conf=0.70, liveness=true)",
                "/api/attendance/log",
                {"student_id": "{{student_id}}", "course_id": "{{course_id}}", "confidence": 0.70, "liveness_passed": True},
                tests=t(
                    "pm.test('Status 201', function(){ pm.response.to.have.status(201); });",
                    "pm.test('Flagged + Manual', function(){ var r=pm.response.json().record; pm.expect(r.status).to.eql('Flagged'); pm.expect(r.verification_type).to.eql('Manual'); });"
                )),

            post("Log - Rejected Low Confidence (conf=0.30)",
                "/api/attendance/log",
                {"student_id": "{{student_id}}", "course_id": "{{course_id}}", "confidence": 0.30, "liveness_passed": True},
                tests=t(
                    "pm.test('Status 400', function(){ pm.response.to.have.status(400); });",
                    "pm.test('Rejected', function(){ pm.expect(pm.response.json().status).to.eql('Rejected'); });"
                )),

            post("Log - Rejected Liveness Fail (conf=0.98, liveness=false)",
                "/api/attendance/log",
                {"student_id": "{{student_id}}", "course_id": "{{course_id}}", "confidence": 0.98, "liveness_passed": False},
                tests=t(
                    "pm.test('Status 422', function(){ pm.response.to.have.status(422); });",
                    "pm.test('Rejected + Liveness msg', function(){ var j=pm.response.json(); pm.expect(j.status).to.eql('Rejected'); pm.expect(j.reason).to.include('Liveness'); });"
                )),

            post("Log - Missing Fields (Expect 400)",
                "/api/attendance/log",
                {"confidence": 0.90},
                tests=t(
                    "pm.test('Status 400', function(){ pm.response.to.have.status(400); });"
                )),

            get("Get Class Attendance (Faculty View)",
                "/api/attendance/class",
                query={"subject": "Machine Learning", "program": "B.Tech CSE", "semester": "Semester 7", "section": "Section B"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has stats, students, trend', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('stats'); pm.expect(j).to.have.property('students'); pm.expect(j).to.have.property('trend'); });"
                )),

            post("Manual Verify - Approve Flagged Record",
                "/api/attendance/verify",
                {"record_id": "{{record_id}}", "action": "Approve"},
                tests=t(
                    "pm.test('200 or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,404]); });",
                    "if(pm.response.code===200){ pm.test('Status Present', function(){ pm.expect(pm.response.json().record.status).to.eql('Present'); }); }"
                )),

            post("Manual Verify - Reject Flagged Record",
                "/api/attendance/verify",
                {"record_id": "{{record_id}}", "action": "Reject"},
                tests=t(
                    "pm.test('200 or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,404]); });"
                )),
        ]),

        folder("Student Portal", [
            get("Get Profile", "/api/student/profile",
                query={"student_id": "{{student_id}}"}, auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Profile fields', function(){ var j=pm.response.json(); ['name','enrollment_no','program','semester'].forEach(function(f){ pm.expect(j).to.have.property(f); }); });"
                )),

            get("Get Full Profile (ID Card Data)", "/api/student/profile/full",
                query={"student_id": "{{student_id}}"}, auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has institute fields', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('institute_name'); pm.expect(j).to.have.property('batch'); pm.expect(j).to.have.property('blood_group'); });"
                )),

            get("Get Attendance Summary", "/api/student/summary",
                query={"student_id": "{{student_id}}"}, auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Summary fields valid', function(){ var j=pm.response.json(); ['overall_pct','total_classes','present','absent'].forEach(function(f){ pm.expect(j).to.have.property(f); }); pm.expect(j.overall_pct).to.be.within(0,100); });"
                )),

            get("Get Subject-wise Attendance", "/api/student/subjects",
                query={"student_id": "{{student_id}}"}, auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Array of subjects', function(){ var j=pm.response.json(); pm.expect(j).to.be.an('array'); if(j.length>0){ pm.expect(j[0]).to.have.property('name'); pm.expect(j[0]).to.have.property('pct'); pm.expect(j[0]).to.have.property('status'); } });"
                )),

            get("Get Attendance History (limit=20)", "/api/student/history",
                query={"student_id": "{{student_id}}", "limit": "20"}, auth=True,
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Returns array', function(){ pm.expect(pm.response.json()).to.be.an('array'); });"
                )),

            get("Get Attendance Trend (8-Week)", "/api/student/trend",
                query={"student_id": "{{student_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('8-week labels + data', function(){ var j=pm.response.json(); pm.expect(j.labels).to.have.lengthOf(8); pm.expect(j.data).to.have.lengthOf(8); });"
                )),
        ]),

        folder("Faculty Dashboard", [
            get("Get Faculty Profile", "/api/faculty/profile",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Faculty fields', function(){ var j=pm.response.json(); ['name','department','total_courses','total_students'].forEach(function(f){ pm.expect(j).to.have.property(f); }); });"
                )),

            get("Get Faculty Classes", "/api/faculty/classes",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Returns array', function(){ pm.expect(pm.response.json()).to.be.an('array'); });"
                )),

            get("Get Faculty Timetable", "/api/faculty/timetable",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has slots + by_day', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('slots'); pm.expect(j).to.have.property('by_day'); pm.expect(j).to.have.property('total_classes_per_week'); });"
                )),

            get("Get Faculty Subjects (with Analytics)", "/api/faculty/subjects",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Returns array', function(){ pm.expect(pm.response.json()).to.be.an('array'); });"
                )),

            get("Get Faculty Students", "/api/faculty/students",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has total + students array', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('total'); pm.expect(j.students).to.be.an('array'); });"
                )),

            get("Get Faculty Students - With Search", "/api/faculty/students",
                query={"faculty_id": "{{faculty_id}}", "search": "Om"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });"
                )),

            get("Get Individual Student Detail", "/api/faculty/student/{{student_id}}",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('200 or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,404]); });",
                    "if(pm.response.code===200){ pm.test('Has student + subjects', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('student'); pm.expect(j).to.have.property('subjects'); }); }"
                )),

            get("Get Defaulters (threshold=75%)", "/api/faculty/defaulters",
                query={"faculty_id": "{{faculty_id}}", "threshold": "75"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Correct structure', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('threshold'); pm.expect(j).to.have.property('count'); pm.expect(j).to.have.property('defaulters'); pm.expect(j.threshold).to.eql(75); });"
                )),

            get("Get Defaulters - Custom Threshold (60%)", "/api/faculty/defaulters",
                query={"faculty_id": "{{faculty_id}}", "threshold": "60"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Threshold is 60', function(){ pm.expect(pm.response.json().threshold).to.eql(60); });"
                )),

            get("Get Appeals", "/api/faculty/appeals",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Appeals structure', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('total'); pm.expect(j).to.have.property('appeals'); if(j.appeals.length>0){ pm.collectionVariables.set('appeal_id', j.appeals[0].appeal_id); } });"
                )),

            post("Review Appeal - Approve",
                "/api/faculty/appeals/{{appeal_id}}/review",
                {"action": "Approved", "remarks": "Valid medical certificate provided."},
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('200 or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,404]); });"
                )),

            get("Get Analytics", "/api/faculty/analytics",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('All key metrics', function(){ var j=pm.response.json(); ['avg_attendance_rate','total_enrolled','defaulters_count','weekly_trend'].forEach(function(f){ pm.expect(j).to.have.property(f); }); pm.expect(j.weekly_trend.labels).to.have.lengthOf(8); });"
                )),

            get("Export Attendance Report (CSV)", "/api/faculty/reports/export",
                query={"faculty_id": "{{faculty_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Content-Type is CSV', function(){ pm.expect(pm.response.headers.get('Content-Type')).to.include('text/csv'); });"
                )),
        ]),

        folder("Mentor Dashboard", [
            get("Get Mentor Profile", "/api/mentor/profile",
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has name + total_mentees', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('name'); pm.expect(j).to.have.property('total_mentees'); });"
                )),

            get("Get Mentees List", "/api/mentor/mentees",
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Has total + mentees', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('total'); pm.expect(j).to.have.property('mentees'); });"
                )),

            get("Get Mentees - With Search", "/api/mentor/mentees",
                query={"mentor_id": "{{mentor_id}}", "search": "Om"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });"
                )),

            get("Get Mentee Detail (Scope Enforced)", "/api/mentor/mentee/{{student_id}}",
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('200, 403, or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,403,404]); });",
                    "if(pm.response.code===403){ pm.test('Access denied message', function(){ pm.expect(pm.response.json().error).to.include('Access denied'); }); }"
                )),

            get("Get Mentee Attendance Breakdown", "/api/mentor/mentee/{{student_id}}/attendance",
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('200, 403, or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,403,404]); });"
                )),

            get("Get Mentee History (limit=30)", "/api/mentor/mentee/{{student_id}}/history",
                query={"mentor_id": "{{mentor_id}}", "limit": "30"},
                tests=t(
                    "pm.test('200, 403, or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,403,404]); });"
                )),

            get("Get Mentor Analytics", "/api/mentor/analytics",
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Analytics fields', function(){ var j=pm.response.json(); ['total_mentees','avg_attendance','at_risk_count','satisfactory_count'].forEach(function(f){ pm.expect(j).to.have.property(f); }); });"
                )),

            get("Get At-Risk Alerts (threshold=75%)", "/api/mentor/alerts",
                query={"mentor_id": "{{mentor_id}}", "threshold": "75"},
                tests=t(
                    "pm.test('Status 200', function(){ pm.response.to.have.status(200); });",
                    "pm.test('Alerts structure', function(){ var j=pm.response.json(); pm.expect(j).to.have.property('threshold'); pm.expect(j).to.have.property('total_alerts'); pm.expect(j).to.have.property('alerts'); });"
                )),

            post("Update Mentee Notes",
                "/api/mentor/mentee/{{student_id}}/notes",
                {"notes": "Counseling session scheduled. Attendance improving."},
                query={"mentor_id": "{{mentor_id}}"},
                tests=t(
                    "pm.test('200, 403, or 404', function(){ pm.expect(pm.response.code).to.be.oneOf([200,403,404]); });"
                )),
        ]),
    ]
}

total = sum(len(f["item"]) for f in collection["item"])
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(collection, fh, indent=2, ensure_ascii=False)

print(f"Collection written to: {os.path.abspath(OUT)}")
print(f"Total folders : {len(collection['item'])}")
print(f"Total requests: {total}")

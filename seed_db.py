"""
seed_db.py — SmartAttend Database Seeder (Backend Module Only)
Populates local SQLite database (smartattend.db) with realistic initial seed data
matching the team capstone specifications and frontend mock registry.
Only uses backend/ models — no dependency on recognition/ or features/.
"""

from datetime import datetime, timedelta
from backend.app import create_app
from backend.models.database import db
from backend.models.user import User
from backend.models.course import Course, Enrollment
from backend.models.attendance import AttendanceRecord
from backend.models.appeal import Appeal

app = create_app()


def seed_database():
    with app.app_context():
        print("[INFO] Seeding SmartAttend Database...")
        db.drop_all()
        db.create_all()

        # ── 1. Faculty Users ──
        faculty_data = [
            {'id': 'F001', 'name': 'Dr. Priya Sharma',  'email': 'p.sharma@karnavati.edu'},
            {'id': 'F002', 'name': 'Prof. Amit Verma',   'email': 'a.verma@karnavati.edu'},
            {'id': 'F003', 'name': 'Dr. Renu Patel',     'email': 'r.patel@karnavati.edu'},
            {'id': 'F004', 'name': 'Prof. Suresh Iyer',  'email': 's.iyer@karnavati.edu'},
            {'id': 'F005', 'name': 'Dr. Meena Joshi',    'email': 'm.joshi@karnavati.edu'},
        ]
        for f in faculty_data:
            u = User(
                user_id=f['id'], name=f['name'], email=f['email'],
                role='faculty', department='Computer Science & Engineering'
            )
            u.set_password('faculty123')
            db.session.add(u)

        # ── 2. Student Users ──
        students_data = [
            {'id': 'S045', 'name': 'Nidhi Tak',       'enrollment': '22BCS045', 'email': 'nidhi.tak@karnavati.edu',    'sem': 6, 'sec': 'C'},
            {'id': 'S701', 'name': 'Aarav Mehta',      'enrollment': '22BCS701', 'email': 'aarav.m@karnavati.edu',      'sem': 7, 'sec': 'B'},
            {'id': 'S702', 'name': 'Bhavya Shah',      'enrollment': '22BCS702', 'email': 'bhavya.s@karnavati.edu',     'sem': 7, 'sec': 'B'},
            {'id': 'S703', 'name': 'Chirag Patel',     'enrollment': '22BCS703', 'email': 'chirag.p@karnavati.edu',     'sem': 7, 'sec': 'B'},
            {'id': 'S704', 'name': 'Diya Joshi',       'enrollment': '22BCS704', 'email': 'diya.j@karnavati.edu',       'sem': 7, 'sec': 'B'},
            {'id': 'S705', 'name': 'Esha Trivedi',     'enrollment': '22BCS705', 'email': 'esha.t@karnavati.edu',       'sem': 7, 'sec': 'B'},
            {'id': 'S706', 'name': 'Farhan Khan',      'enrollment': '22BCS706', 'email': 'farhan.k@karnavati.edu',     'sem': 7, 'sec': 'B'},
            {'id': 'S707', 'name': 'Gauri Desai',      'enrollment': '22BCS707', 'email': 'gauri.d@karnavati.edu',      'sem': 7, 'sec': 'B'},
            {'id': 'S708', 'name': 'Harsh Gupta',      'enrollment': '22BCS708', 'email': 'harsh.g@karnavati.edu',      'sem': 7, 'sec': 'B'},
            {'id': 'S709', 'name': 'Isha Nair',        'enrollment': '22BCS709', 'email': 'isha.n@karnavati.edu',       'sem': 7, 'sec': 'B'},
            {'id': 'S710', 'name': 'Jay Verma',        'enrollment': '22BCS710', 'email': 'jay.v@karnavati.edu',        'sem': 7, 'sec': 'B'},
            {'id': 'S711', 'name': 'Kriti Agrawal',    'enrollment': '22BCS711', 'email': 'kriti.a@karnavati.edu',      'sem': 7, 'sec': 'B'},
            {'id': 'S712', 'name': 'Laksh Solanki',    'enrollment': '22BCS712', 'email': 'laksh.s@karnavati.edu',      'sem': 7, 'sec': 'B'},
            {'id': 'S713', 'name': 'Mira Jain',        'enrollment': '22BCS713', 'email': 'mira.j@karnavati.edu',       'sem': 7, 'sec': 'B'},
            {'id': 'S714', 'name': 'Nikhil Rao',       'enrollment': '22BCS714', 'email': 'nikhil.r@karnavati.edu',     'sem': 7, 'sec': 'B'},
        ]

        student_objs = []
        for s in students_data:
            u = User(
                user_id=s['id'], name=s['name'], email=s['email'],
                enrollment_no=s['enrollment'], roll_number=s['enrollment'],
                role='student', program='B.Tech CSE',
                semester=s['sem'], section=s['sec'],
                department='Computer Science & Engineering'
            )
            u.set_password('student123')
            student_objs.append(u)
            db.session.add(u)

        # ── 3. Courses ──
        courses_data = [
            {'id': 'C101', 'code': 'CS601', 'name': 'Machine Learning',            'fid': 'F001', 'fname': 'Dr. Priya Sharma',  'total': 42},
            {'id': 'C102', 'code': 'CS602', 'name': 'Cloud Computing',             'fid': 'F002', 'fname': 'Prof. Amit Verma',  'total': 40},
            {'id': 'C103', 'code': 'CS603', 'name': 'Cybersecurity',               'fid': 'F003', 'fname': 'Dr. Renu Patel',    'total': 38},
            {'id': 'C104', 'code': 'CS604', 'name': 'Database Management Systems', 'fid': 'F004', 'fname': 'Prof. Suresh Iyer', 'total': 36},
            {'id': 'C105', 'code': 'CS605', 'name': 'Software Engineering',        'fid': 'F005', 'fname': 'Dr. Meena Joshi',   'total': 34},
        ]

        course_objs = []
        for c in courses_data:
            co = Course(
                course_id=c['id'], course_code=c['code'], course_name=c['name'],
                faculty_id=c['fid'], faculty_name=c['fname'],
                program='B.Tech CSE', semester='Semester 7', section='Section B',
                total_classes=c['total']
            )
            course_objs.append(co)
            db.session.add(co)

        db.session.commit()

        # ── 4. Enrollments & Attendance History ──
        now = datetime.utcnow()
        records_to_add = []

        for s in student_objs:
            for c in course_objs:
                # Enrollment entry
                enr = Enrollment(
                    enrollment_id=f"ENR-{s.user_id}-{c.course_id}",
                    student_id=s.user_id,
                    course_id=c.course_id,
                    semester=c.semester
                )
                db.session.add(enr)

                # Historical attendance records for the past 10 class days
                for day_offset in range(1, 11):
                    rec_date = now - timedelta(days=day_offset)

                    # Deterministic status allocation for realistic variety
                    if s.user_id == 'S703' and c.course_id == 'C102':
                        status, conf, vtype = 'Absent', None, None
                    elif s.user_id == 'S705' and day_offset == 1:
                        status, conf, vtype = 'Flagged', 0.63, 'Manual'
                    elif s.user_id == 'S708' and day_offset in (3, 7):
                        status, conf, vtype = 'Absent', None, None
                    elif s.user_id == 'S712' and day_offset in (1, 4, 8):
                        status, conf, vtype = 'Absent', None, None
                    else:
                        status = 'Present' if (day_offset % 4 != 0) else 'Absent'
                        conf = round(0.85 + (day_offset % 5) * 0.03, 2) if status == 'Present' else None
                        vtype = 'Auto' if status == 'Present' else None

                    rec = AttendanceRecord(
                        record_id=f"REC-{s.user_id}-{c.course_id}-{day_offset}",
                        student_id=s.user_id,
                        course_id=c.course_id,
                        timestamp=rec_date,
                        status=status,
                        confidence_score=conf,
                        verification_type=vtype
                    )
                    records_to_add.append(rec)

        db.session.add_all(records_to_add)

        # ── 5. Sample Appeal ──
        sample_appeal = Appeal(
            appeal_id='APP-00102',
            record_id='REC-S045-C102-1',
            student_id='S045',
            course_id='C102',
            reason='Medical emergency on 2026-08-20. Doctor certificate attached.',
            status='Pending',
            created_at=now - timedelta(hours=12)
        )
        db.session.add(sample_appeal)

        db.session.commit()

        # Print summary
        user_count = User.query.count()
        course_count = Course.query.count()
        record_count = AttendanceRecord.query.count()
        appeal_count = Appeal.query.count()
        print(f"[SUCCESS] Database seeded!")
        print(f"  Users: {user_count}  |  Courses: {course_count}  |  Attendance Records: {record_count}  |  Appeals: {appeal_count}")


if __name__ == '__main__':
    seed_database()

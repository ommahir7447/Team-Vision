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
from backend.models.timetable import Timetable
from backend.models.mentor import MentorAssignment

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

        # Additional appeals for testing
        appeal2 = Appeal(
            appeal_id='APP-00103',
            record_id='REC-S703-C102-1',
            student_id='S703',
            course_id='C102',
            reason='Family emergency. Was unable to attend class.',
            status='Pending',
            created_at=now - timedelta(hours=6)
        )
        appeal3 = Appeal(
            appeal_id='APP-00104',
            record_id='REC-S712-C101-1',
            student_id='S712',
            course_id='C101',
            reason='University sports event participation. Certificate available.',
            status='Approved',
            reviewed_by='F001',
            reviewed_at=now - timedelta(hours=2),
            created_at=now - timedelta(days=3)
        )
        db.session.add_all([appeal2, appeal3])

        # ── 6. Timetable ──
        timetable_data = [
            # Dr. Priya Sharma (F001) — Machine Learning
            {'slot': 'TT-MON-0900-C101', 'fid': 'F001', 'cid': 'C101', 'day': 'Monday',    'start': '09:00', 'end': '10:00', 'room': 'Room 301', 'type': 'Lecture'},
            {'slot': 'TT-WED-0900-C101', 'fid': 'F001', 'cid': 'C101', 'day': 'Wednesday',  'start': '09:00', 'end': '10:00', 'room': 'Room 301', 'type': 'Lecture'},
            {'slot': 'TT-THU-1400-C101', 'fid': 'F001', 'cid': 'C101', 'day': 'Thursday',   'start': '14:00', 'end': '16:00', 'room': 'Lab 201',  'type': 'Lab'},
            {'slot': 'TT-FRI-1100-C101', 'fid': 'F001', 'cid': 'C101', 'day': 'Friday',     'start': '11:00', 'end': '12:00', 'room': 'Room 301', 'type': 'Tutorial'},

            # Prof. Amit Verma (F002) — Cloud Computing
            {'slot': 'TT-MON-1100-C102', 'fid': 'F002', 'cid': 'C102', 'day': 'Monday',    'start': '11:00', 'end': '12:00', 'room': 'Room 302', 'type': 'Lecture'},
            {'slot': 'TT-TUE-0900-C102', 'fid': 'F002', 'cid': 'C102', 'day': 'Tuesday',   'start': '09:00', 'end': '10:00', 'room': 'Room 302', 'type': 'Lecture'},
            {'slot': 'TT-THU-0900-C102', 'fid': 'F002', 'cid': 'C102', 'day': 'Thursday',  'start': '09:00', 'end': '10:00', 'room': 'Room 302', 'type': 'Lecture'},
            {'slot': 'TT-FRI-1400-C102', 'fid': 'F002', 'cid': 'C102', 'day': 'Friday',    'start': '14:00', 'end': '16:00', 'room': 'Lab 202',  'type': 'Lab'},

            # Dr. Renu Patel (F003) — Cybersecurity
            {'slot': 'TT-TUE-1100-C103', 'fid': 'F003', 'cid': 'C103', 'day': 'Tuesday',   'start': '11:00', 'end': '12:00', 'room': 'Room 303', 'type': 'Lecture'},
            {'slot': 'TT-WED-1400-C103', 'fid': 'F003', 'cid': 'C103', 'day': 'Wednesday', 'start': '14:00', 'end': '15:00', 'room': 'Room 303', 'type': 'Lecture'},
            {'slot': 'TT-FRI-0900-C103', 'fid': 'F003', 'cid': 'C103', 'day': 'Friday',    'start': '09:00', 'end': '10:00', 'room': 'Room 303', 'type': 'Lecture'},

            # Prof. Suresh Iyer (F004) — DBMS
            {'slot': 'TT-MON-1400-C104', 'fid': 'F004', 'cid': 'C104', 'day': 'Monday',    'start': '14:00', 'end': '15:00', 'room': 'Room 304', 'type': 'Lecture'},
            {'slot': 'TT-WED-1100-C104', 'fid': 'F004', 'cid': 'C104', 'day': 'Wednesday', 'start': '11:00', 'end': '12:00', 'room': 'Room 304', 'type': 'Lecture'},
            {'slot': 'TT-THU-1100-C104', 'fid': 'F004', 'cid': 'C104', 'day': 'Thursday',  'start': '11:00', 'end': '13:00', 'room': 'Lab 203',  'type': 'Lab'},

            # Dr. Meena Joshi (F005) — Software Engineering
            {'slot': 'TT-TUE-1400-C105', 'fid': 'F005', 'cid': 'C105', 'day': 'Tuesday',   'start': '14:00', 'end': '15:00', 'room': 'Room 305', 'type': 'Lecture'},
            {'slot': 'TT-WED-1600-C105', 'fid': 'F005', 'cid': 'C105', 'day': 'Wednesday', 'start': '16:00', 'end': '17:00', 'room': 'Room 305', 'type': 'Lecture'},
            {'slot': 'TT-SAT-0900-C105', 'fid': 'F005', 'cid': 'C105', 'day': 'Saturday',  'start': '09:00', 'end': '11:00', 'room': 'Lab 204',  'type': 'Lab'},
        ]

        for t in timetable_data:
            slot = Timetable(
                slot_id=t['slot'],
                faculty_id=t['fid'],
                course_id=t['cid'],
                day_of_week=t['day'],
                start_time=t['start'],
                end_time=t['end'],
                room=t['room'],
                section='Section B',
                slot_type=t['type'],
            )
            db.session.add(slot)

        # ── 7. Mentor Assignments ──
        # F001 (Dr. Priya Sharma) mentors 5 students
        # F002 (Prof. Amit Verma) mentors 5 students
        # F003 (Dr. Renu Patel) mentors 5 students
        mentor_assignments = [
            # Mentor F001 → students S701-S705
            {'mid': 'F001', 'sid': 'S701'},
            {'mid': 'F001', 'sid': 'S702'},
            {'mid': 'F001', 'sid': 'S703'},
            {'mid': 'F001', 'sid': 'S704'},
            {'mid': 'F001', 'sid': 'S705'},

            # Mentor F002 → students S706-S710
            {'mid': 'F002', 'sid': 'S706'},
            {'mid': 'F002', 'sid': 'S707'},
            {'mid': 'F002', 'sid': 'S708'},
            {'mid': 'F002', 'sid': 'S709'},
            {'mid': 'F002', 'sid': 'S710'},

            # Mentor F003 → students S711-S714 + S045
            {'mid': 'F003', 'sid': 'S711'},
            {'mid': 'F003', 'sid': 'S712'},
            {'mid': 'F003', 'sid': 'S713'},
            {'mid': 'F003', 'sid': 'S714'},
            {'mid': 'F003', 'sid': 'S045'},
        ]

        for ma in mentor_assignments:
            assignment = MentorAssignment(
                assignment_id=f"MA-{ma['mid']}-{ma['sid']}",
                mentor_id=ma['mid'],
                student_id=ma['sid'],
                semester='Semester 7',
                academic_year='2025-2026',
                assigned_at=now - timedelta(days=60),
                notes=None,
            )
            db.session.add(assignment)

        db.session.commit()

        # Print summary
        user_count = User.query.count()
        course_count = Course.query.count()
        record_count = AttendanceRecord.query.count()
        appeal_count = Appeal.query.count()
        timetable_count = Timetable.query.count()
        mentor_count = MentorAssignment.query.count()
        print(f"[SUCCESS] Database seeded!")
        print(f"  Users: {user_count}  |  Courses: {course_count}  |  Attendance Records: {record_count}")
        print(f"  Appeals: {appeal_count}  |  Timetable Slots: {timetable_count}  |  Mentor Assignments: {mentor_count}")


if __name__ == '__main__':
    seed_database()

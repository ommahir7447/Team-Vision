"""
test_attendance.py — Attendance API Tests
Covers: log attendance (confidence thresholds, liveness), class view, manual verify.
"""


class TestLogAttendance:
    """Tests for POST /api/attendance/log"""

    def test_high_confidence_auto_present(self, client):
        """Confidence >= 0.85 + liveness OK → Present (Auto)"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.92,
            'liveness_passed': True
        })
        assert r.status_code == 201
        rec = r.get_json()['record']
        assert rec['status'] == 'Present'
        assert rec['verification_type'] == 'Auto'
        assert rec['confidence'] == 0.92

    def test_mid_confidence_flagged_for_manual(self, client):
        """Confidence 0.55–0.84 + liveness OK → Flagged (Manual)"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.70,
            'liveness_passed': True
        })
        assert r.status_code == 201
        rec = r.get_json()['record']
        assert rec['status'] == 'Flagged'
        assert rec['verification_type'] == 'Manual'

    def test_boundary_confidence_085_is_present(self, client):
        """Exactly 0.85 should be Present (Auto), not Flagged"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.85,
            'liveness_passed': True
        })
        assert r.status_code == 201
        assert r.get_json()['record']['status'] == 'Present'

    def test_boundary_confidence_055_is_flagged(self, client):
        """Exactly 0.55 should be Flagged, not Rejected"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.55,
            'liveness_passed': True
        })
        assert r.status_code == 201
        assert r.get_json()['record']['status'] == 'Flagged'

    def test_low_confidence_rejected(self, client):
        """Confidence < 0.55 → Rejected, no record created"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.30,
            'liveness_passed': True
        })
        assert r.status_code == 400
        data = r.get_json()
        assert data['status'] == 'Rejected'
        assert data['record_created'] is False

    def test_liveness_failed_rejected_regardless_of_confidence(self, client):
        """Even 99% confidence must be rejected if liveness fails (anti-spoofing)"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.99,
            'liveness_passed': False
        })
        assert r.status_code == 422
        data = r.get_json()
        assert data['status'] == 'Rejected'
        assert 'Liveness' in data['reason']
        assert data['record_created'] is False

    def test_missing_student_id_returns_400(self, client):
        r = client.post('/api/attendance/log', json={
            'course_id': 'C101',
            'confidence': 0.90,
            'liveness_passed': True
        })
        assert r.status_code == 400

    def test_missing_course_id_returns_400(self, client):
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'confidence': 0.90,
            'liveness_passed': True
        })
        assert r.status_code == 400

    def test_missing_both_ids_returns_400(self, client):
        r = client.post('/api/attendance/log', json={
            'confidence': 0.90
        })
        assert r.status_code == 400

    def test_record_has_required_fields(self, client):
        """Verify response structure contains all expected fields"""
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': 0.90,
            'liveness_passed': True
        })
        assert r.status_code == 201
        rec = r.get_json()['record']
        for field in ['record_id', 'student_id', 'course_id', 'status', 'confidence', 'verification_type', 'timestamp']:
            assert field in rec, f"Missing field: {field}"


class TestGetClassAttendance:
    """Tests for GET /api/attendance/class"""

    def test_class_attendance_returns_200(self, client):
        r = client.get('/api/attendance/class?subject=Machine Learning')
        assert r.status_code == 200

    def test_class_attendance_has_all_sections(self, client):
        r = client.get('/api/attendance/class')
        data = r.get_json()
        assert 'stats' in data
        assert 'students' in data
        assert 'trend' in data
        assert 'activity' in data

    def test_class_stats_has_rate(self, client):
        r = client.get('/api/attendance/class')
        stats = r.get_json()['stats']
        assert 'total' in stats
        assert 'present' in stats
        assert 'absent' in stats
        assert 'rate' in stats
        assert 0.0 <= stats['rate'] <= 100.0

    def test_trend_has_8_weeks(self, client):
        r = client.get('/api/attendance/class')
        trend = r.get_json()['trend']
        assert len(trend['labels']) == 8
        assert len(trend['datasets']) > 0


class TestVerifyAttendance:
    """Tests for POST /api/attendance/verify"""

    def _log_and_get_record_id(self, client, confidence=0.70):
        r = client.post('/api/attendance/log', json={
            'student_id': 'S-202307020009',
            'course_id': 'C101',
            'confidence': confidence,
            'liveness_passed': True
        })
        return r.get_json()['record']['record_id']

    def test_approve_flagged_record_sets_present(self, client):
        record_id = self._log_and_get_record_id(client)
        r = client.post('/api/attendance/verify', json={
            'record_id': record_id,
            'action': 'Approve'
        })
        assert r.status_code == 200
        assert r.get_json()['record']['status'] == 'Present'

    def test_reject_flagged_record_sets_absent(self, client):
        record_id = self._log_and_get_record_id(client)
        r = client.post('/api/attendance/verify', json={
            'record_id': record_id,
            'action': 'Reject'
        })
        assert r.status_code == 200
        assert r.get_json()['record']['status'] == 'Absent'

    def test_verify_nonexistent_record_returns_404(self, client):
        r = client.post('/api/attendance/verify', json={
            'record_id': 'REC-DOESNOTEXIST',
            'action': 'Approve'
        })
        assert r.status_code == 404

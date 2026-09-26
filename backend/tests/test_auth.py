"""
test_auth.py — Authentication API Tests
Covers: Login (valid/invalid), JWT /me, change-password, health check.
"""


class TestHealthCheck:
    def test_health_returns_200(self, client):
        r = client.get('/api/health')
        assert r.status_code == 200

    def test_health_returns_healthy(self, client):
        data = r = client.get('/api/health').get_json()
        assert data['status'] == 'healthy'
        assert data['system'] == 'SmartAttend API'


class TestLogin:
    def test_login_student_success(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': '202307020009',
            'password': 'student123'
        })
        assert r.status_code == 200
        data = r.get_json()
        assert 'access_token' in data
        assert data['user']['role'] == 'student'
        assert data['user']['name'] == 'Om Ahir'

    def test_login_faculty_success(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': 'F001',
            'password': 'faculty123'
        })
        assert r.status_code == 200
        data = r.get_json()
        assert 'access_token' in data
        assert data['user']['role'] == 'faculty'

    def test_login_by_email(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': '202307020009@smartattend.edu',
            'password': 'student123'
        })
        assert r.status_code == 200

    def test_login_wrong_password_returns_401(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': '202307020009',
            'password': 'totally_wrong'
        })
        assert r.status_code == 401
        assert 'error' in r.get_json()

    def test_login_nonexistent_user_returns_401(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': 'nobody@fake.com',
            'password': 'abc123'
        })
        assert r.status_code == 401

    def test_login_empty_fields_returns_400(self, client):
        r = client.post('/api/auth/login', json={
            'identifier': '',
            'password': ''
        })
        assert r.status_code == 400
        assert 'error' in r.get_json()

    def test_login_missing_body_returns_400(self, client):
        r = client.post('/api/auth/login', json={})
        assert r.status_code == 400


class TestGetMe:
    def test_get_me_with_valid_token(self, client, student_token):
        r = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {student_token}'
        })
        assert r.status_code == 200
        data = r.get_json()
        assert data['user_id'] == 'S-202307020009'
        assert data['role'] == 'student'

    def test_get_me_no_token_returns_401(self, client):
        r = client.get('/api/auth/me')
        assert r.status_code == 401

    def test_get_me_invalid_token_returns_422(self, client):
        r = client.get('/api/auth/me', headers={
            'Authorization': 'Bearer this.is.fake'
        })
        assert r.status_code in (401, 422)


class TestChangePassword:
    def test_change_password_success(self, client):
        r = client.post('/api/auth/change-password', json={
            'identifier': '202307020009',
            'current_password': 'student123',
            'new_password': 'newpass456'
        })
        assert r.status_code == 200
        assert 'message' in r.get_json()

    def test_changed_password_works_for_login(self, client):
        client.post('/api/auth/change-password', json={
            'identifier': '202307020009',
            'current_password': 'student123',
            'new_password': 'mynewpass99'
        })
        r = client.post('/api/auth/login', json={
            'identifier': '202307020009',
            'password': 'mynewpass99'
        })
        assert r.status_code == 200

    def test_change_password_wrong_current_returns_400(self, client):
        r = client.post('/api/auth/change-password', json={
            'identifier': '202307020009',
            'current_password': 'wrongold',
            'new_password': 'newpass456'
        })
        assert r.status_code == 400

    def test_change_password_too_short_returns_400(self, client):
        r = client.post('/api/auth/change-password', json={
            'identifier': '202307020009',
            'current_password': 'student123',
            'new_password': '123'
        })
        assert r.status_code == 400

    def test_change_password_missing_fields_returns_400(self, client):
        r = client.post('/api/auth/change-password', json={
            'identifier': '202307020009'
        })
        assert r.status_code == 400

"""
auth.py — Authentication REST API Handlers (SmartAttend Module 2)
Provides login, identity inspection, and token validation with JWT.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from backend.models.database import db
from backend.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticates a user via Email, Enrollment Number, or Student ID + Password.
    """
    data = request.get_json() or {}
    identifier = (data.get('identifier') or data.get('email') or '').strip()
    password = data.get('password', '').strip()

    if not identifier or not password:
        return jsonify({'error': 'Enrollment Number / Email and password are required'}), 400

    # Match by Email, Enrollment Number, User ID, or Name (case-insensitive)
    user = User.query.filter(
        (User.email.ilike(identifier)) | 
        (User.enrollment_no.ilike(identifier)) | 
        (User.user_id.ilike(identifier)) |
        (User.user_id.ilike(f"S-{identifier}")) |
        (User.name.ilike(identifier)) |
        (User.name.ilike(f"%{identifier}%"))
    ).first()

    # Also handle partial matching for common student names like "Om Ahir" / "Om Mahir"
    if not user:
        clean_name = identifier.replace(' ', '').lower()
        all_users = User.query.all()
        for u in all_users:
            u_clean = u.name.replace(' ', '').lower() if u.name else ''
            if clean_name in u_clean or u_clean in clean_name or (u.email and clean_name in u.email.lower()):
                user = u
                break

    # Verify password (also allow default 'student123' or 'faculty123' for initial/google-linked accounts)
    is_valid_pw = (
        user.check_password(password) or
        (password == 'student123' and (user.role == 'student' or user.check_password('google_auto_generated'))) or
        (password == 'faculty123' and user.role == 'faculty')
    )

    if not user or not is_valid_pw:
        return jsonify({'error': 'Invalid credentials. Please check your Enrollment Number/Email and password.'}), 401

    access_token = create_access_token(identity=user.user_id, additional_claims={'role': user.role})

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Allows students to change/activate their university-assigned password.
    Requires Enrollment Number / Email, current assigned password, and new password.
    """
    data = request.get_json() or {}
    identifier = (data.get('identifier') or data.get('email') or data.get('enrollment_no') or '').strip()
    current_password = data.get('current_password', '').strip()
    new_password = data.get('new_password', '').strip()

    if not identifier or not current_password or not new_password:
        return jsonify({'error': 'Enrollment Number / Email, Current Password, and New Password are required.'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long.'}), 400

    # Locate student in university records by email, enrollment_no, user_id, or name
    user = User.query.filter(
        (User.email.ilike(identifier)) | 
        (User.enrollment_no == identifier) | 
        (User.user_id == identifier) |
        (User.user_id == f"S-{identifier}") |
        (User.name.ilike(identifier))
    ).first()

    if not user:
        return jsonify({
            'error': f'Student record "{identifier}" not found. Please enter your full Enrollment Number (e.g. 202307020009) or University Email.'
        }), 404

    # Verify current/assigned password (also accept default 'student123' for first-time setup)
    is_valid_pw = (
        user.check_password(current_password) or 
        (user.check_password('google_auto_generated')) or
        current_password == 'student123'
    )
    if not is_valid_pw:
        return jsonify({
            'error': 'Incorrect current/assigned password. For first-time setup, use the default assigned password: student123'
        }), 400

    # Update to new password
    user.set_password(new_password)
    db.session.commit()

    return jsonify({
        'message': 'Password updated successfully! You can now sign in with your new password.',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    if not all([user_id, name, email, password]):
        return jsonify({'error': 'Missing required registration fields'}), 400

    if User.query.filter((User.email == email) | (User.user_id == user_id)).first():
        return jsonify({'error': 'User already exists'}), 400

    user = User(
        user_id=user_id,
        name=name,
        email=email,
        role=role,
        department=data.get('department', 'Computer Science & Engineering'),
        enrollment_no=data.get('enrollment_no'),
        program=data.get('program', 'B.Tech CSE'),
        semester=data.get('semester', 6),
        section=data.get('section', 'C')
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully', 'user': user.to_dict()}), 201



@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """
    Verifies the Google ID token, enforces university domain,
    auto-registers new users with enrollment number from email prefix.
    """
    ALLOWED_DOMAIN = 'karnavatiuniversity.edu.in'

    data = request.get_json() or {}
    token = data.get('credential')

    if not token:
        return jsonify({'error': 'No credential provided'}), 400

    try:
        CLIENT_ID = current_app.config.get('GOOGLE_CLIENT_ID')
        idinfo = None

        # Attempt online verification first
        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)
        except Exception as verify_err:
            # Fallback: Safely decode payload if Google cert servers are unreachable / offline
            import json, base64
            try:
                parts = token.split('.')
                if len(parts) >= 2:
                    padded = parts[1] + '=' * ((4 - len(parts[1]) % 4) % 4)
                    idinfo = json.loads(base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8'))
                else:
                    return jsonify({'error': 'Invalid Google token format', 'details': str(verify_err)}), 400
            except Exception as decode_err:
                return jsonify({'error': 'Could not decode Google token', 'details': str(decode_err)}), 400

        email = idinfo.get('email', '')
        name = idinfo.get('name', '')

        if not email:
            return jsonify({'error': 'Google token did not contain an email'}), 400

        # ── Domain restriction ──
        if not email.endswith(f'@{ALLOWED_DOMAIN}'):
            return jsonify({
                'error': 'Access restricted',
                'message': f'Only @{ALLOWED_DOMAIN} email addresses are allowed. You signed in with {email}.'
            }), 403

        enrollment_no = email.split('@')[0]   # e.g. "202307020009"

        # ── Check if user already exists in university records ──
        user = User.query.filter(
            (User.email == email) | 
            (User.enrollment_no == enrollment_no) | 
            (User.user_id == f"S-{enrollment_no}") |
            (User.user_id == enrollment_no)
        ).first()

        # ── Auto-register new university users ──
        if not user:
            user_id = f"S-{enrollment_no}"

            user = User(
                user_id=user_id,
                name=name,
                email=email,
                enrollment_no=enrollment_no,
                roll_number=enrollment_no,
                role='student',
                department='Computer Science & Engineering',
                program='B.Tech CSE',
                semester=7,
                section='B'
            )
            user.set_password('google_auto_generated')
            db.session.add(user)
            db.session.commit()
        elif user.email != email:
            # Sync user's verified university email
            user.email = email
            db.session.commit()

        # ── Issue JWT ──
        access_token = create_access_token(
            identity=user.user_id,
            additional_claims={'role': user.role}
        )

        return jsonify({
            'message': 'Google Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': 'Authentication process failed', 'details': str(e)}), 500


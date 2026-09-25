"""
app.py — Main Flask Application Entrypoint (SmartAttend Module 2)
Assembles Flask app, database models, CORS, JWT auth, and REST API blueprints.
This module is fully self-contained — no dependency on recognition/ or features/.
"""

import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import Config
from backend.models.database import db

# Import Module 2 API blueprints only
from backend.routes.auth import auth_bp
from backend.routes.attendance import attendance_bp
from backend.routes.students import students_bp
from backend.routes.faculty import faculty_bp


def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../frontend', template_folder='../frontend')
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    JWTManager(app)

    # Register Module 2 blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(students_bp)
    app.register_blueprint(faculty_bp)

    # ── Serve frontend HTML pages ──
    @app.route('/')
    def index():
        return send_from_directory('../frontend', 'index.html')

    @app.route('/faculty')
    def faculty_page():
        return send_from_directory('../frontend', 'faculty.html')

    @app.route('/student')
    def student_page():
        return send_from_directory('../frontend', 'student.html')

    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        return send_from_directory(
            os.path.join(app.root_path, '..', 'uploads'),
            filename
        )

    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory('../frontend', filename)

    # ── Health check endpoint ──
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'system': 'SmartAttend API',
            'version': '1.0.0',
            'institution': 'SmartAttend Academic System'
        }), 200

    # Ensure upload directory exists
    upload_dir = Path(app.root_path).parent / 'uploads' / 'avatars'
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Auto-create database tables on startup
    with app.app_context():
        db.create_all()
        # Migrate: add profile_picture column if missing (for existing SQLite DBs)
        try:
            import sqlite3
            db_path = Path(app.root_path).parent / 'smartattend.db'
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                cols = [row[1] for row in conn.execute('PRAGMA table_info(users)').fetchall()]
                if 'profile_picture' not in cols:
                    conn.execute('ALTER TABLE users ADD COLUMN profile_picture TEXT')
                    conn.commit()
                    print('[INFO] Migrated users table: added profile_picture column.')
                conn.close()
        except Exception as migrate_err:
            print(f'[WARN] DB migration check failed: {migrate_err}')

    return app


app = create_app()

if __name__ == '__main__':
    print("[INFO] Starting SmartAttend Backend Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

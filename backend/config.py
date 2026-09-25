"""
config.py — SmartAttend Backend Configuration
Supports both MySQL (production) and SQLite (fallback) via DATABASE_URL env var.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv(os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), '.env'))

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartattend-secret-key-2026-uit-cse-department')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'smartattend-jwt-secret-key-2026-uit-cse-dept')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # ── Database Configuration ──
    # Set DATABASE_URL in .env to use MySQL:
    #   DATABASE_URL=mysql+pymysql://user:password@localhost:3306/smartattend
    # Falls back to SQLite if DATABASE_URL is not set.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "smartattend.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # MySQL connection pool settings (ignored for SQLite)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 3600,   # Recycle connections after 1 hour
        'pool_pre_ping': True,  # Verify connections before use
    }

    # Confidence threshold rules
    AUTO_CONFIDENCE_THRESHOLD = float(os.environ.get('AUTO_CONFIDENCE_THRESHOLD', 0.85))
    MANUAL_CONFIDENCE_THRESHOLD = float(os.environ.get('MANUAL_CONFIDENCE_THRESHOLD', 0.55))

    # CORS Configuration
    CORS_HEADERS = 'Content-Type'

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '1076585899574-6iei9hbuv9slo1hdpngdvvne8ls55pa2.apps.googleusercontent.com')

    # Agentic AI LLM Keys
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

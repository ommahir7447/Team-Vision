"""
config.py — SmartAttend Backend Configuration
"""

import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'smartattend-secret-key-2026-uit-cse-department')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'smartattend-jwt-secret-key-2026-uit-cse-dept')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # SQLite Database URI (Local default) with optional Cloud sync hooks
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "smartattend.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
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

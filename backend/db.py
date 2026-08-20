import os
import firebase_admin
from firebase_admin import credentials, firestore
from backend.config import Config

db = None

def init_db():
    global db
    cred_path = Config.FIREBASE_CREDENTIALS_PATH
    
    if os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("[DB] Firebase Firestore connected successfully.")
        except Exception as e:
            print(f"[DB Error] Failed to initialize Firebase: {e}")
            db = None
    else:
        print(f"[DB Warning] Credentials file not found at '{cred_path}'. Database running in mock mode.")
        db = None

def get_db():
    return db

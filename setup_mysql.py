"""
setup_mysql.py — SmartAttend MySQL Database Setup
Creates the 'smartattend' database in MySQL if it doesn't exist.
Run this ONCE before starting the app or seeding data.

Usage:
    python setup_mysql.py
"""

import os
import sys
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))


def setup_mysql():
    database_url = os.environ.get('DATABASE_URL', '')

    if 'mysql' not in database_url:
        print("[SKIP] DATABASE_URL is not set to MySQL. No setup needed.")
        print(f"       Current DATABASE_URL: {database_url or '(not set, using SQLite)'}")
        return

    try:
        import pymysql
    except ImportError:
        print("[ERROR] PyMySQL is not installed. Run: pip install PyMySQL>=1.1.0")
        sys.exit(1)

    # Parse the DATABASE_URL to extract credentials
    # Format: mysql+pymysql://user:password@host:port/database
    try:
        # Remove the driver prefix
        url_part = database_url.split('://')[1]
        user_pass, host_db = url_part.split('@')
        user, password = user_pass.split(':') if ':' in user_pass else (user_pass, '')
        host_port, db_name = host_db.split('/')
        host = host_port.split(':')[0]
        port = int(host_port.split(':')[1]) if ':' in host_port else 3306
    except (IndexError, ValueError) as e:
        print(f"[ERROR] Could not parse DATABASE_URL: {e}")
        print(f"        Expected format: mysql+pymysql://user:password@host:port/database")
        sys.exit(1)

    print(f"[INFO] Connecting to MySQL at {host}:{port} as '{user}'...")

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset='utf8mb4'
        )
        cursor = conn.cursor()

        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                       f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"[SUCCESS] Database '{db_name}' is ready.")

        # Verify it exists
        cursor.execute("SHOW DATABASES")
        databases = [row[0] for row in cursor.fetchall()]
        if db_name in databases:
            print(f"[INFO] Confirmed: '{db_name}' exists in MySQL.")
        else:
            print(f"[WARNING] Database '{db_name}' not found after creation attempt.")

        cursor.close()
        conn.close()
        print("[INFO] MySQL setup complete. You can now run:")
        print("       python seed_db.py     (to populate with seed data)")
        print("       python -m backend.app (to start the server)")

    except pymysql.err.OperationalError as e:
        error_code = e.args[0]
        if error_code == 1045:
            print(f"[ERROR] Access denied. Check your MySQL username and password in .env")
        elif error_code == 2003:
            print(f"[ERROR] Cannot connect to MySQL server at {host}:{port}.")
            print(f"        Make sure MySQL is running.")
        else:
            print(f"[ERROR] MySQL connection failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    setup_mysql()

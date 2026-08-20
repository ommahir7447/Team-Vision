from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    # Placeholder authentication logic (Replace with Firebase Auth / DB check)
    token = create_access_token(identity={"email": email, "role": role})
    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": role,
        "user": {"email": email}
    }), 200

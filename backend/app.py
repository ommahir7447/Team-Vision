from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config import Config
from backend.db import init_db
from backend.routes.auth_routes import auth_bp
from backend.routes.attendance_routes import attendance_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(attendance_bp)

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "SmartAttend Backend API",
        "version": "1.0.0"
    }), 200

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)

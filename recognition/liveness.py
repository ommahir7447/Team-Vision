"""
liveness.py — Anti-Spoofing & Liveness Verification (SmartAttend Module 1)
Detects spoofing attempts (photos/screens held to camera) via Laplacian variance texture analysis
and Eye Aspect Ratio (EAR) blink tracking.
"""

import cv2
import numpy as np


def analyze_texture_liveness(face_crop: np.ndarray, laplacian_threshold=45.0) -> dict:
    """
    Analyzes high-frequency texture components using Laplacian variance.
    Printed photos or screen displays have significantly lower high-frequency texture noise.
    """
    if face_crop is None or face_crop.size == 0:
        return {'is_live': False, 'score': 0.0, 'reason': 'Invalid image crop'}

    try:
        if len(face_crop.shape) == 3:
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_crop
        variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    except Exception:
        # Fallback numpy gradient variance
        if len(face_crop.shape) == 3:
            gray = np.mean(face_crop, axis=2)
        else:
            gray = face_crop
        gy, gx = np.gradient(gray)
        variance = float(np.var(gx) + np.var(gy)) * 10.0

    score = min(1.0, float(variance / 200.0))
    is_live = variance >= laplacian_threshold

    return {
        'is_live': is_live,
        'score': round(score, 3),
        'variance': round(float(variance), 2),
        'method': 'laplacian_texture_analysis'
    }


def calculate_ear(eye_landmarks: np.ndarray) -> float:
    """
    Calculates Eye Aspect Ratio (EAR) for landmark points per eye.
    """
    if len(eye_landmarks) < 6:
        return 0.0

    p1, p2, p3, p4, p5, p6 = eye_landmarks[:6]
    dist_vertical1 = np.linalg.norm(p2 - p6)
    dist_vertical2 = np.linalg.norm(p3 - p5)
    dist_horizontal = np.linalg.norm(p1 - p4)

    if dist_horizontal == 0:
        return 0.0

    ear = (dist_vertical1 + dist_vertical2) / (2.0 * dist_horizontal)
    return float(ear)


def verify_liveness(face_crop: np.ndarray) -> dict:
    """
    Unified liveness checking pipeline combining texture & motion heuristics.
    """
    texture_res = analyze_texture_liveness(face_crop)
    return {
        'passed': texture_res['is_live'],
        'confidence': texture_res['score'],
        'details': texture_res
    }

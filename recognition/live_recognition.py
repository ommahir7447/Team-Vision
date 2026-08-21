import cv2
import pickle
import numpy as np
from deepface import DeepFace

# --------------------------------------------------
# Configuration
# --------------------------------------------------

EMBEDDINGS_FILE = "embeddings.pkl"

# ArcFace cosine distance:
# LOWER = BETTER MATCH
MATCH_THRESHOLD = 0.68

# Blink detection
EAR_THRESHOLD = 0.21
BLINK_CONSECUTIVE_FRAMES = 2


# --------------------------------------------------
# Load enrolled embeddings
# --------------------------------------------------

with open(EMBEDDINGS_FILE, "rb") as file:
    enrolled_data = pickle.load(file)

print(f"Loaded {len(enrolled_data)} enrollment images.")

for item in enrolled_data:
    item["embedding"] = np.array(item["embedding"], dtype=np.float32)


# --------------------------------------------------
# Cosine distance
# --------------------------------------------------

def cosine_distance(embedding1, embedding2):
    embedding1 = np.array(embedding1, dtype=np.float32)
    embedding2 = np.array(embedding2, dtype=np.float32)

    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)

    if norm1 == 0 or norm2 == 0:
        return 1.0

    similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)

    return float(1.0 - similarity)


# --------------------------------------------------
# Find best match
# --------------------------------------------------

def find_best_match(live_embedding):

    best_name = "Unknown"
    best_distance = float("inf")

    for item in enrolled_data:

        distance = cosine_distance(
            live_embedding,
            item["embedding"]
        )

        if distance < best_distance:
            best_distance = distance
            best_name = item["name"]

    verified = best_distance <= MATCH_THRESHOLD

    return best_name, best_distance, verified


# --------------------------------------------------
# Blink detection using MediaPipe
# --------------------------------------------------

import mediapipe as mp

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


MODEL_PATH = "models/face_landmarker.task"

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1
)

face_landmarker = FaceLandmarker.create_from_options(options)


# --------------------------------------------------
# Eye landmark helpers
# --------------------------------------------------

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def calculate_ear(landmarks, eye_indices):

    points = np.array(
        [[landmarks[i].x, landmarks[i].y] for i in eye_indices],
        dtype=np.float32
    )

    vertical1 = np.linalg.norm(points[1] - points[5])
    vertical2 = np.linalg.norm(points[2] - points[4])

    horizontal = np.linalg.norm(points[0] - points[3])

    if horizontal == 0:
        return 0.0

    return (vertical1 + vertical2) / (2.0 * horizontal)


# --------------------------------------------------
# Camera
# --------------------------------------------------

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open webcam.")
    raise SystemExit


print()
print("=" * 60)
print("SMARTATTEND - LIVE FACE RECOGNITION")
print("=" * 60)
print("Look at the camera.")
print("Blink naturally to pass liveness.")
print("Press Q or ESC to quit.")
print("=" * 60)


blink_counter = 0
blink_detected = False

last_name = "Detecting..."
last_distance = None
last_verified = False

frame_counter = 0


# --------------------------------------------------
# Main loop
# --------------------------------------------------

while True:

    ret, frame = cap.read()

    if not ret:
        print("❌ Failed to read camera frame.")
        break

    frame_counter += 1

    # --------------------------------------------------
    # Face recognition
    # --------------------------------------------------

    # Run recognition every 5 frames to reduce CPU load
    if frame_counter % 5 == 0:

        try:

            results = DeepFace.represent(
                img_path=frame,
                model_name="ArcFace",
                detector_backend="opencv",
                enforce_detection=False
            )

            if results:

                live_embedding = np.array(
                    results[0]["embedding"],
                    dtype=np.float32
                )

                name, distance, verified = find_best_match(
                    live_embedding
                )

                last_name = name
                last_distance = distance
                last_verified = verified

        except Exception:
            pass


    # --------------------------------------------------
    # Blink / liveness
    # --------------------------------------------------

    try:

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        result = face_landmarker.detect(mp_image)

        if result.face_landmarks:

            landmarks = result.face_landmarks[0]

            left_ear = calculate_ear(
                landmarks,
                LEFT_EYE
            )

            right_ear = calculate_ear(
                landmarks,
                RIGHT_EYE
            )

            ear = (left_ear + right_ear) / 2.0

            if ear < EAR_THRESHOLD:

                blink_counter += 1

            else:

                if blink_counter >= BLINK_CONSECUTIVE_FRAMES:
                    blink_detected = True

                blink_counter = 0

    except Exception:
        pass


    # --------------------------------------------------
    # Display
    # --------------------------------------------------

    display_name = last_name

    if last_distance is not None:

        distance_text = f"Distance: {last_distance:.3f}"

    else:

        distance_text = "Distance: ---"


    if last_verified:

        status = "MATCH"

    else:

        status = "UNKNOWN"


    cv2.putText(
        frame,
        f"Person: {display_name}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 255, 0) if last_verified else (0, 0, 255),
        2
    )

    cv2.putText(
        frame,
        distance_text,
        (20, 75),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Recognition: {status}",
        (20, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0) if last_verified else (0, 0, 255),
        2
    )


    if blink_detected:

        cv2.putText(
            frame,
            "LIVENESS: PASSED",
            (20, 150),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

    else:

        cv2.putText(
            frame,
            "LIVENESS: BLINK REQUIRED",
            (20, 150),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2
        )


    cv2.imshow(
        "SmartAttend - Face Recognition",
        frame
    )


    # --------------------------------------------------
    # Quit
    # --------------------------------------------------

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q") or key == 27:
        break


# --------------------------------------------------
# Cleanup
# --------------------------------------------------

cap.release()
cv2.destroyAllWindows()
face_landmarker.close()

print()
print("=" * 60)
print("Recognition stopped.")
print(f"Last detected person: {last_name}")

if last_distance is not None:
    print(f"Last distance: {last_distance:.3f}")

print(f"Liveness passed: {blink_detected}")
print("=" * 60)
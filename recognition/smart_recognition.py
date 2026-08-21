import cv2
import pickle
import numpy as np
import mediapipe as mp
from deepface import DeepFace


# ============================================================
# CONFIGURATION
# ============================================================

EMBEDDINGS_FILE = "embeddings.pkl"

# ArcFace distance threshold.
# LOWER = better match.
RECOGNITION_THRESHOLD = 0.68

# Initial EAR threshold.
EAR_THRESHOLD = 0.21

# ============================================================
# LOAD ENROLLED EMBEDDINGS
# ============================================================

print("Loading enrolled embeddings...")

with open(EMBEDDINGS_FILE, "rb") as f:
    enrolled_embeddings = pickle.load(f)

print(f"Loaded {len(enrolled_embeddings)} enrollment images.")


# ============================================================
# MEDIAPIPE FACE LANDMARKER
# ============================================================

MODEL_PATH = "models/face_landmarker.task"

BaseOptions = mp.tasks.BaseOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.VIDEO,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)

landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)


# ============================================================
# EYE LANDMARKS
# ============================================================

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def calculate_ear(landmarks, eye_indices, width, height):

    points = []

    for index in eye_indices:

        landmark = landmarks[index]

        x = landmark.x * width
        y = landmark.y * height

        points.append(np.array([x, y]))

    p1, p2, p3, p4, p5, p6 = points

    vertical_1 = np.linalg.norm(p2 - p6)
    vertical_2 = np.linalg.norm(p3 - p5)

    horizontal = np.linalg.norm(p1 - p4)

    if horizontal == 0:
        return 0.0

    return (vertical_1 + vertical_2) / (2.0 * horizontal)


# ============================================================
# COSINE DISTANCE
# ============================================================

def cosine_distance(a, b):

    a = np.asarray(a)
    b = np.asarray(b)

    denominator = np.linalg.norm(a) * np.linalg.norm(b)

    if denominator == 0:
        return 1.0

    similarity = np.dot(a, b) / denominator

    return 1.0 - similarity


# ============================================================
# RECOGNITION
# ============================================================

def recognize_face(face_crop):

    try:

        result = DeepFace.represent(
            img_path=face_crop,
            model_name="ArcFace",
            detector_backend="skip",
            enforce_detection=False
        )

        live_embedding = np.array(
            result[0]["embedding"],
            dtype=np.float32
        )

    except Exception as e:

        print("Embedding error:", e)
        return "Unknown", 1.0

    best_name = "Unknown"
    best_distance = float("inf")

    for entry in enrolled_embeddings:

        # Our enrollment file stores:
        # name + embedding

        if isinstance(entry, dict):

            name = entry.get("name", "Unknown")
            reference = entry.get("embedding")

        else:

            # Safety fallback
            name = "Unknown"
            reference = entry

        if reference is None:
            continue

        reference = np.asarray(
            reference,
            dtype=np.float32
        )

        distance = cosine_distance(
            live_embedding,
            reference
        )

        if distance < best_distance:

            best_distance = distance
            best_name = name

    if best_distance <= RECOGNITION_THRESHOLD:

        return best_name, best_distance

    return "Unknown", best_distance


# ============================================================
# CAMERA
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():

    print("❌ Could not open camera.")
    raise SystemExit


window_name = "SmartAttend - Recognition + Liveness"

cv2.namedWindow(
    window_name,
    cv2.WINDOW_NORMAL
)


print()
print("=" * 60)
print("SMARTATTEND — RECOGNITION + LIVENESS TEST")
print("=" * 60)
print("Look at the camera and blink.")
print("Press Q or ESC to quit.")
print()


# ============================================================
# STATE
# ============================================================

eyes_closed = False
blink_count = 0

blink_verified = False

timestamp_ms = 0


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:

        print("❌ Could not read camera.")
        break

    height, width = frame.shape[:2]

    # --------------------------------------------------------
    # FACE DETECTION
    # --------------------------------------------------------

    gray = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2GRAY
    )

    # Use OpenCV's built-in frontal detector
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades +
        "haarcascade_frontalface_default.xml"
    )

    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80)
    )

    # --------------------------------------------------------
    # PROCESS FACE
    # --------------------------------------------------------

    if len(faces) > 0:

        # For this first version we use the largest face
        x, y, w, h = max(
            faces,
            key=lambda face: face[2] * face[3]
        )

        # Draw face box
        cv2.rectangle(
            frame,
            (x, y),
            (x + w, y + h),
            (0, 255, 0),
            2
        )

        # Crop face
        face_crop = frame[y:y+h, x:x+w]

        # ----------------------------------------------------
        # FACE RECOGNITION
        # ----------------------------------------------------

        name, distance = recognize_face(
            face_crop
        )

        # ----------------------------------------------------
        # LIVENESS / BLINK
        # ----------------------------------------------------

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb
        )

        timestamp_ms += 33

        result = landmarker.detect_for_video(
            mp_image,
            timestamp_ms
        )

        if result.face_landmarks:

            landmarks = result.face_landmarks[0]

            left_ear = calculate_ear(
                landmarks,
                LEFT_EYE,
                width,
                height
            )

            right_ear = calculate_ear(
                landmarks,
                RIGHT_EYE,
                width,
                height
            )

            ear = (left_ear + right_ear) / 2.0

            # -----------------------------------------------
            # Blink state machine
            # -----------------------------------------------

            if ear < EAR_THRESHOLD:

                eyes_closed = True

                liveness_text = "Eyes Closed"

            else:

                liveness_text = "Eyes Open"

                if eyes_closed:

                    blink_count += 1

                    blink_verified = True

                    eyes_closed = False

                    print(
                        f"👁️ BLINK VERIFIED! "
                        f"Total: {blink_count}"
                    )

        else:

            ear = 0.0
            liveness_text = "No landmarks"

    else:

        name = "No Face"
        distance = 1.0
        ear = 0.0
        liveness_text = "No Face"

    # ========================================================
    # DISPLAY
    # ========================================================

    cv2.putText(
        frame,
        f"Identity: {name}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Distance: {distance:.3f}",
        (20, 75),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"EAR: {ear:.3f}",
        (20, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Liveness: {liveness_text}",
        (20, 145),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    # --------------------------------------------------------
    # Verification status
    # --------------------------------------------------------

    if name != "Unknown" and name != "No Face":

        if blink_verified:

            verification = "VERIFIED - LIVE"

        else:

            verification = "WAITING FOR BLINK"

    else:

        verification = "NOT VERIFIED"

    cv2.putText(
        frame,
        verification,
        (20, 185),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (0, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Blinks: {blink_count}",
        (20, 225),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 255),
        2
    )

    # ========================================================
    # SHOW
    # ========================================================

    cv2.imshow(
        window_name,
        frame
    )

    # ========================================================
    # QUIT
    # ========================================================

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q") or key == ord("Q") or key == 27:
        break

    try:

        if cv2.getWindowProperty(
            window_name,
            cv2.WND_PROP_VISIBLE
        ) < 1:

            break

    except cv2.error:

        break


# ============================================================
# CLEANUP
# ============================================================

cap.release()

cv2.destroyAllWindows()

landmarker.close()

print()
print("=" * 60)
print("SmartAttend test stopped.")
print(f"Total blinks: {blink_count}")
print("=" * 60)
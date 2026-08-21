import cv2
import mediapipe as mp
import numpy as np

# ============================================================
# MediaPipe Face Landmarker
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
# Eye landmarks
# ============================================================

# MediaPipe Face Landmarker eye landmark indices
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
# Blink detection settings
# ============================================================

EAR_THRESHOLD = 0.21

eyes_closed = False
blink_count = 0

# ============================================================
# Camera
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open camera.")
    raise SystemExit

window_name = "SmartAttend - Blink Test"

cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

print("=" * 55)
print("SmartAttend - Blink Detection Test")
print("=" * 55)
print("Blink naturally in front of the camera.")
print("Press Q or ESC to quit.")
print()

frame_timestamp_ms = 0


# ============================================================
# Main loop
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:
        print("❌ Could not read camera frame.")
        break

    height, width = frame.shape[:2]

    # OpenCV BGR → RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # MediaPipe image
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb
    )

    frame_timestamp_ms += 33

    # Detect landmarks
    result = landmarker.detect_for_video(
        mp_image,
        frame_timestamp_ms
    )

    status = "NO FACE"

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

        # ----------------------------------------------------
        # Blink state machine
        # ----------------------------------------------------

        if ear < EAR_THRESHOLD:

            status = "EYES CLOSED"

            if not eyes_closed:
                eyes_closed = True

        else:

            status = "EYES OPEN"

            # CLOSED → OPEN = one blink
            if eyes_closed:

                blink_count += 1
                eyes_closed = False

                print(
                    f"👁️ BLINK DETECTED! "
                    f"Total: {blink_count}"
                )

        # ----------------------------------------------------
        # Draw EAR
        # ----------------------------------------------------

        cv2.putText(
            frame,
            f"EAR: {ear:.3f}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

    # ========================================================
    # Display
    # ========================================================

    cv2.putText(
        frame,
        status,
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    cv2.putText(
        frame,
        f"Blinks: {blink_count}",
        (20, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 255),
        2
    )

    cv2.imshow(window_name, frame)

    # Quit
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
# Cleanup
# ============================================================

cap.release()
cv2.destroyAllWindows()
landmarker.close()

print()
print("✅ Blink detection stopped.")
print(f"Total blinks detected: {blink_count}")
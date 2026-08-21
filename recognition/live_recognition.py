import cv2
import pickle
import numpy as np
from deepface import DeepFace

# ============================================================
# CONFIGURATION
# ============================================================

EMBEDDINGS_FILE = "embeddings.pkl"
MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "opencv"

# Lower distance = more similar
RECOGNITION_THRESHOLD = 0.68

# ============================================================
# LOAD ENROLLED EMBEDDINGS
# ============================================================

print("Loading enrolled face embeddings...")

with open(EMBEDDINGS_FILE, "rb") as file:
    enrolled_data = pickle.load(file)

print(f"Loaded {len(enrolled_data)} embeddings.")

# ============================================================
# HELPER FUNCTION
# ============================================================

def cosine_distance(embedding1, embedding2):
    """
    Calculate cosine distance between two face embeddings.
    Lower value = more similar faces.
    """

    embedding1 = np.array(embedding1)
    embedding2 = np.array(embedding2)

    similarity = np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )

    return 1 - similarity


# ============================================================
# OPEN CAMERA
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open camera.")
    exit()

window_name = "SmartAttend - Live Recognition"

cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

print("\n======================================")
print("SmartAttend Live Recognition")
print("======================================")
print("Press Q or ESC to quit.")
print("You can also close the window using X.\n")

# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:
        print("❌ Failed to read camera frame.")
        break

    # --------------------------------------------------------
    # Detect faces using OpenCV
    # --------------------------------------------------------

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades +
        "haarcascade_frontalface_default.xml"
    )

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80)
    )

    # --------------------------------------------------------
    # Process every detected face
    # --------------------------------------------------------

    for (x, y, w, h) in faces:

        # Extract face region
        face_crop = frame[y:y+h, x:x+w]

        try:

            # Generate ArcFace embedding
            result = DeepFace.represent(
                img_path=face_crop,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False
            )

            live_embedding = result[0]["embedding"]

            # ------------------------------------------------
            # Compare with enrolled embeddings
            # ------------------------------------------------

            best_match = "Unknown"
            best_distance = float("inf")

            for enrolled in enrolled_data:

                distance = cosine_distance(
                    live_embedding,
                    enrolled["embedding"]
                )

                if distance < best_distance:
                    best_distance = distance
                    best_match = enrolled["name"]

            # ------------------------------------------------
            # Apply recognition threshold
            # ------------------------------------------------

            if best_distance <= RECOGNITION_THRESHOLD:

                recognized_name = best_match

                label = f"{recognized_name} ({best_distance:.2f})"

            else:

                recognized_name = "Unknown"

                label = f"Unknown ({best_distance:.2f})"

            # ------------------------------------------------
            # Draw result
            # ------------------------------------------------

            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 255, 0),
                2
            )

            cv2.putText(
                frame,
                label,
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

        except Exception as e:

            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 0, 255),
                2
            )

            cv2.putText(
                frame,
                "Recognition Error",
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )

            print("Recognition error:", e)

    # --------------------------------------------------------
    # Display frame
    # --------------------------------------------------------

    cv2.imshow(window_name, frame)

    # --------------------------------------------------------
    # Keyboard controls
    # --------------------------------------------------------

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q") or key == ord("Q") or key == 27:
        print("\nExiting...")
        break

    # --------------------------------------------------------
    # Check if window was closed
    # --------------------------------------------------------

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

print("✅ Camera released.")
print("✅ SmartAttend recognition stopped.")
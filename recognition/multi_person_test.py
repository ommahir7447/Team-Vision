from deepface import DeepFace
import os

DATASET_DIR = "dataset"

# Collect all enrolled images
enrolled_images = []

for person_name in os.listdir(DATASET_DIR):

    person_folder = os.path.join(DATASET_DIR, person_name)

    if not os.path.isdir(person_folder):
        continue

    for image_name in os.listdir(person_folder):

        image_path = os.path.join(person_folder, image_name)

        if image_name.lower().endswith((".jpg", ".jpeg", ".png")):
            enrolled_images.append(
                {
                    "name": person_name,
                    "path": image_path
                }
            )

print(f"\nLoaded {len(enrolled_images)} enrollment images.")

# ------------------------------------------------
# Test every enrolled image against every other
# ------------------------------------------------

for test_image in enrolled_images:

    print("\n" + "=" * 60)
    print("TEST IMAGE:", test_image["path"])
    print("=" * 60)

    best_match = None
    best_distance = float("inf")

    for enrolled in enrolled_images:

        # Don't compare an image with itself
        if test_image["path"] == enrolled["path"]:
            continue

        try:
            result = DeepFace.verify(
                img1_path=test_image["path"],
                img2_path=enrolled["path"],
                model_name="ArcFace",
                detector_backend="opencv",
                enforce_detection=True
            )

            distance = result["distance"]

            print(
                f"{test_image['name']} → "
                f"{enrolled['name']} | "
                f"Distance: {distance:.4f} | "
                f"Verified: {result['verified']}"
            )

            if distance < best_distance:
                best_distance = distance
                best_match = enrolled["name"]

        except Exception as e:
            print(f"❌ Error comparing {enrolled['path']}: {e}")

    print("\n🏆 BEST MATCH:")
    print("Predicted:", best_match)
    print("Actual:   ", test_image["name"])
    print("Distance:", round(best_distance, 4))

    if best_match == test_image["name"]:
        print("✅ CORRECT")
    else:
        print("❌ INCORRECT")
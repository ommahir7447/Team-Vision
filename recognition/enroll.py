from deepface import DeepFace
import os
import pickle

DATASET_DIR = "dataset"
OUTPUT_FILE = "embeddings.pkl"

embeddings_data = []

for person_name in os.listdir(DATASET_DIR):

    person_folder = os.path.join(DATASET_DIR, person_name)

    if not os.path.isdir(person_folder):
        continue

    print(f"\nProcessing: {person_name}")

    for image_name in os.listdir(person_folder):

        if not image_name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue

        image_path = os.path.join(person_folder, image_name)

        try:
            result = DeepFace.represent(
                img_path=image_path,
                model_name="ArcFace",
                detector_backend="opencv",
                enforce_detection=True
            )

            embedding = result[0]["embedding"]

            embeddings_data.append({
                "name": person_name,
                "image": image_name,
                "embedding": embedding
            })

            print(f"  ✅ {image_name} → embedding generated")

        except Exception as e:
            print(f"  ❌ {image_name} → {e}")

with open(OUTPUT_FILE, "wb") as file:
    pickle.dump(embeddings_data, file)

print("\n======================================")
print("Enrollment completed!")
print(f"Total embeddings: {len(embeddings_data)}")
print(f"Saved to: {OUTPUT_FILE}")
print("======================================")
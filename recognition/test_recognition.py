from deepface import DeepFace

result = DeepFace.represent(
    img_path="test_image.jpeg",
    model_name="ArcFace",
    detector_backend="opencv"
)

print("Number of faces detected:", len(result))

for face in result:
    print("Embedding length:", len(face["embedding"]))
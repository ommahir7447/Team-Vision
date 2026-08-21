from deepface import DeepFace

result = DeepFace.verify(
    img1_path="test_image_1.jpeg",
    img2_path="test_image_2.jpeg",
    model_name="ArcFace",
    detector_backend="opencv"
)

print("\n========== FACE VERIFICATION ==========")

print("Same person:", result["verified"])
print("Distance:", result["distance"])
print("Threshold:", result["threshold"])
print("Model:", result["model"])

print("=======================================")
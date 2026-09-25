import os, time, itertools
import numpy as np
from deepface import DeepFace
from sklearn.metrics import roc_curve
from sklearn.datasets import fetch_lfw_people
from PIL import Image

# ============================================================
# 1. DATASET SETUP
# ============================================================
lfw = fetch_lfw_people(min_faces_per_person=20, resize=1.0, color=True)
out_dir = "lfw_faces"
os.makedirs(out_dir, exist_ok=True)
for idx, (img, label) in enumerate(zip(lfw.images, lfw.target)):
    person_dir = os.path.join(out_dir, str(label))
    os.makedirs(person_dir, exist_ok=True)
    Image.fromarray((img * 255).astype("uint8")).save(f"{person_dir}/{idx}.jpg")

# ============================================================
# 2. BUILD GENUINE + IMPOSTOR PAIRS
# ============================================================
people = os.listdir(out_dir)
pairs, labels = [], []
for p in people:
    imgs = [os.path.join(out_dir, p, f) for f in os.listdir(os.path.join(out_dir, p))]
    for a, b in itertools.combinations(imgs[:5], 2):
        pairs.append((a, b)); labels.append(1)
for p1, p2 in itertools.islice(itertools.combinations(people, 2), 200):
    imgs1 = os.listdir(os.path.join(out_dir, p1))
    imgs2 = os.listdir(os.path.join(out_dir, p2))
    if imgs1 and imgs2:
        pairs.append((os.path.join(out_dir, p1, imgs1[0]), os.path.join(out_dir, p2, imgs2[0])))
        labels.append(0)

print(f"Total pairs: {len(pairs)} (genuine: {sum(labels)}, impostor: {len(labels)-sum(labels)})")

# ============================================================
# 3. HELPER: EER + optimal-threshold accuracy
# ============================================================
def eer_and_accuracy(similarities, labels):
    fpr, tpr, thresholds = roc_curve(labels, similarities)
    fnr = 1 - tpr
    idx = np.nanargmin(np.abs(fnr - fpr))
    eer = fpr[idx]
    best_threshold = thresholds[idx]
    accuracy = np.mean([(sim > best_threshold) == lbl for sim, lbl in zip(similarities, labels)])
    return eer, accuracy, best_threshold

# ============================================================
# 4. BASELINE: 5 MODELS
# ============================================================
models = ["ArcFace", "Facenet512", "VGG-Face", "SFace", "Dlib"]
results = {}
raw_distances = {}   # keep these — Option A reuses them, no need to recompute

for model in models:
    distances, times = [], []
    for img1, img2 in pairs:
        t0 = time.time()
        try:
            r = DeepFace.verify(img1, img2, model_name=model, enforce_detection=False)
            distances.append(r["distance"])
        except Exception as e:
            print(f"{model} failed on a pair: {e}")
            distances.append(1.0)
        times.append(time.time() - t0)

    raw_distances[model] = np.array(distances)
    similarities = 1 - raw_distances[model]
    eer, accuracy, _ = eer_and_accuracy(similarities, labels)

    results[model] = {
        "EER": round(eer, 4),
        "Accuracy": round(accuracy, 4),
        "Avg_inference_time_s": round(np.mean(times), 4),
    }

print("\n=== Baseline Results (5 models) ===")
for model, r in results.items():
    print(model, r)

# ============================================================
# 5. OPTION A: NORMALIZED FUSION (Facenet512 + Dlib)
# ============================================================
def normalized_fusion_eer(d1, d2, labels):
    d1n = (d1 - d1.mean()) / d1.std()
    d2n = (d2 - d2.mean()) / d2.std()
    best_weight, best_eer, best_acc = None, 1.0, None
    for w in np.arange(0, 1.05, 0.1):
        fused = w * d1n + (1 - w) * d2n
        sims = -fused
        eer, accuracy, _ = eer_and_accuracy(sims, labels)
        if eer < best_eer:
            best_eer, best_weight, best_acc = eer, w, accuracy
    return best_weight, best_eer, best_acc

fusion_weight, fusion_eer, fusion_acc = normalized_fusion_eer(
    raw_distances["Facenet512"], raw_distances["Dlib"], labels
)
print("\n=== Option A: Normalized Fusion (Facenet512 + Dlib) ===")
print({"Best_weight": fusion_weight, "EER": round(fusion_eer, 4), "Accuracy": round(fusion_acc, 4)})

# ============================================================
# 6. OPTION B: CASCADE (SFace -> Facenet512)
# ============================================================
def cascade_verify(img1, img2, fast_model="SFace", accurate_model="Facenet512", certainty_margin=0.05):
    fast = DeepFace.verify(img1, img2, model_name=fast_model, enforce_detection=False)
    if abs(fast["distance"] - fast["threshold"]) > certainty_margin:
        return fast["distance"], fast_model
    accurate = DeepFace.verify(img1, img2, model_name=accurate_model, enforce_detection=False)
    return accurate["distance"], accurate_model

cascade_distances, used_models, cascade_times = [], [], []
for img1, img2 in pairs:
    t0 = time.time()
    dist, used = cascade_verify(img1, img2, fast_model="SFace", accurate_model="Facenet512", certainty_margin=0.05)
    cascade_times.append(time.time() - t0)
    cascade_distances.append(dist)
    used_models.append(used)

cascade_similarities = 1 - np.array(cascade_distances)
cascade_eer, cascade_acc, _ = eer_and_accuracy(cascade_similarities, labels)
escalation_rate = np.mean([m == "Facenet512" for m in used_models])

cascade_result = {
    "EER": round(cascade_eer, 4),
    "Accuracy": round(cascade_acc, 4),
    "Avg_inference_time_s": round(np.mean(cascade_times), 4),
    "Escalation_rate": round(escalation_rate, 4),
}
print("\n=== Option B: Cascade (SFace -> Facenet512) ===")
print(cascade_result)

# ============================================================
# 7. FINAL SUMMARY TABLE
# ============================================================
print("\n=== FINAL COMPARISON ===")
for model, r in results.items():
    print(f"{model:12s} EER={r['EER']:.4f}  Acc={r['Accuracy']:.4f}  Time={r['Avg_inference_time_s']:.4f}s")
print(f"{'Fusion(A)':12s} EER={fusion_eer:.4f}  Acc={fusion_acc:.4f}  (weight={fusion_weight})")
print(f"{'Cascade(B)':12s} EER={cascade_eer:.4f}  Acc={cascade_acc:.4f}  Time={np.mean(cascade_times):.4f}s  Escalation={escalation_rate:.2f}")

speedup = results["Facenet512"]["Avg_inference_time_s"] / cascade_result["Avg_inference_time_s"]
print(f"\nCascade is {speedup:.2f}x faster than running Facenet512 on every pair")

# ============================================================
# CASCADE MARGIN SWEEP — find the actual sweet spot
# ============================================================
def run_cascade(fast_model, accurate_model, margin):
    distances, used_models, times = [], [], []
    for img1, img2 in pairs:
        t0 = time.time()
        dist, used = cascade_verify(img1, img2, fast_model=fast_model, accurate_model=accurate_model, certainty_margin=margin)
        times.append(time.time() - t0)
        distances.append(dist)
        used_models.append(used)
    sims = 1 - np.array(distances)
    eer, acc, _ = eer_and_accuracy(sims, labels)
    escalation = np.mean([m == accurate_model for m in used_models])
    return {
        "fast_model": fast_model, "margin": margin,
        "EER": round(eer, 4), "Accuracy": round(acc, 4),
        "Avg_time_s": round(np.mean(times), 4), "Escalation_rate": round(escalation, 4),
    }

print("\n=== Cascade Margin Sweep ===")
for fast_model in ["SFace", "Dlib", "ArcFace"]:          # try stronger "fast" candidates too
    for margin in [0.05, 0.10, 0.15, 0.20, 0.30]:
        r = run_cascade(fast_model, "Facenet512", margin)
        print(r)
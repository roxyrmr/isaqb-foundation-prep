# iSAQB CPSA-F exam configuration — 2025.1 curriculum structure
# Weights based on training-time proportions (LG-06 Examples is not exam-relevant)
# Keep in sync with frontend/src/engine.ts → CHAPTER_WEIGHTS

CPSA_F_WEIGHTS: dict[str, float] = {
    "LG-01": 0.10,  # Basic Concepts of Software Architecture          (120 min)
    "LG-02": 0.20,  # Requirements and Constraints                     (180 min)
    "LG-03": 0.35,  # Design and Development of Software Architectures  (360 min)
    "LG-04": 0.25,  # Specification and Communication                  (240 min)
    "LG-05": 0.10,  # Analysis and Assessment of Software Architectures  (90 min)
    # LG-06 Examples (90 min) — R3 only, excluded from exam sampling
}

EXAM_MIN_COUNT = 32
EXAM_MAX_COUNT = 44
EXAM_DEFAULT_COUNT = 40

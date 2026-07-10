from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from keras.models import load_model
import numpy as np
from PIL import Image
import io
import os

app = FastAPI()

# ✅ CORS (allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIX MODEL PATH (important for Render)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_models", "my_model.keras")

# ✅ Load model safely
MODEL = load_model(MODEL_PATH)

# ✅ Class names
CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]

# ✅ Prediction API
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image = await file.read()

    image = Image.open(io.BytesIO(image)).convert("RGB")
    image = image.resize((256, 256))
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)

    predictions = MODEL.predict(image)

    predicted_class = CLASS_NAMES[np.argmax(predictions[0])]
    confidence = float(np.max(predictions[0]))

    return {
        "class": predicted_class,
        "confidence": confidence
    }
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = FastAPI()

# ✅ CORS FIX (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Load your trained model
MODEL = tf.keras.models.load_model("../saved_models/my_model.keras")

# ✅ Class names (change if needed)
CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]

# ✅ Prediction API
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image = await file.read()

    image = Image.open(io.BytesIO(image)).resize((256, 256))
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)

    predictions = MODEL.predict(image)

    predicted_class = CLASS_NAMES[np.argmax(predictions[0])]
    confidence = float(np.max(predictions[0]))

    return {
        "class": predicted_class,
        "confidence": confidence
    }
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import io
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLASS_NAMES = ["Early Blight", "Late Blight", "Healthy"]

@app.get("/")
def home():
    return {"message": "LeafGuard AI is running 🚀"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image = await file.read()
    img = Image.open(io.BytesIO(image)).resize((256, 256))
    img = np.array(img) / 255.0

    # TEMP AI (we replace later with real model)
    predicted_class = random.choice(CLASS_NAMES)
    confidence = round(random.uniform(0.7, 0.99), 2)

    return {
        "class": predicted_class,
        "confidence": confidence
    }
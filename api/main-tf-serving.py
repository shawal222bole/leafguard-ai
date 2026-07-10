from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
from io import BytesIO
from PIL import Image
import requests

app = FastAPI()

# ✅ CORS (only needed if frontend is used)
origins = [
    "http://localhost",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ TF Serving endpoint
endpoint = "http://localhost:8501/v1/models/potato:predict"

# ✅ MUST match training
CLASS_NAMES = [
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy'
]


@app.get("/ping")
async def ping():
    return "API is working 🚀"


# ✅ FIXED PREPROCESSING (MOST IMPORTANT PART)
def read_file_as_image(data):
    image = Image.open(BytesIO(data)).convert("RGB")
    image = image.resize((256, 256))  # same as training
    image = np.asarray(image).astype("float32") / 255.0  # normalization
    return image


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read image
    image = read_file_as_image(await file.read())
    img_batch = np.expand_dims(image, axis=0)

    # Send to TF Serving
    json_data = {
        "instances": img_batch.tolist()
    }

    response = requests.post(endpoint, json=json_data)

    # Convert response
    predictions = np.array(response.json()["predictions"][0])

    # DEBUG (optional but useful)
    print("RAW:", predictions)

    predicted_class = CLASS_NAMES[np.argmax(predictions)]
    confidence = float(np.max(predictions))

    return {
        "class": predicted_class,
        "confidence": confidence
    }


# Optional run directly
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
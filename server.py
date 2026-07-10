import tensorflow as tf
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

model = tf.keras.models.load_model("saved_models/my_model.keras")

@app.route("/v1/models/potato:predict", methods=["POST"])
def predict():
    data = request.get_json()
    instances = np.array(data["instances"])

    preds = model.predict(instances)

    return jsonify({
        "predictions": preds.tolist()
    })

if __name__ == "__main__":
    app.run(port=8501)
from datetime import datetime

import pandas as pd
import numpy as np
import xgboost as xgb
from flask import Flask, jsonify, request

app = Flask(__name__)

# Load model at startup
model = xgb.Booster()
model.load_model("xgb_predictor.json")

def dew_point(temp, humidity_percent):
    a = 17.2
    b = 237.7

    alpha = (
        ((a * temp) / (b + temp))
        + np.log(humidity_percent / 100.0)
    )

    return (b * alpha) / (a - alpha)


def build_features(temperature, humidity):
    now = datetime.now()

    day_of_year = now.timetuple().tm_yday
    minutes = now.hour * 60 + now.minute

    day_sin = np.sin(2 * np.pi * day_of_year / 365)
    day_cos = np.cos(2 * np.pi * day_of_year / 365)

    time_sin = np.sin(2 * np.pi * minutes / 1440)
    time_cos = np.cos(2 * np.pi * minutes / 1440)

    dew_diff = (
        temperature
        - dew_point(temperature, humidity)
    )

    return pd.DataFrame(
        {
            "Temperature Middle": [temperature],
            "Humidity Middle": [humidity],
            "Day Sin": [day_sin],
            "Day Cos": [day_cos],
            "Time Sin": [time_sin],
            "Time Cos": [time_cos],
            "Dew Difference": [dew_diff],
        }
    )


def interpolate_prediction(
    current_temp,
    current_humidity,
    future_temp,
    future_humidity,
    minutes_ahead
):

    # Clamp between 0 and 60 minutes
    ratio = max(0.0, min(minutes_ahead / 60.0, 1.0))

    predicted_temp = (
        current_temp +
        (future_temp - current_temp) * ratio
    )

    predicted_humidity = (
        current_humidity +
        (future_humidity - current_humidity) * ratio
    )

    return predicted_temp, predicted_humidity


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if data is None:
            return jsonify({
                "error": "Missing JSON body"
            }), 400

        temperature = float(data["temperature"])
        humidity = float(data["humidity"])
        time_minutes = float(data["time_minutes"])

        X = build_features(
            temperature=temperature,
            humidity=humidity
        )

        dmatrix = xgb.DMatrix(
            X,
            feature_names=list(X.columns)
        )

        prediction = model.predict(dmatrix)

        future_temp = float(prediction[0][0])
        future_humidity = float(prediction[0][1])

        predicted_temp, predicted_humidity = interpolate_prediction(
            current_temp=temperature,
            current_humidity=humidity,
            future_temp=future_temp,
            future_humidity=future_humidity,
            minutes_ahead=time_minutes
        )

        return jsonify({
            "requested_minutes": time_minutes,
            "temperature": round(predicted_temp, 3),
            "humidity": round(predicted_humidity, 0)
        })

    except KeyError as e:
        return jsonify({
            "error": f"Missing field: {str(e)}"
        }), 400

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
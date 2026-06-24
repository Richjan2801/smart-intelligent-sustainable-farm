import os
import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import psycopg2
import xgboost as xgb
from flask import Flask, jsonify, request

app = Flask(__name__)

# ── Load model at startup ─────────────────────────────────────────────────────

model = xgb.Booster()
model.load_model("xgb_predictor.json")

# ── Database connection ───────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():
    """Create a new database connection using DATABASE_URL."""
    return psycopg2.connect(DATABASE_URL)


# ── In-memory cache (TTL = 15 minutes) ────────────────────────────────────────

CACHE_TTL_SECONDS = 15 * 60
_cache = {}


def get_cached(horizon):
    """Return cached forecast data if still valid, else None."""
    entry = _cache.get(horizon)
    if entry and (time.time() - entry["timestamp"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None


def set_cached(horizon, data):
    """Store forecast data in cache with current timestamp."""
    _cache[horizon] = {
        "data": data,
        "timestamp": time.time(),
    }


# ── Helper functions ──────────────────────────────────────────────────────────

def dew_point(temp, humidity_percent):
    a = 17.2
    b = 237.7

    alpha = (
        ((a * temp) / (b + temp))
        + np.log(humidity_percent / 100.0)
    )

    return (b * alpha) / (a - alpha)


def build_features(temperature, humidity, timestamp):
    """Build the 7-feature DataFrame that the XGBoost model expects.

    Args:
        temperature: Current temperature value.
        humidity:    Current humidity value.
        timestamp:   datetime object used to derive cyclical time features.
    """
    day_of_year = timestamp.timetuple().tm_yday
    minutes = timestamp.hour * 60 + timestamp.minute

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


# ── Database queries ──────────────────────────────────────────────────────────

def get_latest_sensor_data(count=15):
    """Fetch the latest *count* sensor readings and return their average.

    Uses count-based fetching (not time-based): the N most recent rows
    ordered by recorded_at DESC, then averages temperature and humidity.

    Returns:
        tuple (avg_temperature, avg_humidity) or None if no data.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT tem, hum
                   FROM sensor_data
                   WHERE tem IS NOT NULL
                     AND hum IS NOT NULL
                   ORDER BY recorded_at DESC
                   LIMIT %s""",
                (count,),
            )
            rows = cur.fetchall()

            if not rows:
                return None

            temps = [float(r[0]) for r in rows]
            hums = [float(r[1]) for r in rows]

            return (
                sum(temps) / len(temps),
                sum(hums) / len(hums),
            )
    finally:
        conn.close()


# ── Forecasting ───────────────────────────────────────────────────────────────

HORIZON_MAP = {
    "1d": 24,
    "3d": 72,
    "7d": 168,
    "30d": 720,
}


def forecast(hours):
    """Run iterative (rolling) forecasting for the given number of hours.

    1. Start from the average of the latest 15 sensor readings.
    2. Predict 1 hour ahead → use the prediction as input for the next step.
    3. Repeat *hours* times, collecting each prediction point.

    Returns:
        list of dicts  [{ timestamp, temperature, humidity }, ...]
    """
    sensor_data = get_latest_sensor_data(count=15)
    if sensor_data is None:
        return []

    current_temp, current_hum = sensor_data
    now = datetime.now()

    results = []

    for step in range(1, hours + 1):
        future_time = now + timedelta(hours=step)

        # Clamp humidity to valid range for dew-point calculation
        clamped_hum = max(1.0, min(current_hum, 100.0))

        X = build_features(
            temperature=current_temp,
            humidity=clamped_hum,
            timestamp=future_time,
        )

        dmatrix = xgb.DMatrix(
            X,
            feature_names=list(X.columns),
        )

        prediction = model.predict(dmatrix)

        current_temp = float(prediction[0][0])
        current_hum = float(prediction[0][1])

        # Clamp to reasonable physical ranges
        current_temp = max(-10.0, min(current_temp, 60.0))
        current_hum = max(0.0, min(current_hum, 100.0))

        results.append({
            "timestamp": future_time.isoformat(),
            "temperature": round(current_temp, 2),
            "humidity": round(current_hum, 1),
        })

    return results


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy"
    })


@app.route("/forecast", methods=["GET"])
def forecast_endpoint():
    """Multi-day forecast endpoint.

    Query params:
        horizon: 1d | 3d | 7d | 30d  (default: 1d)

    Returns JSON:
        { status, horizon, cached, count, data: [{ timestamp, temperature, humidity }] }
    """
    try:
        horizon = request.args.get("horizon", "1d")

        if horizon not in HORIZON_MAP:
            return jsonify({
                "error": f"Invalid horizon '{horizon}'. "
                         f"Valid options: {', '.join(HORIZON_MAP.keys())}"
            }), 400

        # Check cache first
        cached = get_cached(horizon)
        if cached is not None:
            return jsonify({
                "status": "ok",
                "horizon": horizon,
                "cached": True,
                "count": len(cached),
                "data": cached,
            })

        # Run forecast
        hours = HORIZON_MAP[horizon]
        results = forecast(hours)

        if not results:
            return jsonify({
                "status": "no_data",
                "message": "No sensor data available for forecasting",
                "data": [],
            })

        # Cache the results
        set_cached(horizon, results)

        return jsonify({
            "status": "ok",
            "horizon": horizon,
            "cached": False,
            "count": len(results),
            "data": results,
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


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
            humidity=humidity,
            timestamp=datetime.now(),
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
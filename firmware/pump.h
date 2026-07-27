#pragma once
#include <Arduino.h>
#include "config.h"

class PumpController {
public:
    PumpController() : _pumpOn(false), _pumpStartMs(0), _lastOffMs(0), _manualOverride(false) {}

    void begin() {
        pinMode(PUMP_PIN, OUTPUT);
        digitalWrite(PUMP_PIN, LOW);
        Serial.println("[Pump] Initialized.");
    }

    void update() {
        if (!_pumpOn) return;

        if (millis() - _pumpStartMs >= PUMP_ON_DURATION) {
            off("duration elapsed");
        }
    }

    void evaluate(float temp, float hum) {
        if (_manualOverride) return; // Do not interfere with manual control

        bool shouldRun = (temp > TEMP_THRESHOLD) || (hum < HUM_THRESHOLD);

        if (shouldRun && !_pumpOn && cooldownElapsed()) {
            on(temp, hum);
        } else if (!shouldRun && _pumpOn) {
            off("conditions cleared");
        }
    }

    void trigger(bool state) {
        if (state) {
            _manualOverride = true;
            on(0, 0); // Triggered manually
        } else {
            _manualOverride = false;
            off("manual override off");
        }
    }

    bool isOn() const { return _pumpOn; }

private:
    bool          _pumpOn;
    unsigned long _pumpStartMs;
    unsigned long _lastOffMs;
    bool          _manualOverride;

    void on(float temp, float hum) {
        _pumpOn      = true;
        _pumpStartMs = millis();
        digitalWrite(PUMP_PIN, HIGH);
        if (_manualOverride) {
            Serial.println("[Pump] ON — Manual Trigger");
        } else {
            Serial.printf("[Pump] ON — Temp: %.1f°C (thr: %.1f), Hum: %.1f%% (thr: %.1f)\n",
                          temp, (float)TEMP_THRESHOLD, hum, (float)HUM_THRESHOLD);
        }
    }

    void off(const char* reason) {
        _pumpOn    = false;
        _lastOffMs = millis();
        _manualOverride = false; // Reset manual override on any off event
        digitalWrite(PUMP_PIN, LOW);
        Serial.printf("[Pump] OFF — %s\n", reason);
    }

    bool cooldownElapsed() const {
        return (_lastOffMs == 0) || (millis() - _lastOffMs >= PUMP_COOLDOWN);
    }
};
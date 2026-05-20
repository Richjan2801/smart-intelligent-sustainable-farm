#pragma once
#include <Arduino.h>
#include "config.h"

class PumpController {
public:
    PumpController() : _pumpOn(false), _pumpStartMs(0), _lastOffMs(0) {}

    void begin() {
        pinMode(PUMP_PIN, OUTPUT);
        digitalWrite(PUMP_PIN, LOW);
        Serial.println("[Pump] Initialized.");
    }

    // Dipanggil setiap loop() — mengelola auto-off berdasarkan durasi
    void update() {
        if (!_pumpOn) return;

        if (millis() - _pumpStartMs >= PUMP_ON_DURATION) {
            off("duration elapsed");
        }
    }

    // Dipanggil setelah baca sensor — cek kondisi dan nyalakan jika perlu
    void evaluate(float temp, float hum) {
        bool shouldRun = (temp > TEMP_THRESHOLD) || (hum < HUM_THRESHOLD);

        if (shouldRun && !_pumpOn && cooldownElapsed()) {
            on(temp, hum);
        } else if (!shouldRun && _pumpOn) {
            off("conditions cleared");
        }
    }

    bool isOn() const { return _pumpOn; }

private:
    bool          _pumpOn;
    unsigned long _pumpStartMs;
    unsigned long _lastOffMs;

    void on(float temp, float hum) {
        _pumpOn      = true;
        _pumpStartMs = millis();
        digitalWrite(PUMP_PIN, HIGH);
        Serial.printf("[Pump] ON — Temp: %.1f°C (thr: %.1f), Hum: %.1f%% (thr: %.1f)\n",
                      temp, (float)TEMP_THRESHOLD, hum, (float)HUM_THRESHOLD);
    }

    void off(const char* reason) {
        _pumpOn    = false;
        _lastOffMs = millis();
        digitalWrite(PUMP_PIN, LOW);
        Serial.printf("[Pump] OFF — %s\n", reason);
    }

    bool cooldownElapsed() const {
        // Pertama kali (_lastOffMs == 0) langsung boleh nyala
        return (_lastOffMs == 0) || (millis() - _lastOffMs >= PUMP_COOLDOWN);
    }
};
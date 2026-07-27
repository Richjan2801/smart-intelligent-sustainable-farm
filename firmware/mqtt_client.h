#pragma once
#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "buffer.h"

class MqttClient {
public:
    MqttClient() : _wifiClient(), _client(_wifiClient) {}

    void begin() {
        _wifiClient.setCACert(MQTT_CA_CERT);
        _client.setServer(MQTT_HOST, MQTT_PORT);
        _client.setBufferSize(512);
    }

    bool isConnected() { return _client.connected(); }
    void loop()        { _client.loop(); }
    void setCallback(MQTT_CALLBACK_SIGNATURE) { _client.setCallback(callback); }

    bool subscribe(const char* topic) {
        if (!_client.connected()) return false;
        bool ok = _client.subscribe(topic, 1);
        Serial.printf("[MQTT] Subscribe to %s: %s\n", topic, ok ? "OK" : "FAILED");
        return ok;
    }

    bool connect() {
        if (_client.connected()) return true;
        Serial.print("[MQTT] Connecting (TLS)... ");
        bool ok = _client.connect("ESP32_SISF", MQTT_USERNAME, MQTT_PASSWORD);
        Serial.println(ok ? "OK" : "FAILED");
        return ok;
    }

    bool publish(const SensorPayload& p, bool buffered = false) {
        if (!_client.connected()) return false;

        // Compute the real wall-clock time when data was captured.
        unsigned long ageMs = millis() - p.capturedAtMs;
        long long recordedEpoch = (long long)time(nullptr) - (long long)(ageMs / 1000);

        JsonDocument doc;
        doc["temperature"]      = p.temperature;
        doc["humidity"]         = p.humidity;
        doc["pump_on"]          = p.pumpOn;
        doc["offline_buffered"] = buffered;
        doc["recorded_at"]      = recordedEpoch;

        char buf[256];
        size_t len = serializeJson(doc, buf);

        bool ok = _client.publish(MQTT_TOPIC, (uint8_t*)buf, len, false);
        if (ok) Serial.printf("[MQTT] Published: %s\n", buf);
        else    Serial.println("[MQTT] Publish FAILED — akan di-buffer");
        return ok;
    }

private:
    WiFiClientSecure _wifiClient;
    PubSubClient     _client;
};
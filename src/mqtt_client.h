#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "buffer.h"

class MqttClient {
public:
    MqttClient() : _wifiClient(), _client(_wifiClient) {}

    void begin() {
        _client.setServer(TB_HOST, TB_PORT);
    }

    bool isConnected() {
        return _client.connected();
    }

    // Call in loop() to keep connection alive
    void loop() {
        _client.loop();
    }

    bool connect() {
        if (_client.connected()) return true;
        Serial.print("[MQTT] Connecting to ThingsBoard... ");
        bool ok = _client.connect("ESP32_SISF", TB_ACCESS_TOKEN, nullptr);
        Serial.println(ok ? "OK" : "FAILED");
        return ok;
    }

    bool publish(const SensorPayload& p) {
        if (!_client.connected()) return false;

        JsonDocument doc;
        doc["temperature"] = p.temperature;
        doc["humidity"]    = p.humidity;

        char buf[128];
        serializeJson(doc, buf);

        bool ok = _client.publish(TB_TOPIC, buf, false);
        if (ok) Serial.printf("[MQTT] Published: %s\n", buf);
        else    Serial.println("[MQTT] Publish failed");
        return ok;
    }

private:
    WiFiClient   _wifiClient;
    PubSubClient _client;
};
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
    }

    bool isConnected() { return _client.connected(); }

    void loop() { _client.loop(); }

    bool connect() {
        if (_client.connected()) return true;
        Serial.print("[MQTT] Connecting (TLS)... ");
        bool ok = _client.connect("ESP32_SISF", MQTT_USERNAME, MQTT_PASSWORD);
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

        bool ok = _client.publish(MQTT_TOPIC, buf, false);
        if (ok) Serial.printf("[MQTT] Published: %s\n", buf);
        else    Serial.println("[MQTT] Publish failed");
        return ok;
    }

private:
    WiFiClientSecure _wifiClient;
    PubSubClient     _client;
};
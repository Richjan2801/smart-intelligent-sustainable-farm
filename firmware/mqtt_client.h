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

    bool connect() {
        if (_client.connected()) return true;
        Serial.print("[MQTT] Connecting (TLS)... ");
        bool ok = _client.connect("ESP32_SISF", MQTT_USERNAME, MQTT_PASSWORD);
        Serial.println(ok ? "OK" : "FAILED");
        return ok;
    }

    bool publish(const SensorPayload& p, bool buffered = false) {
        if (!_client.connected()) return false;

        JsonDocument doc;
        doc["temperature"]      = p.temperature;
        doc["humidity"]         = p.humidity;
        doc["pump_on"]          = p.pumpOn;
        doc["offline_buffered"] = buffered;

        char buf[192];
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
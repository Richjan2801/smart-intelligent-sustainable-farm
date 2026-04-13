#include <Arduino.h>
#include <WiFi.h>
#include <DHT.h>
#include "config.h"
#include "buffer.h"
#include "mqtt_client.h"

DHT         dht(DHT_PIN, DHT_TYPE);
CircularBuffer buffer;
MqttClient  mqtt;

unsigned long lastReadMs    = 0;
unsigned long lastReconnect = 0;

// ── WiFi ──────────────────────────────────────────────────────────────────────

void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(WiFi.status() == WL_CONNECTED ? " Connected!" : " Failed.");
}

// ── Flush local buffer to ThingsBoard ────────────────────────────────────────

void flushBuffer() {
    if (buffer.isEmpty()) return;
    Serial.printf("[Buffer] Flushing %d buffered entries...\n", buffer.count());
    SensorPayload p;
    while (buffer.pop(p)) {
        if (!mqtt.publish(p)) {
            // Re-push on failure and stop flushing
            buffer.push(p);
            Serial.println("[Buffer] Flush interrupted, will retry.");
            break;
        }
    }
}

// ── Read sensor ───────────────────────────────────────────────────────────────

SensorPayload readSensor() {
    SensorPayload p;
    p.humidity    = dht.readHumidity();
    p.temperature = dht.readTemperature();
    p.timestamp   = millis();
    return p;
}

// ─────────────────────────────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    dht.begin();
    mqtt.begin();
    connectWiFi();
}

void loop() {
    // Keep MQTT alive
    mqtt.loop();

    // Reconnect WiFi + MQTT if needed
    if (millis() - lastReconnect > RECONNECT_DELAY_MS) {
        if (WiFi.status() != WL_CONNECTED) connectWiFi();
        if (WiFi.status() == WL_CONNECTED && !mqtt.isConnected()) {
            if (mqtt.connect()) flushBuffer();
        }
        lastReconnect = millis();
    }

    // Read sensor on interval
    if (millis() - lastReadMs < READ_INTERVAL_MS) return;
    lastReadMs = millis();

    SensorPayload p = readSensor();

    if (isnan(p.temperature) || isnan(p.humidity)) {
        Serial.println("[Sensor] Read failed.");
        return;
    }

    Serial.printf("[Sensor] Temp: %.1f°C | Hum: %.1f%%\n", p.temperature, p.humidity);

    if (mqtt.isConnected()) {
        if (!mqtt.publish(p)) buffer.push(p);
    } else {
        Serial.println("[Buffer] Offline — storing locally.");
        buffer.push(p);
        Serial.printf("[Buffer] %d/%d entries stored.\n", buffer.count(), MAX_BUFFER_SIZE);
    }
}
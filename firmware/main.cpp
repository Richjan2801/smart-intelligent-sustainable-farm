#include <Arduino.h>
#include <WiFi.h>
#include <DHT.h>
#include "config.h"
#include "buffer.h"
#include "mqtt_client.h"
#include "pump.h"

DHT            dht(DHT_PIN, DHT_TYPE);
CircularBuffer buffer;
MqttClient     mqtt;
PumpController pump;

unsigned long lastReadMs    = 0;
unsigned long lastReconnect = 0;
static bool   _flushing     = false;

void connectWiFiBlocking() {
    if (WiFi.status() == WL_CONNECTED) return;
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 5000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(WiFi.status() == WL_CONNECTED ? " Connected!" : " Failed.");
}

void flushBuffer() {
    if (buffer.isEmpty()) return;

    Serial.printf("[Buffer] Flushing %d entries...\n", buffer.count());
    _flushing = true;

    SensorPayload p;
    while (buffer.peek(p)) {
        pump.update();
        if (!mqtt.isConnected()) {
            Serial.println("[Buffer] Connection lost during flush — aborting.");
            break;
        }
        if (mqtt.publish(p, true)) {
            buffer.pop(p);
        } else {
            Serial.println("[Buffer] Flush publish failed — will retry next reconnect.");
            break;
        }
        mqtt.loop();
    }

    _flushing = false;
    Serial.printf("[Buffer] Flush done. Remaining: %d\n", buffer.count());
}

SensorPayload readSensor(bool pumpOn) {
    return {
        .temperature = dht.readTemperature(),
        .humidity    = dht.readHumidity(),
        .pumpOn      = pumpOn,
        .timestamp   = millis()
    };
}

void setup() {
    Serial.begin(115200);
    delay(2000);
    Serial.println("=== BOOTING ===");
    dht.begin();
    pump.begin();
    mqtt.begin();
    connectWiFiBlocking();
    if (WiFi.status() == WL_CONNECTED) mqtt.connect();
}

void loop() {
    pump.update();
    mqtt.loop();

    if (!_flushing && millis() - lastReconnect >= RECONNECT_DELAY_MS) {
        lastReconnect = millis();
        if (WiFi.status() != WL_CONNECTED) {
            WiFi.disconnect(true);
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            Serial.printf("[WiFi] Reconnecting to %s (non-blocking)...\n", WIFI_SSID);
        } else if (!mqtt.isConnected()) {
            if (mqtt.connect()) flushBuffer();
        }
    }

    if (millis() - lastReadMs < READ_INTERVAL_MS) return;
    lastReadMs = millis();

    SensorPayload p = readSensor(pump.isOn());

    if (isnan(p.temperature) || isnan(p.humidity)) {
        Serial.println("[Sensor] Read failed — skipping.");
        return;
    }

    pump.evaluate(p.temperature, p.humidity);
    p.pumpOn = pump.isOn();

    Serial.printf("[Sensor] Temp: %.1f°C | Hum: %.1f%% | Pump: %s\n",
                  p.temperature, p.humidity, p.pumpOn ? "ON" : "OFF");

    if (_flushing) {
        buffer.push(p);
        Serial.println("[Main] Flush in progress — queued to buffer.");
        return;
    }

    if (mqtt.isConnected()) {
        if (!mqtt.publish(p)) {
            buffer.push(p);
            Serial.println("[Main] Publish failed — buffered.");
        }
    } else {
        buffer.push(p);
        Serial.printf("[Buffer] Offline — %d/%d entries stored.\n",
                      buffer.count(), MAX_BUFFER_SIZE);
    }
}
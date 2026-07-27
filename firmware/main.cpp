#include <Arduino.h>
#include <WiFi.h>
#include <DHT.h>
#include <time.h>
#include "config.h"
#include "buffer.h"
#include "mqtt_client.h"
#include "pump.h"

DHT            dht(DHT_PIN, DHT_TYPE);
CircularBuffer buffer;
MqttClient     mqtt;
PumpController pump;

unsigned long lastReadMs    = 0 - READ_INTERVAL_MS;   // fire immediately on first loop
unsigned long lastReconnect = 0;
static bool   _flushing     = false;
static bool   _ntpSynced    = false;

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

void syncNTP() {
    if (_ntpSynced) return;
    configTime(25200, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("[NTP] Syncing time...");
    struct tm t;
    int attempts = 0;
    while (!getLocalTime(&t) && attempts < 20) {   // max ~10s wait
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (attempts < 20) {
        _ntpSynced = true;
        Serial.printf(" OK \u2014 %04d-%02d-%02d %02d:%02d:%02d WIB\n",
                      t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
                      t.tm_hour, t.tm_min, t.tm_sec);
    } else {
        Serial.println(" FAILED (will retry on next reconnect)");
    }
}

SensorPayload readSensor(bool pumpOn) {
    return {
        .temperature  = dht.readTemperature(),
        .humidity     = dht.readHumidity(),
        .pumpOn       = pumpOn,
        .capturedAtMs = millis()
    };
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("[MQTT] Message arrived on topic: %s\n", topic);
    if (strcmp(topic, "sisf/pump/control") == 0) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, payload, length);
        if (err) {
            Serial.print("[MQTT] JSON parse failed: ");
            Serial.println(err.c_str());
            return;
        }
        
        const char* action = doc["action"];
        if (action) {
            if (strcmp(action, "on") == 0) {
                pump.trigger(true);
            } else if (strcmp(action, "off") == 0) {
                pump.trigger(false);
            }
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(2000);
    Serial.println("=== BOOTING ===");
    dht.begin();
    pump.begin();
    mqtt.begin();
    connectWiFiBlocking();
    if (WiFi.status() == WL_CONNECTED) {
        syncNTP();
        mqtt.setCallback(mqttCallback);
        if (mqtt.connect()) {
            mqtt.subscribe("sisf/pump/control");
        }
    }
}

void loop() {
    pump.update();
    mqtt.loop();

    if (!_flushing && millis() - lastReconnect >= RECONNECT_DELAY_MS) {
        lastReconnect = millis();
        if (WiFi.status() != WL_CONNECTED) {
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            Serial.printf("[WiFi] Reconnecting to %s (non-blocking)...\n", WIFI_SSID);
        } else if (WiFi.status() == WL_CONNECTED && !mqtt.isConnected()) {
            // WiFi is confirmed up before attempting TLS handshake
            syncNTP();    // ensure NTP is synced before we flush buffered data
            if (mqtt.connect()) {
                mqtt.subscribe("sisf/pump/control");
                flushBuffer();
            }
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
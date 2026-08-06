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

unsigned long lastReadMs    = 0 - READ_INTERVAL_MS;
unsigned long lastDhtReadMs = 0;
unsigned long lastReconnect = 0;

static bool   _flushing        = false;
static bool   _ntpSynced       = false;
static bool   _hasValidPayload = false;

static SensorPayload _lastValidPayload = {};

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
    while (!getLocalTime(&t) && attempts < 20) {
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

bool tryReadSensor(SensorPayload& out) {
    unsigned long now = millis();

    if (lastDhtReadMs != 0 && (now - lastDhtReadMs) < DHT_MIN_INTERVAL_MS) {
        return false;
    }

    lastDhtReadMs    = now;
    out.temperature  = dht.readTemperature();
    out.humidity     = dht.readHumidity();
    out.pumpOn       = pump.isOn();
    out.capturedAtMs = now;

    return !isnan(out.temperature) && !isnan(out.humidity);
}

void publishPayload(const SensorPayload& p) {
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


// MQTT callback must stay fast: GPIO only, no DHT reads or publishes.
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("[MQTT] Message arrived on topic: %s\n", topic);
    if (strcmp(topic, MQTT_PUMP_TOPIC) != 0) return;

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) {
        Serial.print("[MQTT] JSON parse failed: ");
        Serial.println(err.c_str());
        return;
    }

    const char* action = doc["action"];
    if (!action) return;

    if (strcmp(action, "on") == 0) {
        pump.trigger(true);
    } else if (strcmp(action, "off") == 0) {
        pump.trigger(false);
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
            mqtt.subscribe(MQTT_PUMP_TOPIC);
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
            syncNTP();
            if (mqtt.connect()) {
                mqtt.subscribe(MQTT_PUMP_TOPIC);
                flushBuffer();
            }
        }
    }

    unsigned long now = millis();
    if (now - lastReadMs < READ_INTERVAL_MS) return;
    lastReadMs = now;

    SensorPayload p;
    bool freshRead = tryReadSensor(p);

    if (freshRead) {
        pump.evaluate(p.temperature, p.humidity);
        p.pumpOn          = pump.isOn();
        _lastValidPayload = p;
        _hasValidPayload  = true;
    } else if (_hasValidPayload) {
        // DHT failed temporarily — publish cached with current timestamp
        p              = _lastValidPayload;
        p.pumpOn       = pump.isOn();
        p.capturedAtMs = millis();
        Serial.println("[Sensor] DHT read failed — publishing cached values.");
    } else {
        Serial.println("[Sensor] DHT read failed, no cached data — skipping.");
        return;
    }

    Serial.printf("[Sensor] Temp: %.1f°C | Hum: %.1f%% | Pump: %s\n",
                  p.temperature, p.humidity, p.pumpOn ? "ON" : "OFF");

    publishPayload(p);
}

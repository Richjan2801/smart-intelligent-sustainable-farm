#pragma once

// Sensor
#define DHT_PIN         4
#define DHT_TYPE        DHT11

// Buffer
#define MAX_BUFFER_SIZE 50

// Timing
#define READ_INTERVAL_MS    5000   // sensor read every 5s
#define RECONNECT_DELAY_MS  5000   // wait before WiFi/MQTT reconnect attempt
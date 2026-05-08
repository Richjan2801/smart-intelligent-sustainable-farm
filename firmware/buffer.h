#pragma once
#include <Arduino.h>
#include "config.h"

struct SensorPayload {
    float         temperature;
    float         humidity;
    bool          pumpOn;
    unsigned long timestamp;
};

class CircularBuffer {
public:
    CircularBuffer() : _head(0), _tail(0), _count(0), _dropped(0) {}

    bool push(const SensorPayload& p) {
        if (isFull()) {
            _dropped++;
            Serial.printf("[Buffer] OVERWRITE — total dropped: %d\n", _dropped);
            _head = (_head + 1) % MAX_BUFFER_SIZE;
            _count--;
        }
        _buf[_tail] = p;
        _tail = (_tail + 1) % MAX_BUFFER_SIZE;
        _count++;
        return true;
    }

    bool pop(SensorPayload& out) {
        if (isEmpty()) return false;
        out   = _buf[_head];
        _head = (_head + 1) % MAX_BUFFER_SIZE;
        _count--;
        return true;
    }

    bool peek(SensorPayload& out) const {
        if (isEmpty()) return false;
        out = _buf[_head];
        return true;
    }

    bool isEmpty() const { return _count == 0; }
    bool isFull()  const { return _count == MAX_BUFFER_SIZE; }
    int  count()   const { return _count; }
    int  dropped() const { return _dropped; }

private:
    SensorPayload _buf[MAX_BUFFER_SIZE];
    int _head, _tail, _count, _dropped;
};
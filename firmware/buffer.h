#pragma once
#include <Arduino.h>
#include "config.h"

struct SensorPayload {
    float temperature;
    float humidity;
    unsigned long timestamp; // millis() at time of read
};

class CircularBuffer {
public:
    CircularBuffer() : _head(0), _tail(0), _count(0) {}

    bool push(const SensorPayload& p) {
        if (isFull()) {
            // Overwrite oldest entry
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
        out = _buf[_head];
        _head = (_head + 1) % MAX_BUFFER_SIZE;
        _count--;
        return true;
    }

    bool isEmpty() const { return _count == 0; }
    bool isFull()  const { return _count == MAX_BUFFER_SIZE; }
    int  count()   const { return _count; }

private:
    SensorPayload _buf[MAX_BUFFER_SIZE];
    int _head, _tail, _count;
};
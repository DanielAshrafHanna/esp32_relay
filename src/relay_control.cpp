#include "relay_control.h"

RelayControl::RelayControl() {
    for (int i = 0; i < NUM_RELAYS; i++) {
        relayStates[i] = false;
    }
}

void RelayControl::init() {
    for (int i = 0; i < NUM_RELAYS; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], LOW);  // Start with all relays OFF
        relayStates[i] = false;
    }
    Serial.println("Relays initialized");
}

void RelayControl::setState(int relayIndex, bool state) {
    if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
        relayStates[relayIndex] = state;
        digitalWrite(RELAY_PINS[relayIndex], state ? HIGH : LOW);
        Serial.printf("Relay %d set to %s\n", relayIndex + 1, state ? "ON" : "OFF");
    }
}

bool RelayControl::getState(int relayIndex) {
    if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
        return relayStates[relayIndex];
    }
    return false;
}

void RelayControl::toggleRelay(int relayIndex) {
    if (relayIndex >= 0 && relayIndex < NUM_RELAYS) {
        setState(relayIndex, !relayStates[relayIndex]);
    }
}

void RelayControl::allOn() {
    for (int i = 0; i < NUM_RELAYS; i++) {
        setState(i, true);
    }
}

void RelayControl::allOff() {
    for (int i = 0; i < NUM_RELAYS; i++) {
        setState(i, false);
    }
}






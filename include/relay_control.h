#ifndef RELAY_CONTROL_H
#define RELAY_CONTROL_H

#include <Arduino.h>
#include "config.h"

class RelayControl {
private:
    bool relayStates[NUM_RELAYS];
    
public:
    RelayControl();
    void init();
    void setState(int relayIndex, bool state);
    bool getState(int relayIndex);
    void toggleRelay(int relayIndex);
    void allOn();
    void allOff();
};

#endif






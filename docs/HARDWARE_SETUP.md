## PUMP SETUP
ESP32 GPIO18 ──── 100Ω ──── Gate (IRLZ44N)
ESP32 GND    ──────────────  Source (IRLZ44N)
                             Drain ──── Pump (-) 12V
12V Adapter (+) ──────────── Pump (+) 12V
12V Adapter (-) ──────────── Source (IRLZ44N)

// Flyback diode (wajib untuk inductive load / motor pump):
1N4007: Katoda → Pump (+), Anoda → Pump (-)

### Penting: Resistor 100Ω di Gate melindungi GPIO dari lonjakan arus. Diode 1N4007 wajib dipasang paralel dengan pump untuk menahan back-EMF saat pump mati — tanpa ini MOSFET bisa rusak.
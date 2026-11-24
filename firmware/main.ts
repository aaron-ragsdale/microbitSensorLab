// micro:bit Sensor Lab — V2 companion MakeCode firmware (experimental).
//
// MAKECODE SETUP:
// 1. Open makecode.microbit.org, choose micro:bit V2.
// 2. Add the Bluetooth extension (it replaces Radio).
// 3. Switch to JavaScript; paste all of this program.
// 4. Under Project Settings / Bluetooth choose "No Pairing Required"
//    for supervised classroom use, then Download and flash the HEX.
// 5. Use Chrome/Edge on the Sensor Lab GitHub Pages website.
//
// No gyroscope exists on micro:bit V2.
// BLE standard services stream accelerometer, magnetometer, compass, temperature.
// BLE UART streams light and microphone sound LEVELS (0–255), not raw audio.
// Approximate transmit period for light/sound: 200 milliseconds.
// The browser will only receive sensors that the compiled HEX exposes.

bluetooth.startAccelerometerService()
bluetooth.startMagnetometerService()
bluetooth.startTemperatureService()
bluetooth.startUartService()

basic.clearScreen()

basic.forever(function () {
    // Each packet is "LS,<light>,<sound>\n", usually less than 15 bytes.
    // micro:bit V2: input.soundLevel() is available.
    bluetooth.uartWriteLine("LS," + input.lightLevel() + "," + input.soundLevel())
    basic.pause(200)
})

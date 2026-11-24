// micro:bit Sensor Lab — V2 MakeCode firmware, Bluetooth extension required.
// Compile at https://makecode.microbit.org/ and flash the newly generated HEX.
// Choose "No Pairing Required" in MakeCode Bluetooth settings for supervised tests.
//
// Accelerometer, magnetometer and temperature: standard BLE GATT services.
// Light and sound level: Nordic UART packets "LS,<light>,<sound>\n".
// Compass heading: UART "C,<heading>\n" after compass calibration.
// Press button A to calibrate the compass, following on-screen instructions.
// The UART stream is gated on connection to avoid filling buffers beforehand.
// micro:bit V2 has no gyroscope. Microphone gives sound level, not raw audio.

bluetooth.startAccelerometerService()
bluetooth.startMagnetometerService()
bluetooth.startTemperatureService()
bluetooth.startUartService()

let bleConnected = false
let compassReady = false

bluetooth.onBluetoothConnected(function () {
    bleConnected = true
})

bluetooth.onBluetoothDisconnected(function () {
    bleConnected = false
})

input.onButtonPressed(Button.A, function () {
    input.calibrateCompass()
    compassReady = true
    basic.clearScreen()
})

basic.clearScreen()

basic.forever(function () {
    if (bleConnected) {
        // Keep packets short enough for the default BLE UART payload size.
        bluetooth.uartWriteLine("LS," + input.lightLevel() + "," + input.soundLevel())
        basic.pause(120)
        if (compassReady) {
            bluetooth.uartWriteLine("C," + input.compassHeading())
        }
    }
    basic.pause(250)
})

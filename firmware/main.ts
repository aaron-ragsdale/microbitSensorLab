// micro:bit Sensor Lab — Bluetooth sensor firmware for micro:bit V2.
// Paste in MakeCode JavaScript after adding the Bluetooth extension.
// Generate a new HEX, flash it, and reconnect in Sensor Lab.
//
// Standard BLE services: accelerometer X/Y/Z, magnetometer X/Y/Z, temperature.
// Nordic UART: light and microphone sound level, compass heading.
// The web app sends "START\n" after subscribing to UART notifications.
// The board replies "ACK\n" and begins sending "LS,light,sound" rows.
// Button A starts compass calibration. Heading follows once it finishes.
// Short UART packets fit the default BLE payload size.

bluetooth.startAccelerometerService()
bluetooth.startMagnetometerService()
bluetooth.startTemperatureService()
bluetooth.startUartService()

let bleConnected = false
let streaming = false
let compassReady = false

bluetooth.onBluetoothConnected(function () {
    bleConnected = true
    streaming = false
})

bluetooth.onBluetoothDisconnected(function () {
    bleConnected = false
    streaming = false
})

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let command = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (command == "START") {
        streaming = true
        bluetooth.uartWriteLine("ACK")
    }
})

input.onButtonPressed(Button.A, function () {
    input.calibrateCompass()
    compassReady = true
    basic.clearScreen()
})

basic.clearScreen()

basic.forever(function () {
    if (bleConnected && streaming) {
        bluetooth.uartWriteLine("LS," + input.lightLevel() + "," + input.soundLevel())
        basic.pause(150)
        if (compassReady) {
            bluetooth.uartWriteLine("C," + input.compassHeading())
        }
    }
    basic.pause(250)
})

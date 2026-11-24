// micro:bit Sensor Lab — V2 sensor-streaming firmware (experimental).
// MakeCode: add Bluetooth extension, no Radio, "No Pairing Required" for supervised testing.
// Built-in accelerometer and temperature are sent through standard BLE services.
// A single UART service sends magnetometer, compass, light and sound levels.
// This uses fewer GATT services than starting every standard sensor service.
// The Sensor Lab website handles both the older HEX and this compact protocol.
//
// Flash a newly compiled HEX before testing the UART magnetic/compass readings.
// Protocol (newline-terminated):
// M,<X>,<Y>,<Z>       magnetic force in microteslas
// C,<heading>         degrees
// LS,<light>,<sound>   0..255
// T,<temperature>     degrees C, optional fallback

bluetooth.startAccelerometerService()
bluetooth.startTemperatureService()
bluetooth.startUartService()
basic.clearScreen()

let updateCount = 0
basic.forever(function () {
    bluetooth.uartWriteLine("M," +
        input.magneticForce(Dimension.X) + "," +
        input.magneticForce(Dimension.Y) + "," +
        input.magneticForce(Dimension.Z))
    basic.pause(35)

    bluetooth.uartWriteLine("LS," + input.lightLevel() + "," + input.soundLevel())
    basic.pause(35)

    if (updateCount % 4 == 0) {
        bluetooth.uartWriteLine("C," + input.compassHeading())
        basic.pause(35)
        bluetooth.uartWriteLine("T," + input.temperature())
    }
    updateCount += 1
    basic.pause(180)
})

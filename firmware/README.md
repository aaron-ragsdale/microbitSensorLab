# micro:bit Sensor Lab firmware

This folder contains the firmware for connecting a **BBC micro:bit V2** to the [micro:bit Sensor Lab website](https://aaron-ragsdale.github.io/microbitSensorLab/).

## Files

- **[microbit-sensor_lab.hex](./microbit-sensor_lab.hex)** — precompiled firmware you can download and install on a micro:bit V2.
- **[main.ts](./main.ts)** — the MakeCode JavaScript/TypeScript source if you want to inspect, customize, or recompile the program.

## Install the HEX on a micro:bit

1. Download **[microbit-sensor_lab.hex](./microbit-sensor_lab.hex)** from this folder. On GitHub, open the file and select **Download raw file** (or use the download icon).
2. Connect your **micro:bit V2** to your computer using a USB data cable.
3. Open the official **[micro:bit WebUSB HEX Download Tool](https://microbit.org/tools/webusb-hex-download-tool/)** using a supported browser, such as Chrome or Edge.
4. Follow the tool's instructions to connect your micro:bit and select the downloaded `.hex` file to flash.
5. When installation completes, let the micro:bit restart. A blank 5×5 LED display is expected because the firmware is primarily sending sensor measurements.

**The WebUSB tool installs an existing HEX file; it does not compile `main.ts`.** You do not need to open MakeCode or edit any code when using the provided HEX.

## Open the Sensor Lab

1. Visit **[micro:bit Sensor Lab](https://aaron-ragsdale.github.io/microbitSensorLab/)**.
2. Choose **Connect micro:bit**, then select your board in the browser Bluetooth picker.
3. Choose the sensors you want to view. Explore the graphs, set threshold counters, record a trial, and export PNG images or CSV data.

The firmware is designed to expose accelerometer, magnetometer/compass, and temperature Bluetooth services and send light and microphone **sound-level** measurements through Bluetooth UART. The micro:bit V2 does not include a gyroscope, and sound level is not a raw audio recording.

## Troubleshooting

- **Board not detected over USB:** Try a USB cable that supports data, not only charging. Reconnect the board and retry the WebUSB tool.
- **Bluetooth cannot find the micro:bit:** Confirm the firmware is installed and running, that Bluetooth is enabled, and that you are using a browser with Web Bluetooth support.
- **Connected but no sensor readings:** Check the Sensor Lab's available-service status. Disconnect, reset the board once, and reconnect. If a service is missing, the firmware may need to be rebuilt in MakeCode.
- **No data for light or microphone:** These measurements require the UART streaming component in the firmware. On V2, sound readings reflect loudness only.

## Notes

The committed HEX is provided for convenience but has not yet been independently hardware-validated in this project. Test it on one board before preparing a classroom set. This firmware uses Bluetooth, **not the micro:bit Radio extension**.

For details about the full web application, see the [main project README](../README.md).

# Firmware for micro:bit Sensor Lab

This folder contains the micro:bit V2 program used by the [Sensor Lab website](https://aaron-ragsdale.github.io/microbitSensorLab/).

## Files

- [microbit-sensor_lab.hex](microbit-sensor_lab.hex) — compiled HEX for flashing onto a micro:bit.
- [main.ts](main.ts) — MakeCode JavaScript source for reviewing or recompiling the firmware.

## Flash your micro:bit

**[Open the Sensor Lab website](https://aaron-ragsdale.github.io/microbitSensorLab/)** · **[Open the WebUSB HEX Download Tool](https://microbit.org/tools/webusb-hex-download-tool/)**

1. Download the **HEX file** using the button on [Sensor Lab](https://aaron-ragsdale.github.io/microbitSensorLab/), or download `microbit-sensor_lab.hex` from this folder.
2. Connect your **micro:bit V2** to the computer using a USB data cable.
3. Open the official [micro:bit WebUSB HEX Download Tool](https://microbit.org/tools/webusb-hex-download-tool/).
4. Select the HEX file and follow the tool's instructions to flash the board.
5. Open Sensor Lab in Chrome or Edge, click **Connect micro:bit**, and select the board. Its LED screen may remain blank.

The WebUSB tool **installs a compiled HEX**. It does not compile `main.ts`. A blank micro:bit LED display can be normal for this firmware.

## Recompile the firmware in MakeCode

Open [MakeCode](https://makecode.microbit.org/), choose micro:bit V2, add the **Bluetooth extension** (not Radio), and paste [main.ts](main.ts) in JavaScript mode. Set Bluetooth to **No Pairing Required** for a supervised testing environment if necessary, then download the HEX.

The source enables these five sensor groups:
- **Accelerometer X/Y/Z** through the Bluetooth Accelerometer Service.
- **Magnetometer X/Y/Z** through the Bluetooth Magnetometer Service.
- **Temperature** through the Bluetooth Temperature Service.
- **Light level and microphone sound level** through Bluetooth UART, after the website sends `START` and the micro:bit acknowledges with `ACK`.

The website calculates acceleration **Strength** from X/Y/Z. It is optional and off by default. The website deliberately does not display compass heading; no compass calibration is required.

**Important:** Changes to `main.ts` don't update `microbit-sensor_lab.hex`. The download button at the top of the website uses that HEX file, not the MakeCode source. Replace the compiled HEX in this directory after regenerating it, so the top-of-page download remains current.

## Troubleshooting

If light and sound don't appear, check the website's UART subscription and handshake diagnostics. The site sends `START\n` after subscribing and expects `ACK\n`, then `LS,light,sound` packets. Check the uploaded HEX, Bluetooth permissions, and reconnection state. If the micro:bit doesn't appear over USB, confirm the USB cable transfers data.

The micro:bit V2 microphone provides **sound level, not raw audio**. The firmware is intended for micro:bit V2 and has no gyroscope.

## Test your setup

After flashing the full HEX and connecting the micro:bit in Sensor Lab:

1. Tilt or shake the board: **accelerometer** and calculated **Strength** should change.
2. Move/rotate the board: **magnetometer X/Y/Z** should respond.
3. Cover/uncover the LED display: **light level** should change.
4. Clap or speak near the built-in microphone: **sound level** should change.
5. **Temperature** updates more slowly and is an approximate on-board reading.

There is **no compass-heading option** and no need for compass calibration.

## Understanding UART status

The website uses standard Bluetooth services for acceleration, magnetic field, and temperature. Light and sound use UART; after subscribing to TX notifications, the browser sends `START\n`, the board replies `ACK\n`, then sends `LS,light,sound` packets.

| Website status | Likely meaning |
| --- | --- |
| `UART: not subscribed` / GATT error | The browser could not subscribe to the UART characteristic |
| `START sent` and 0 bytes | The micro:bit has not replied; check the flashed firmware |
| Bytes received but no valid packets | UART messages arrived but were not decoded |
| Handshake acknowledged and valid packets | UART streaming is working |

For the UART-only diagnostic, use a temporary MakeCode program that starts Bluetooth UART and sends fixed `LS,100,50` readings. If the site shows flat 100 and 50 readings, UART is working; flash the **full** firmware afterward.

The correct UART characteristics are **TX `6e400002` (notifications to browser)** and **RX `6e400003` (browser writes)**. Microphone readings are sound-level values, not recorded audio.

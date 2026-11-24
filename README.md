# micro:bit Sensor Lab

A static, browser-based sensor exploration lab for **BBC micro:bit V2**. Connect a flashed micro:bit using Bluetooth, graph live readings, build simple threshold counters, and export or replay experiments.

**[Open Sensor Lab](https://aaron-ragsdale.github.io/microbitSensorLab/)** · **[Firmware setup](firmware/README.md)**

## Features

- **Live sensor readings:** accelerometer X/Y/Z and calculated **Strength** (magnitude, hidden by default); magnetometer X/Y/Z; temperature; ambient light level; microphone sound level.
- **Interactive graphs:** enable sensors, choose X/Y/Z/Strength traces, zoom and pan, pause, auto-scale, and reset zoom. One visible graph is large; additional graphs become more compact.
- **Simple measurement rules:** choose a channel, set a rising or falling threshold, adjust hysteresis and cooldown, and count crossings.
- **Clear graph:** start a new live graph and reset the crossing count without disconnecting the micro:bit or interrupting an ongoing recording.
- **Record and export:** timed/manual recordings, named PNG graph snapshots and CSV files with timestamped sensor observations.
- **Replay:** import a previously exported CSV to explore it again.
- **Demo:** simulated data for testing the interface without hardware.

The micro:bit V2 does **not** have a gyroscope. Sound level is not a raw audio recording. **Compass heading is intentionally not part of this app**; magnetometer X/Y/Z remains available.

## Quick start

**[Open the live Sensor Lab](https://aaron-ragsdale.github.io/microbitSensorLab/)**

1. Click **Download HEX** on the website, or get [microbit-sensor_lab.hex](firmware/microbit-sensor_lab.hex) from this repository.
2. Connect a **micro:bit V2** with a USB data cable. Open the official [WebUSB HEX Download Tool](https://microbit.org/tools/webusb-hex-download-tool/), choose the downloaded HEX, and flash the board.
3. Return to Sensor Lab in a Web Bluetooth-capable browser (typically Chrome or Edge on a supported computer). Click **Connect micro:bit** and select the device.
4. Enable the sensors you want to plot.

To explore without a device, click **Try demo**. Demo readings are simulated.

## Explore, measure, and record

- **Choose traces:** The accelerometer and magnetometer charts have compact **X/Y/Z** toggles. Accelerometer **Strength** is an optional fourth trace that starts off. Strength is the magnitude of XYZ acceleration and includes gravity.
- **Scale and inspect:** One selected graph is large; additional graphs become more compact. Zoom and pan with the chart toolbar, auto-scale the vertical axes, or pause the view.
- **Count events:** Choose a sensor axis, place a threshold, and count upward or downward crossings. Adjust **hysteresis** to help re-arm the detector and **cooldown** to reduce duplicate detections. Check your count against the actual motion.
- **Clear graph:** Restart live plotting and reset the threshold count **without disconnecting the micro:bit**. It does not interrupt a recording in progress. **Reset zoom** changes only the graph view.
- **Capture a trial:** Name an experiment, select a duration or manual stop, then choose **Save graph PNG**, **Save data CSV**, or **Save both files**. The CSV records timestamped samples from all received sensors, even if their graphs were hidden.
- **Replay:** Import a Sensor Lab CSV to inspect previous readings and try different thresholds. The data stays in your browser unless you download the exports.

### For a new MakeCode HEX

The [current firmware/main.ts](firmware/main.ts) is the MakeCode JavaScript source. In [MakeCode](https://makecode.microbit.org/), select micro:bit V2, add the **Bluetooth** extension, paste the source, compile, and flash. For supervised testing, choose **No Pairing Required** under Bluetooth settings, understanding that it removes authentication.

**Firmware note:** Editing `firmware/main.ts` does **not** change the compiled `firmware/microbit-sensor_lab.hex`. After compiling a new HEX, replace the HEX file in the repository so that the site's download button distributes the new version.

## Sensor transport

| Signal | Transport | Unit |
| --- | --- | --- |
| Accelerometer X, Y, Z | Standard Bluetooth Accelerometer Service | mg |
| Strength | Browser-calculated sqrt(X² + Y² + Z²) | mg |
| Magnetometer X, Y, Z | Standard Bluetooth Magnetometer Service | µT |
| Temperature | Standard Bluetooth Temperature Service | °C (approximate board temperature) |
| Light level | Bluetooth UART packet `LS,light,sound` | 0–255 |
| Microphone sound level | Bluetooth UART packet `LS,light,sound` | 0–255 |

The website subscribes to the Nordic UART TX notifications, writes `START\n` to the RX characteristic, and accepts `ACK\n` before receiving repeated `LS,light,sound` rows. The Bluetooth service status displays available and receiving signals, UART handshake status, packet counts, and errors. Temperature, light, and sound plots retain their last values between updates.

### Troubleshooting

If acceleration, magnetic field, and temperature work but light/sound do not, look under the connection controls: `UART: not subscribed` indicates a service or notification error; `START sent, 0 bytes` suggests the board has not replied; received bytes with no sensor packets suggests a parsing mismatch. Ensure the flashed HEX matches the current firmware source and reconnect. The web app uses characteristic `6e400002` for micro:bit UART TX notifications and `6e400003` for browser-to-micro:bit writes.

The web app is **not** a firmware compiler; it only visualizes and analyzes data sent by a pre-flashed micro:bit.

## Privacy and limitations

All sensor samples, calculations, recordings, and CSV imports are processed in the browser rather than sent to an application server. Plotly.js is loaded from an external CDN. Browser-based timestamps describe notification arrival, not synchronized hardware sampling, and Bluetooth sampling can vary. Camera, microphone audio capture, cloud accounts, and API keys are not required.

The user has confirmed streaming for accelerometer, magnetometer, temperature, light, and sound on a micro:bit V2. Bluetooth behavior can still vary by firmware version, browser, and hardware.

## Repository structure

- `index.html`: static site UI
- `style.css`: responsive layout
- `app.js`: graphing, Bluetooth, heuristics, recordings, exports, and replay
- `firmware/main.ts`: MakeCode firmware source
- `firmware/microbit-sensor_lab.hex`: compiled HEX, update separately
- `firmware/README.md`: flashing and troubleshooting instructions

## GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**, `main`, `/(root)`. The site needs no build step, backend, or local server.

# micro:bit Sensor Lab

A lightweight, **static GitHub Pages** sensor exploration and measurement lab for BBC micro:bit V2. Students visualize live sensor signals, build simple rule-based detectors, and save their experiments as **PNG charts** and **CSV measurements**. No hosted data-storage backend, API keys, or Python server required.

**Website:** https://aaron-ragsdale.github.io/microbitSensorLab/

## What you can do

- **Live graphs:** Connect through Web Bluetooth (Chrome/Edge on a compatible system) and display accelerometer X/Y/Z, magnetometer X/Y/Z, compass heading, light level, microphone sound level, and approximate board temperature.
- **Interactive exploration:** Toggle sensors, zoom and pan each plot using Plotly, choose a rolling time window, pause the display, reset zoom, and auto-scale the graph axes by sensor. A single selected graph expands; graphs become more compact as you select additional sensors. Small X/Y/Z buttons in the accelerometer and magnetometer graph headers show or hide individual axes without adding separate charts. The accelerometer also offers **Strength** (the magnitude of X/Y/Z, including gravity), hidden by default.
- **Heuristic measurement:** Select a signal and a threshold, count upward or downward crossings, add a cooldown and hysteresis to reduce duplicate detections, and reset the count. You can click a data point on the matching graph to set the threshold or enter any value numerically.
- **Record:** Record 5, 10, 30, 60 seconds, or manually start/stop. Sensor observations are held in your browser memory for the current session.
- **Export:** Save a high-resolution PNG image of the selected graphs with threshold line, a CSV containing timestamped samples for all sensors, or both. A custom trial name is used for filenames.
- **Replay:** Import a previously saved CSV, adjust thresholds again, and replay the data on the same charts.
- **Clear graph:** Reset the current live plots and crossing count without disconnecting the micro:bit or interrupting a recording. Saved trial exports are not erased.
- **Try demo:** Simulated signals let students learn the interface without a micro:bit.

No gyroscope is available on a micro:bit V2. The microphone output here is **sound level only**, not recorded audio.

## Getting started: demo

1. Open the live site.
2. Click **Try demo**.
3. Turn on sensor checkboxes. Each sensor has its own graph with appropriate units.
4. Use the plot toolbar or mouse wheel to zoom, drag to pan, or choose **Reset zoom**.
5. Select **Accelerometer Z**, and experiment with the threshold, rising/falling direction, cooldown, and hysteresis.
6. Click **Start recording**, then save a **PNG** or **CSV**.
7. Import the exported CSV to analyze it again. All processing occurs in the browser.

## Getting started: physical micro:bit V2

This repo includes [MakeCode firmware source](firmware/main.ts) and a precompiled HEX. **The current source may be newer than the HEX.** The newer compact firmware enables standard Bluetooth accelerometer and temperature services, and sends magnetometer, compass, light and sound data via Bluetooth UART. The website can also read magnetometer GATT data from earlier HEX builds that expose the standard magnetometer service.

1. Open [Microsoft MakeCode](https://makecode.microbit.org/) and choose micro:bit V2.
2. Add the **Bluetooth** extension (MakeCode will remove the Radio extension if necessary).
3. Switch to **JavaScript**, replace the project code with [firmware/main.ts](firmware/main.ts).
4. For testing in a supervised class, configure Bluetooth security to **No Pairing Required**. Be mindful that nearby devices may be able to connect without authentication.
5. Click **Download**, and flash the generated HEX to your micro:bit via USB.
6. Power the board, then open the GitHub Pages site in **Chrome or Edge**, on a device where Web Bluetooth is available.
7. Click **Connect micro:bit** and choose your device from the browser's Bluetooth device picker.
8. Check the **Available** service list. If one service is absent, the app will not fabricate its readings.

**Important:** The experimental all-sensor firmware has not been compiled or tested on a physical board as part of this initial version. MakeCode/Bluetooth memory limits and V1/V2 differences may affect which services can coexist. If MakeCode reports a compile/memory error, test with just accelerometer + magnetometer first and add temperature or UART after confirming the base connection. The micro:bit **V2** is recommended for the microphone.

### Which channel uses what Bluetooth service?

| Graph | Firmware / transmission | Units |
| --- | --- | --- |
| Acceleration X, Y, Z | micro:bit Accelerometer GATT Service | mg (1 g ≈ 1000 mg) |
| Magnetic field X, Y, Z | Magnetometer GATT Service in earlier HEX builds, or UART `M,x,y,z` in the revised source | µT |
| Compass heading | Magnetometer GATT Service in earlier HEX builds, or UART `C,heading` in the revised source | degrees |
| Temperature | Temperature GATT Service | °C (approximate on-board sensor) |
| Light level | MakeCode `input.lightLevel()` via UART | 0–255 |
| Sound level | MakeCode `input.soundLevel()` via UART | 0–255 |

The UART firmware sends newline-delimited short lines such as `LS,171,24`, `M,12,-5,31`, `C,184` and `T,23`. The older HEX may expose a different subset of services. The other GATT service sampling rates are controlled by the micro:bit runtime and Bluetooth connection, not guaranteed to be synchronized. CSV exports preserve individual observation timestamps and leave channels blank when there was no measurement in that event.

## Understanding the threshold counter

The counter is **not** a trained machine-learning model. It counts when a selected sensor crosses your threshold in the chosen direction.

- **Rising:** The signal first goes below `threshold - hysteresis`, then crosses upward past the threshold.
- **Falling:** The signal first goes above `threshold + hysteresis`, then crosses downward past the threshold.
- **Cooldown:** Ignore further events for the chosen number of milliseconds after a counted crossing.
- **Reset:** Begin counting from the current time. Changing settings recalculates crossings from stored observations since the reset.

A threshold crossing might represent a jump, a step, or just noise. Validate it against your actual movements and adjust parameters.

## Privacy and limitations

- Sensor data is not sent to an app server. It stays in browser memory until you export it or close/refresh the page. Plotly is loaded from a public CDN, so the browser fetches that external script.
- CSV import expects the CSV format exported by this app. There is no server upload; file content is read using the browser File API.
- Live Bluetooth depends on browser and OS support and requires HTTPS. Bluetooth permissions must be granted by a real user interaction. Safari and iOS may not support the required Web Bluetooth APIs.
- Browser timestamps indicate when notifications arrive; they are not micro:bit hardware-synchronized timestamps. Bluetooth packet delays and missed notifications may occur.
- Graphs use their own axes. Do **not** interpret heights between graphs as directly comparable units.
- Magnetic orientation readings may need calibration. Sound level is not a calibrated decibel measurement.
- High-frequency sampling and synchronized multi-sensor inference are outside this first release. Browser graphs are refreshed periodically, rather than plotting every Bluetooth event instantly.
- The firmware is deliberately separate from FreezePods and does not replace normal MakeCode programming.

## Files

- `index.html`: static site layout
- `style.css`: responsive visual design
- `app.js`: Bluetooth connection, graphing, threshold analysis, recording, exports, replay, demo
- `firmware/main.ts`: companion MakeCode TypeScript to compile to HEX
- `README.md`: setup, API context, and limitations

## GitHub Pages

This repository is designed to publish directly without a build step:

1. Open repository **Settings → Pages**.
2. Choose **Deploy from a branch** → **main** → **/(root)**.
3. Save. GitHub Pages should serve `index.html` at the website address above once deployed.

**No localhost, Node build, backend, or Python required.**

## Credits

Uses [Plotly.js](https://plotly.com/javascript/) for interactive charts. Compatible micro:bit Bluetooth services are documented by the [micro:bit Foundation](https://microbit.org/) and [MakeCode Bluetooth](https://makecode.microbit.org/reference/bluetooth).

## Troubleshooting missing channels or temperature gaps

- If **accelerometer and temperature work but magnetometer, light, or microphone do not**, check the website's **Available / Missing / Details** status after connecting. Missing Bluetooth services cannot be enabled just by checking a sensor box.
- The revised [firmware/main.ts](firmware/main.ts) adds a compact UART fallback for magnetometer and compass data alongside light/sound. **You must compile a new HEX and flash it** to gain features not present in the existing compiled firmware. The site does not remotely update the micro:bit.
- **Scalar values (temperature, compass, light and sound)** are now plotted as step/hold signals: the displayed level stays constant until the next reading. The axis can auto-scale as readings change; any actual changes reported by the sensor remain visible.
- The per-sensor diagnostics distinguish missing services from a successfully subscribed service that has not yet produced valid data. If the new firmware still fails, share the status text for investigation.
- The revised firmware is **experimental and not yet compiled or hardware-validated**. Begin with one V2 device before reflashing a class set.

## November 2026 firmware streaming test

The newest MakeCode source in `firmware/main.ts` restores the **standard magnetometer GATT service** alongside accelerometer and temperature. It only sends UART packets while a Bluetooth device is connected. Light and sound level stream in `LS,light,sound` packets. The compass heading is sent only **after pressing micro:bit button A and completing compass calibration**. This avoids triggering first-use compass calibration within the main UART streaming loop.

**Recompile in MakeCode and replace `firmware/microbit-sensor_lab.hex`** before others download it from the website. Changing `main.ts` does not change the existing compiled HEX.

The connection panel now shows **Receiving**, **Subscribed but waiting for data**, **Missing**, and whether UART is subscribed plus how many UART bytes / valid packets have arrived. If `UART: subscribed · 0 valid packets · 0 bytes`, the issue is upstream of the chart, such as firmware UART transmission or notification delivery. If bytes arrive but valid packets stay at zero, the packet format/decoder needs attention. These hypotheses still require a real device test.

## Bluetooth UART handshake diagnostic (latest revision)

If **acceleration, magnetic field, and temperature work** but **light, sound, and compass do not**, the standard services are working and the UART path needs testing. The latest website subscribes to UART notifications and sends `START\n`; the latest `firmware/main.ts` waits for that command, replies `ACK\n`, and streams `LS,light,sound\n` while connected. **Press button A to calibrate the compass;** after successful calibration the board streams `C,heading\n` too.

After updating and flashing the **newly compiled HEX**, open the website, hard-refresh, and reconnect. Under the connection controls, look for:

- **UART: not subscribed** or **Missing: light, sound:** The browser couldn't access the UART notifications. Check the detailed error and HEX version.
- **Handshake: write failed:** The app couldn't send START to the board. Check the error text.
- **Handshake: START sent, 0 bytes:** The board did not reply. Check that the *new* HEX is flashed; on-board MakeCode may not be receiving the command.
- **Handshake: acknowledged:** The UART connection is working. Light and sound should show sensor samples. Compass needs button A calibration.
- **Bytes greater than zero but 0 sensor packets:** The BLE connection is delivering text but the message format is not matching the parser.

**Important:** The checked-in HEX may be older than the current `main.ts`. Editing `main.ts` does not compile or replace it. The Bluetooth handshake has been code-reviewed but **not physically verified on a micro:bit**. As a further isolation test, temporarily flash a MakeCode program with only `bluetooth.startUartService()` and a simple periodic `bluetooth.uartWriteLine("LS,100,50")`. If this works, multiple BLE services or the compiled firmware is the likely issue; if it fails, focus on UART characteristic access/subscription or the browser platform.

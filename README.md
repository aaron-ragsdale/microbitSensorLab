# micro:bit Sensor Lab

A lightweight, **static GitHub Pages** sensor exploration and measurement lab for BBC micro:bit V2. Students visualize live sensor signals, build simple rule-based detectors, and save their experiments as **PNG charts** and **CSV measurements**. No hosted data-storage backend, API keys, or Python server required.

**Website:** https://aaron-ragsdale.github.io/microbitSensorLab/

## What you can do

- **Live graphs:** Connect through Web Bluetooth (Chrome/Edge on a compatible system) and display accelerometer X/Y/Z, magnetometer X/Y/Z, compass heading, light level, microphone sound level, and approximate board temperature.
- **Interactive exploration:** Toggle sensors, zoom and pan each plot using Plotly, choose a rolling time window, pause the display, reset zoom, and auto-scale the graph axes by sensor.
- **Heuristic measurement:** Select a signal and a threshold, count upward or downward crossings, add a cooldown and hysteresis to reduce duplicate detections, and reset the count. You can click a data point on the matching graph to set the threshold or enter any value numerically.
- **Record:** Record 5, 10, 30, 60 seconds, or manually start/stop. Sensor observations are held in your browser memory for the current session.
- **Export:** Save a high-resolution PNG image of the selected graphs with threshold line, a CSV containing timestamped samples for all sensors, or both. A custom trial name is used for filenames.
- **Replay:** Import a previously saved CSV, adjust thresholds again, and replay the data on the same charts.
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

This repo includes [MakeCode firmware source](firmware/main.ts), not a compiled HEX. It enables standard Bluetooth accelerometer, magnetometer, temperature, and UART services.

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
| Magnetic field X, Y, Z | Magnetometer GATT Service | µT |
| Compass heading | Magnetometer GATT Service, compass bearing characteristic | degrees |
| Temperature | Temperature GATT Service | °C (approximate on-board sensor) |
| Light level | MakeCode `input.lightLevel()` via UART | 0–255 |
| Sound level | MakeCode `input.soundLevel()` via UART | 0–255 |

The UART firmware sends newline-delimited short lines using the form `LS,171,24` approximately every 200 ms. The other GATT service sampling rates are controlled by the micro:bit runtime and Bluetooth connection, not guaranteed to be synchronized. CSV exports preserve individual observation timestamps and leave channels blank when there was no measurement in that event.

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

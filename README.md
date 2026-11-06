# KGP Lab Bench

An unofficial practice bench for the **Basic Electronics Laboratory (E&ECE, IIT Kharagpur)**. Students wire the trainer boards themselves and work the instruments the way the lab manual describes, before the real lab or a lab test.

It runs entirely in the browser: no server, no sign-in, no tracking. Wiring and readings are saved in the student's own browser. After the first visit it also works offline and can be installed as an app on phones and laptops.

## What students can do

| Instrument / part | What it does |
|---|---|
| **AFG1022 function generator** | Sine, square, ramp and pulse waveforms. Keypad entry with unit soft keys. Utility › System › Set to Default, and Load 50 Ω / High Z (the doubling trap is simulated). |
| **TBS1102C oscilloscope** | Two channels, Autoset, Default, Run/Stop, Single. Measure menu (Pk-Pk, frequency, period, mean, RMS, max, min, rise time). Probe 1X/10X, AC/DC/GND coupling, trigger source, slope and mode. |
| **Handheld multimeter** | V⎓, V~ (true RMS, with the manual's ~200 Hz limit), Ω, diode test, continuity (beeps), capacitance. Resistance and capacitance refuse to read on a powered circuit. |
| **Trainer boards** | Drawn from the manual photos for Experiments 2–5. Every lead (generator, probes, supply, meter, patch leads) is placed by the student. *Check wiring* lists what is missing. |
| **Graphs** | Frequency response on a log axis (dB or log–log), with f_L, f_H, bandwidth and gain × bandwidth. Also V_out vs V_in with V_SM, load regulation, and an auto sweep. Export as CSV or PNG. |

**Experiments covered:** 2 (voltage divider, R-C, C-R, R-L), 3 (half-wave, centre-tap and bridge rectifiers, filter, Zener and 7806 regulators), 4 (CE amplifier), 5 (741: inverting, non-inverting, follower, adder, integrator, differentiator).

Each experiment and circuit has its own link, for example `…/#e2-rc`, `…/#e4-ce` or `…/#e5-noninv`, so instructors can send students straight to one.

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

You can open `lab-bench-single.html` directly from disk too. It is everything in one file, without offline support.

## Publish it (free options)

The app is plain static files, so it can be hosted anywhere. Upload the whole folder; `src/` and `build.js` are only needed for editing.

- **GitHub Pages:** push this folder to a repository, then go to Settings › Pages › Deploy from branch › `main` / root. The `.nojekyll` file is already included.
- **Netlify:** drag this folder onto https://app.netlify.com/drop.
- **Cloudflare Pages or Vercel:** create a project from the repository. There is no build command, and the output directory is the root.

HTTPS is needed for offline/install support. All of the hosts above provide it.

## Making changes

1. Edit the files in `src/` (they are joined in name order), `styles.css` or `index.html`.
2. Run `node build.js` (or `node build.js --single` to also refresh `lab-bench-single.html`). No packages are needed.
3. In `sw.js`, bump `VERSION` (for example `kgpbench-v2`) so installed copies pick up the update. Students then see a "new version is ready" notice.

| File | Purpose |
|---|---|
| `src/01-models.js` | Circuit models for each experiment |
| `src/02-scope.js` | Scope acquisition, measurements, Autoset, screen |
| `src/03-instruments.js` | Generator front panel, knobs, scope buttons |
| `src/04-boards.js` | Trainer board drawings |
| `src/05-wiring.js` | Patch leads, nets, what the student has built |
| `src/06-meter-graphs.js` | Multimeter and the graph panel |
| `src/07-panels.js` | Circuit-diagram view, controls, expected values |
| `src/08-shell.js` | Links, theme, help/about, export, offline |
| `src/09-boot.js` | Start-up |

## Limits to know before sharing

- The circuit models are simplified; real boards differ. Values the manual does not print (for example the Experiment 2 R and C values) are assumed and editable on the page.
- Some resistor and capacitor positions on the op-amp board were read from photos. The diode and transistor types on the Experiment 2 board are assumed. Check both against the real boards.
- Experiment 1 (multimeter on components) is partly covered by the multimeter on the Experiment 2 board. Experiment 6 is not included.

## Credits

Made by **26BT10049 & friends**.

## Disclaimer

Unofficial and student-made. It is not made by, affiliated with or endorsed by IIT Kharagpur, the E&ECE Department or Tektronix, Inc. Tektronix, AFG1022 and TBS1102C are trademarks of Tektronix, Inc., named only to describe the instruments being imitated. Students should always follow their instructor and the official lab manual.

## License

Choose a license before publishing (MIT is a common choice for small open tools) and add it as `LICENSE`.

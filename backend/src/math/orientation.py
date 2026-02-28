"""
orientation.py — Viewfinder
-----------------------------
Converts raw Modulino angular velocity (degrees/sec on x, y, z axes)
into absolute yaw, pitch, roll angles for the math module.

Usage
-----
    from orientation import OrientationTracker

    tracker = OrientationTracker()
    tracker.calibrate(modulino)          # hold device still for 1 second

    while True:
        av = modulino.gyro               # MovementValues(.x, .y, .z)
        yaw, pitch, roll = tracker.update(av.x, av.y, av.z)
        pixels, mask = stars_to_pixels(star_xyz, yaw, pitch, roll)
"""

import time
import numpy as np


class OrientationTracker:
    """
    Integrates Modulino angular velocity into absolute yaw, pitch, roll.

    Gyroscope axes → orientation angles
    ------------------------------------
    The Modulino outputs angular velocity on its own x, y, z body axes.
    We map them to the three orientation angles as follows:

        gyro.x  → pitch rate  (tilting the device up/down)
        gyro.y  → roll rate   (rotating the device in-hand)
        gyro.z  → yaw rate    (panning left/right across the sky)

    This mapping may need swapping depending on how your device is mounted.
    Adjust AXIS_MAP at the top of __init__ if the motion feels inverted.

    Drift correction
    ----------------
    Gyroscopes report a small nonzero value even when perfectly still.
    During calibrate(), we measure this bias and subtract it every update,
    which significantly reduces orientation drift over time.
    """

    def __init__(self):
        # --- tunable ---
        self.AXIS_MAP = {
            "yaw":   "z",     # which gyro axis drives yaw
            "pitch": "x",     # which gyro axis drives pitch
            "roll":  "y",     # which gyro axis drives roll
        }
        self.YAW_SIGN   =  1  # flip to -1 if yaw direction is inverted
        self.PITCH_SIGN =  1  # flip to -1 if pitch direction is inverted
        self.ROLL_SIGN  =  1  # flip to -1 if roll direction is inverted

        # --- state ---
        self.yaw   = 0.0      # degrees, wraps 0–360
        self.pitch = 0.0      # degrees, clamped -90 to +90
        self.roll  = 0.0      # degrees, wraps -180 to +180

        # --- drift bias (measured during calibration) ---
        self._bias_x = 0.0
        self._bias_y = 0.0
        self._bias_z = 0.0

        self._last_time = None
        self._calibrated = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calibrate(self, modulino, duration_sec: float = 1.5) -> None:
        """
        Hold the device still and call this to measure gyroscope bias.

        Reads the sensor for `duration_sec` seconds and averages the output.
        That average is the sensor's resting noise, which we subtract on
        every subsequent update() call.

        Parameters
        ----------
        modulino : the Modulino Movement object
        duration_sec : how long to sample (longer = more accurate, ~1-2s is fine)
        """
        print(f"[Viewfinder] Calibrating gyroscope — hold still for {duration_sec}s...")

        samples_x, samples_y, samples_z = [], [], []
        start = time.time()

        while time.time() - start < duration_sec:
            av = modulino.gyro
            samples_x.append(av.x)
            samples_y.append(av.y)
            samples_z.append(av.z)
            time.sleep(0.01)

        self._bias_x = float(np.mean(samples_x))
        self._bias_y = float(np.mean(samples_y))
        self._bias_z = float(np.mean(samples_z))

        self._calibrated = True
        self._last_time = time.time()

        print(f"[Viewfinder] Calibration complete. "
              f"Bias → x:{self._bias_x:.4f}  y:{self._bias_y:.4f}  z:{self._bias_z:.4f}")

    def update(self, gx: float, gy: float, gz: float) -> tuple[float, float, float]:
        """
        Call this every sensor reading. Integrates angular velocity into
        absolute yaw, pitch, roll and returns all three.

        Parameters
        ----------
        gx, gy, gz : float
            Raw angular velocity values from modulino.gyro (.x, .y, .z),
            in degrees per second.

        Returns
        -------
        (yaw, pitch, roll) : tuple of float
            Absolute orientation angles in degrees, ready to pass directly
            into math_module.stars_to_pixels().
        """
        now = time.time()

        # On first call after calibrate(), just record the time
        if self._last_time is None:
            self._last_time = now
            return self.yaw, self.pitch, self.roll

        dt = now - self._last_time
        self._last_time = now

        # Subtract bias
        gx -= self._bias_x
        gy -= self._bias_y
        gz -= self._bias_z

        # Dead-zone: ignore noise below 0.5 deg/s (common gyro noise floor)
        gx = 0.0 if abs(gx) < 0.5 else gx
        gy = 0.0 if abs(gy) < 0.5 else gy
        gz = 0.0 if abs(gz) < 0.5 else gz

        # Map body axes to orientation angles and integrate
        rates = {"x": gx, "y": gy, "z": gz}
        self.yaw   += self.YAW_SIGN   * rates[self.AXIS_MAP["yaw"]]   * dt
        self.pitch += self.PITCH_SIGN * rates[self.AXIS_MAP["pitch"]] * dt
        self.roll  += self.ROLL_SIGN  * rates[self.AXIS_MAP["roll"]]  * dt

        # Wrap/clamp angles to natural ranges
        self.yaw   = self.yaw % 360.0
        self.pitch = float(np.clip(self.pitch, -90.0, 90.0))
        self.roll  = ((self.roll + 180.0) % 360.0) - 180.0

        return self.yaw, self.pitch, self.roll

    def reset(self) -> None:
        """Reset orientation to zero (e.g. on recalibration or pointing at a known star)."""
        self.yaw   = 0.0
        self.pitch = 0.0
        self.roll  = 0.0
        self._last_time = time.time()
        print("[Viewfinder] Orientation reset to (0, 0, 0).")

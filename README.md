# Viewfinder
### Point it at the sky and know what you're looking at.

Viewfinder is a handheld star tracker built on the **Arduino Uno Q**. The onboard gyroscope streams orientation data to a Python server, which projects the HYG star catalog against the current view and drives the Uno Q's built-in LED matrix with a live star field.

A **React frontend** uses a WebSocket to get polls the current orientation and visible stars, rendering them with magnitude, color, and constellation lines. Constellation edge data is sent once on load and filtered locally by the frontend. A find-star mode guides the user toward a target with a directional arrow mirrored on the LED matrix.
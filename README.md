# Viewfinder
### Point it at the sky and know what you're looking at.

Viewfinder is a handheld star tracker built on the **Arduino Uno Q**. The onboard gyroscope streams orientation data to a Python server, which projects the HYG star catalog against the current view and drives the Uno Q's built-in LED matrix with a live star field.

A **React frontend** uses a WebSocket to get polls the current orientation and visible stars, rendering them with magnitude, color, and constellation lines. Constellation edge data is sent once on load and filtered locally by the frontend. A find-star mode guides the user toward a target with a directional arrow mirrored on the LED matrix.

This version does not require the Arduino component to move around, it only needs mouse and keyboard.

Mouse to move camera
Arrow keys to spin
Scroll to zoom

## How to run

1. **Backend (Python server)**  
   From the project root:
   ```bash
   cd backend/standalone
   pip install -r requirements.txt
   python main.py
   ```
   The server runs at `http://localhost:2705` and serves the WebSocket for orientation and stars.

2. **Frontend (React)**  
   In a separate terminal, from the project root:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open the URL shown in the terminal (e.g. `http://localhost:5173`) to use the star map. Click and drag to pan, scroll to zoom.


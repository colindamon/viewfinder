/*
 * SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
 *
 * SPDX-License-Identifier: MPL-2.0
 */

const classesRoot = document.getElementById('classes');

// --- Accelerometer plot ---
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const width = canvas.width, height = canvas.height;
const maxSamples = 200;
const samples = [];

// --- Gyroscope plot ---
const gyroCanvas = document.getElementById('gyro-plot');
const gyroCtx = gyroCanvas.getContext('2d');
const gyroWidth = gyroCanvas.width, gyroHeight = gyroCanvas.height;
const gyroSamples = [];
const maxGyroRange = 250;

let errorContainer;

function drawPlot() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const y = 10 + i * ((height - 20) / 8);
    ctx.moveTo(40, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#666';
  ctx.font = '11px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 8; i++) {
    const y = 10 + i * ((height - 20) / 8);
    const value = (2.0 - i * 0.5).toFixed(1);
    ctx.fillText(value, 35, y);
  }

  function drawSeries(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const x = 40 + (i / (maxSamples - 1)) * (width - 40);
      const v = s[key];
      const y = (height / 2) - (v * ((height - 20) / 4));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawSeries('x', '#0068C9');
  drawSeries('y', '#FF9900');
  drawSeries('z', '#FF2B2B');
}

function drawGyroPlot() {
  gyroCtx.fillStyle = '#fff';
  gyroCtx.fillRect(0, 0, gyroWidth, gyroHeight);

  gyroCtx.strokeStyle = '#f0f0f0';
  gyroCtx.lineWidth = 0.5;
  gyroCtx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const y = 10 + i * ((gyroHeight - 20) / 8);
    gyroCtx.moveTo(40, y);
    gyroCtx.lineTo(gyroWidth, y);
  }
  gyroCtx.stroke();

  gyroCtx.fillStyle = '#666';
  gyroCtx.font = '11px Arial';
  gyroCtx.textAlign = 'right';
  gyroCtx.textBaseline = 'middle';
  for (let i = 0; i <= 8; i++) {
    const y = 10 + i * ((gyroHeight - 20) / 8);
    const value = Math.round(maxGyroRange - i * (maxGyroRange / 4));
    gyroCtx.fillText(value, 35, y);
  }

  function drawGyroSeries(key, color) {
    gyroCtx.strokeStyle = color;
    gyroCtx.lineWidth = 1;
    gyroCtx.beginPath();
    for (let i = 0; i < gyroSamples.length; i++) {
      const s = gyroSamples[i];
      const x = 40 + (i / (maxSamples - 1)) * (gyroWidth - 40);
      const v = s[key];
      const y = (gyroHeight / 2) - (v * ((gyroHeight - 20) / (maxGyroRange * 2)));
      if (i === 0) gyroCtx.moveTo(x, y); else gyroCtx.lineTo(x, y);
    }
    gyroCtx.stroke();
  }

  drawGyroSeries('x', '#0068C9');
  drawGyroSeries('y', '#FF9900');
  drawGyroSeries('z', '#FF2B2B');
}

function pushSample(s) {
  samples.push(s);
  if (samples.length > maxSamples) samples.shift();
  drawPlot();
}

function pushGyroSample(s) {
  gyroSamples.push(s);
  if (gyroSamples.length > maxSamples) gyroSamples.shift();
  drawGyroPlot();
}

function renderClasses(d) {
  const orderedKeys = ['snake', 'wave', 'updown', 'idle'];

  let maxKey = null;
  let maxValue = -1;
  for (const key in d) {
    if (d[key] > maxValue) {
      maxValue = d[key];
      maxKey = key;
    }
  }

  classesRoot.innerHTML = '';

  const icons = { snake: '🐍', updown: '↕', wave: '🌊', idle: '💤' };
  const names = { snake: 'Snake', updown: 'Up Down', wave: 'Wave', idle: 'Idle' };

  orderedKeys.forEach(key => {
    const value = d[key] || 0;
    const row = document.createElement('div');
    row.className = 'row';
    const percentage = value.toFixed(1);
    const isMax = key === maxKey;
    const progressClass = isMax ? 'progress-fill primary' : 'progress-fill secondary';
    const valueClass = isMax ? 'value primary' : 'value secondary';

    row.innerHTML = `
      <div class="movement-header">
        <div class="label"><span class="emoji">${icons[key]}</span> ${names[key]}</div>
        <div class="${valueClass}">${percentage}%</div>
      </div>
      <div class="progress-bar">
        <div class="${progressClass}" style="width: ${percentage}%"></div>
      </div>
    `;
    classesRoot.appendChild(row);
  });
}

function setValues(d) {
  renderClasses(d);
}

fetch('/detection').then(r => r.json()).then(d => setValues(d)).catch(e => console.debug('Failed to fetch /detection', e));

fetch('/samples').then(r => r.json()).then(list => {
  if (Array.isArray(list)) list.forEach(s => pushSample(s));
}).catch(e => console.debug('Failed to load /samples', e));

fetch('/gyro_samples').then(r => r.json()).then(list => {
  if (Array.isArray(list)) list.forEach(s => pushGyroSample(s));
}).catch(e => console.debug('Failed to load /gyro_samples', e));

fetch('/orientation').then(r => r.json()).then(d => {
  document.getElementById('orientation-display').textContent = d.angle.toFixed(1) + '°';
  document.getElementById('orientation-detail').textContent = `ax: ${d.ax} | ay: ${d.ay} | az: ${d.az}`;
}).catch(e => console.debug('Failed to fetch /orientation', e));

const socket = io(window.location.origin, {
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  autoConnect: true
});

socket.on('movement', (data) => setValues(data));
socket.on('sample', (s) => pushSample(s));
socket.on('gyro_sample', (s) => pushGyroSample(s));

socket.on('orientation', (data) => {
  document.getElementById('orientation-display').textContent = data.angle.toFixed(1) + '°';
  document.getElementById('orientation-detail').textContent = `ax: ${data.ax} | ay: ${data.ay} | az: ${data.az}`;
});

socket.on('connect', () => {
  if (errorContainer) {
    errorContainer.style.display = 'none';
    errorContainer.textContent = '';
  }
});

socket.on('disconnect', () => {
  errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = 'Connection to the board lost. Please check the connection.';
    errorContainer.style.display = 'block';
  }
});
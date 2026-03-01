#include <Arduino_Modulino.h>
#include <Arduino_RouterBridge.h>

extern "C" void matrixBegin();
extern "C" void matrixWrite(const uint32_t* buf);

ModulinoMovement movement;

static uint32_t matBuf[4] = {0, 0, 0, 0};

unsigned long previousMillis = 0;
unsigned long lastTime = 0;
const long interval = 50;

int ledRows[8] = {0,0,0,0,0,0,0,0};

void clearMatrix() {
  matBuf[0] = matBuf[1] = matBuf[2] = matBuf[3] = 0;
}

void setPixel(int row, int col) {
  row = constrain(row, 0, 7);
  col = constrain(col, 0, 12);
  int idx = row * 13 + col;
  matBuf[idx / 32] |= (1UL << (idx % 32));
}

void drawArrow(float angleDeg) {
  clearMatrix();
  float cx = 6.0, cy = 3.5;
  float rad = angleDeg * PI / 180.0;
  float dx = sin(rad);
  float dy = -cos(rad);
  for (int i = 1; i <= 3; i++) {
    int col = (int)(cx + dx * i + 0.5f);
    int row = (int)(cy + dy * i + 0.5f);
    setPixel(row, col);
  }
  float hx = cos(rad);
  float hy = sin(rad);
  int tipCol = (int)(cx + dx * 3 + 0.5f);
  int tipRow = (int)(cy + dy * 3 + 0.5f);
  setPixel((int)(tipRow + hy * 1.5f + 0.5f), (int)(tipCol - hx * 1.5f + 0.5f));
  setPixel((int)(tipRow - hy * 1.5f + 0.5f), (int)(tipCol + hx * 1.5f + 0.5f));
  setPixel((int)(cy + 0.5f), (int)(cx + 0.5f));
  matrixWrite(matBuf);
}

void renderLedRows() {
  clearMatrix();
  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 13; col++) {
      if ((ledRows[row] >> (12 - col)) & 1) {
        setPixel(row, col);
      }
    }
  }
  matrixWrite(matBuf);
}

void set_led_top(int r0, int r1, int r2, int r3) {
  ledRows[0] = r0;
  ledRows[1] = r1;
  ledRows[2] = r2;
  ledRows[3] = r3;
}

void set_led_bottom(int r4, int r5, int r6, int r7) {
  ledRows[4] = r4;
  ledRows[5] = r5;
  ledRows[6] = r6;
  ledRows[7] = r7;
  renderLedRows();
}

void setup() {
  matrixBegin();
  Bridge.begin();
  Modulino.begin(Wire1);

  matBuf[0] = matBuf[1] = matBuf[2] = 0xFFFFFFFF;
  matBuf[3] = 0xFF;
  matrixWrite(matBuf);
  delay(2000);
  clearMatrix();
  matrixWrite(matBuf);

  while (!movement.begin()) {
    delay(1000);
  }

  Bridge.provide("set_led_top", set_led_top);
  Bridge.provide("set_led_bottom", set_led_bottom);

  lastTime = millis();
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    lastTime = currentMillis;
    previousMillis = currentMillis;

    if (movement.update()) {
      float nx = movement.getX();
      float ny = movement.getY();
      float nz = movement.getZ();
      float gx = movement.getRoll();
      float gy = movement.getPitch();
      float gz = movement.getYaw();

      float elevation = acos(constrain(-nz, -1.0f, 1.0f)) * 180.0 / PI;

      Bridge.notify("record_sensor_movement", nx, ny, nz);
      Bridge.notify("record_sensor_gyro", gx, gy, gz);
      Bridge.notify("record_elevation", elevation);
    }
  }

  Bridge.update();
}
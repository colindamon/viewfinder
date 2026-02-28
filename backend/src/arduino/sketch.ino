#include <Arduino_Modulino.h>
#include <Arduino_RouterBridge.h>

extern "C" void matrixBegin();
extern "C" void matrixWrite(const uint32_t* buf);

ModulinoMovement movement;

static uint32_t matBuf[4] = {0, 0, 0, 0};

unsigned long previousMillis = 0;
const long interval = 50;

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
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    if (movement.update()) {
      // In your coordinate system:
      // X = forward, Y = up/down, Z = left/right
      // Board is parallel to Y, rotating on XZ plane
      // Accelerometer reads gravity, so when board faces forward:
      // we want the angle of the normal on the XZ plane
      float ax = movement.getX();
      float az = movement.getZ();

      // Angle of normal on XZ plane
      float angle = atan2(az, ax) * 180.0 / PI;

      // Send to Python for web display
      Bridge.notify("orientation", ax, movement.getY(), az, angle);

      static float lastAngle = 0;
      if (abs(angle - lastAngle) > 3.0f) {
        lastAngle = angle;
        drawArrow(angle);
      }
    }
  }
}
#include <Servo.h>

Servo myServo;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  myServo.attach(8);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    char command = Serial.read();
    if (command == '1') {
      digitalWrite(LED_BUILTIN, HIGH);
      myServo.write(-90);
      delay(2000);  // LED on for 1 second
      digitalWrite(LED_BUILTIN, LOW);
      myServo.write(90);
    }
  }
}

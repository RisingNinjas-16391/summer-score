void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    char command = Serial.read();
    if (command == '1') {
      digitalWrite(LED_BUILTIN, HIGH);
      delay(1000);  // LED on for 1 second
      digitalWrite(LED_BUILTIN, LOW);
    }
  }
}

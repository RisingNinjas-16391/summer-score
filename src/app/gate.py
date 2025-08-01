import serial
import time
import firebase_admin
from firebase_admin import credentials, db

# Initialize Firebase Admin SDK
default_app = firebase_admin.initialize_app()

# Set up Arduino serial
arduino = serial.Serial('COM3', 115200, timeout=1)
time.sleep(2)  # Wait for Arduino to initialize

last_command = None

def listen_for_arduino_trigger():
    ref = db.reference('realtime/arduinoCommand')

    def callback(event):
        global last_command
        command = event.data
        if command and command != last_command:
            print(f"[Firebase] Command received: {command}")
            arduino.write(f"{command}\n".encode())
            last_command = command

    ref.listen(callback)

if __name__ == "__main__":
    print("Listening for commands from Firebase...")
    listen_for_arduino_trigger()

import time
import serial
import os
from datetime import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load .env
dotenv_path = os.path.join(os.getcwd(), '.env.local')
load_dotenv(dotenv_path)

# === Serial Setup ===
arduino = serial.Serial('COM3', 9600, timeout=1)
time.sleep(2)  # Give Arduino time to reset
arduino.reset_input_buffer()
arduino.reset_output_buffer()

# === Firebase Setup ===
cred_path = os.getenv("FIREBASE_CRED_PATH")
if not cred_path:
    raise Exception("FIREBASE_CRED_PATH is not set in the environment")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client(database_id="default")
doc_ref = db.collection("realtime").document("gate")

# === Polling Loop ===
def poll_firestore():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    doc = doc_ref.get()
    if doc.exists:
        data = doc.to_dict()
        if data.get("gateClosed", False):
            print(f"[{now}] Gate closed! Triggering Arduino")
            arduino.write(b'1')
            doc_ref.update({"gateClosed": False})
        else:
            print(f"[{now}] No trigger yet")
    else:
        print(f"[{now}] Document not found")

if __name__ == "__main__":
    try:
        while True:
            poll_firestore()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Exiting")
    finally:
        arduino.close()

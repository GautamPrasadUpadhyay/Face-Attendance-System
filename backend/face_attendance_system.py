import os
import cv2
import numpy as np
import face_recognition
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from flask import send_file
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
import threading

# 🔧 Flask app setup
app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})


# 📁 Path to known faces
KNOWN_FACES_DIR = 'known_faces'
ATTENDANCE_CSV = 'attendance.csv'

# Thread-safe storage for face encodings
class FaceEncodingStorage:
    def __init__(self):
        self.known_encodings = []
        self.known_names = []
        self.lock = threading.Lock()
    
    def add_encoding(self, encoding, name):
        with self.lock:
            self.known_encodings.append(encoding)
            self.known_names.append(name)
    
    def get_encodings(self):
        with self.lock:
            return self.known_encodings.copy(), self.known_names.copy()

face_storage = FaceEncodingStorage()

# Load faces in parallel
def load_face(filename):
    if filename.endswith((".jpg", ".png")):
        try:
            img = face_recognition.load_image_file(f"{KNOWN_FACES_DIR}/{filename}")
            # Get all face locations in the image
            face_locations = face_recognition.face_locations(img)
            if not face_locations:
                print(f"⚠️ No face detected in {filename}")
                return
            
            # Get encodings for all faces in the image
            face_encodings = face_recognition.face_encodings(img, face_locations)
            if not face_encodings:
                print(f"⚠️ Could not encode face in {filename}")
                return
            
            # Use the first face found in the image
            name = os.path.splitext(filename)[0]
            face_storage.add_encoding(face_encodings[0], name)
            print(f"✅ Loaded face: {name}")
        except Exception as e:
            print(f"❌ Error loading face {filename}: {str(e)}")

# Load faces using thread pool
with ThreadPoolExecutor(max_workers=4) as executor:
    face_files = [f for f in os.listdir(KNOWN_FACES_DIR) if f.endswith((".jpg", ".png"))]
    executor.map(load_face, face_files)

# ✅ Mark attendance with batch processing
def mark_attendance(names):
    now = datetime.now()
    dt_string = now.strftime('%Y-%m-%d %H:%M:%S')

    try:
        # Initialize DataFrame with columns
        if os.path.exists(ATTENDANCE_CSV) and os.path.getsize(ATTENDANCE_CSV) > 0:
            df = pd.read_csv(ATTENDANCE_CSV)
        else:
            df = pd.DataFrame(columns=['Name', 'Time'])
        
        # Add new entries in batch
        new_entries = pd.DataFrame([[name, dt_string] for name in names], columns=['Name', 'Time'])
        df = pd.concat([df, new_entries], ignore_index=True)
        
        # Sort by time in descending order (newest first)
        df['Time'] = pd.to_datetime(df['Time'])
        df = df.sort_values('Time', ascending=False)
        
        # Save to CSV with optimized settings
        df.to_csv(ATTENDANCE_CSV, index=False, mode='w')
        return True
    except Exception as e:
        print(f"❌ Error marking attendance: {str(e)}")
        return False

# 🚀 API Route with batch processing
@app.route('/mark-attendance', methods=['POST'])
def mark_attendance_api():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    try:
        file = request.files['image']
        img = face_recognition.load_image_file(file)
        
        # Get face locations and encodings
        face_locations = face_recognition.face_locations(img)
        if not face_locations:
            return jsonify({'recognized': [], 'message': 'No faces detected in the image'}), 200
            
        face_encodings = face_recognition.face_encodings(img, face_locations)
        if not face_encodings:
            return jsonify({'recognized': [], 'message': 'Could not process faces in the image'}), 200

        # Get current known faces
        known_encodings, known_names = face_storage.get_encodings()
        if not known_encodings:
            return jsonify({'recognized': [], 'message': 'No known faces in the system'}), 200

        recognized_names = []
        for encoding in face_encodings:
            try:
                # Compare with tolerance of 0.6 (default is 0.6)
                matches = face_recognition.compare_faces(known_encodings, encoding, tolerance=0.6)
                if True in matches:
                    face_distances = face_recognition.face_distance(known_encodings, encoding)
                    best_match_index = np.argmin(face_distances)
                    name = known_names[best_match_index]
                    if name not in recognized_names:  # Avoid duplicates
                        recognized_names.append(name)
            except Exception as e:
                print(f"❌ Error processing face: {str(e)}")
                continue

        # Batch process attendance marking
        if recognized_names:
            mark_attendance(recognized_names)
            return jsonify({
                'recognized': recognized_names,
                'message': f'Attendance marked for: {", ".join(recognized_names)}'
            }), 200
        else:
            return jsonify({
                'recognized': [],
                'message': 'No matching faces found'
            }), 200

    except Exception as e:
        print(f"❌ Error in mark-attendance API: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return "✅ Flask Server is Running — Face Attendance System API"

@app.route('/attendance.csv')
def get_attendance_csv():
    try:
        response = send_file(ATTENDANCE_CSV, mimetype='text/csv')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 🏁 Start Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


# SmartAttend

**AI-Enabled Face Recognition Attendance and Academic Monitoring System**

Department of Computer Science & Engineering  
Capstone Project (Phase I) — Team: Tisha Amit, Nidhi Tak, Priyanshi Vasa, Ahir Om

## Description

SmartAttend automates classroom attendance using real-time facial recognition backed by liveness detection, eliminating manual roll calls and proxy attendance. An edge camera unit (ESP32-CAM or webcam) captures faces at the classroom entry point; a CNN-based recognition model (FaceNet/ArcFace) matches them against enrolled student embeddings and returns a confidence score. Matches above a defined threshold are logged automatically, while low-confidence matches are routed to manual verification — ensuring the system fails safely rather than misclassifying attendance.

Beyond core recognition, SmartAttend syncs attendance data in real time to web portals. Faculty get a live dashboard with attendance analytics, trend charts, and predictive defaulter alerts. Students get same-day absence notifications, an appeal workflow for contesting flagged records, and a "What If?" planner — an agentic AI feature that answers free-form questions like *"Can I skip Friday's lecture and stay above 75%?"* by calling real backend functions rather than hardcoded formulas.

The system is built as a Flask backend with database models, interactive dashboards styled with modern CSS and Chart.js, and REST APIs connecting the recognition, backend, and frontend layers.

## Core Features

* Real-time face detection & recognition with confidence scoring
* Liveness detection to reject photo/video spoofing
* Real-time attendance sync to student & faculty portals
* Same-day absence notifications (FCM/Twilio/SMTP)
* Student attendance appeal workflow
* Faculty dashboard with analytics & defaulter alerts
* Agentic "What If?" attendance planner (LLM function-calling)

## Modules

| # | Module | Owner Focus |
|---|---|---|
| 1 | Face Recognition & Liveness | Computer vision / ML pipeline |
| 2 | Core Backend & Database | Flask, REST APIs, DB schema, auth |
| 3 | Frontend (Dashboard & Portal) | Core UI, real-time views |
| 4 | Appeal, Notifications & Predictive Features | Full-stack vertical slice incl. AI planner |

## Tech Stack

* **Frontend:** React 19, Vite, Chart.js, Vanilla CSS
* **Backend:** Python, Flask, Flask-JWT-Extended, Flask-SQLAlchemy
* **AI/ML:** OpenCV, MTCNN, DeepFace/InsightFace, MediaPipe, scikit-learn
* **Database:** SQLite / Cloud Database
* **Notifications:** Firebase Cloud Messaging / SMTP

## Documentation

* [Software Requirements Specification (SRS)](docs/SmartAttend_SRS.docx)
* [System Architecture Diagram](docs/SmartAttend_Architecture_Diagram.png)
* [ER Diagram](docs/SmartAttend_ER_Diagram.png)
* [Module Breakdown](docs/SmartAttend_Module_Breakdown.pdf)

## Status

🚧 Phase I — Requirements & Design complete. Implementation in progress.

## License

Academic Project, 2026.
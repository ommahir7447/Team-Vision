# SmartAttend — AI-Enabled Face Recognition Attendance and Academic Monitoring System

[![Team](https://img.shields.io/badge/Team-Vision-blueviolet?style=for-the-badge)](https://github.com/ommahir7447/Team-Vision)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/Backend-Flask-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Database](https://img.shields.io/badge/Cloud_DB-Firebase_/_AWS-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![AI/ML](https://img.shields.io/badge/Computer_Vision-OpenCV_|_DeepFace-red?style=for-the-badge&logo=opencv)](https://opencv.org/)
[![LLM Agent](https://img.shields.io/badge/Agentic_AI-Claude_|_OpenAI_API-7400B8?style=for-the-badge&logo=anthropic)](https://www.anthropic.com/)

---

## Project Overview

**SmartAttend** is an automated, AI-driven attendance and academic monitoring system designed to replace traditional manual roll calls and eliminate proxy attendance in university classrooms. Developed for **Karnavati University — Unitedworld Institute of Technology (UIT), Department of Computer Science & Engineering**, SmartAttend combines edge computing, deep-learning-based facial recognition, liveness anti-spoofing, real-time cloud data synchronization, and an **Agentic AI attendance planner**.

An edge camera unit (ESP32-CAM or USB webcam) positioned at the classroom entrance captures real-time video streams. The vision pipeline detects faces, executes liveness verification, computes embedding similarities (via CNN architectures such as ArcFace/FaceNet), and assigns a confidence score. High-confidence matches are logged automatically to the cloud database, while low-confidence edge cases are safely routed to manual faculty review.

Beyond automated logging, SmartAttend empowers both educators and students through dedicated web portals:
- **Faculty Dashboard**: Live attendance monitoring, visual trend analytics, and predictive defaulter risk alerts.
- **Student Portal**: Real-time attendance tracking, same-day absence alerts, a formal appeal workflow, and an **Agentic "What If?" Attendance Planner** that answers free-form questions via LLM function calling.

---

## Key Features

- **Real-Time Facial Recognition**: Instant face detection and embedding matching against enrolled student databases.
- **Liveness Detection (Anti-Spoofing)**: Prevents photo, screen, or video playback spoofing at classroom entry points.
- **Confidence-Based Routing**: Auto-logs verified matches above a threshold ($\ge 85\%$) and routes ambiguous cases to manual verification to prevent false positives.
- **Real-Time Cloud Sync**: Instant synchronization of attendance logs with cloud storage (Firebase Firestore / AWS DynamoDB).
- **Same-Day Absence Notifications**: Automatic alerts triggered via FCM push notifications, Twilio SMS, or SMTP email.
- **Student Appeal Workflow**: Transparent justification mechanism allowing students to contest missed or flagged records with faculty approval routing.
- **Faculty Analytics & Defaulter Alerts**: Early warning system using historical attendance trends to flag students at risk of falling below the minimum $75\%$ threshold.
- **Agentic AI "What If?" Planner**: Powered by Claude / OpenAI API with function calling. Students can ask natural language questions (*"Can I miss Friday's DBMS lecture and stay above 75%?"*), and the agent calls backend tools (`get_attendance_history`, `calculate_projection`) to generate accurate, real-time answers.

---

## Architecture & System Data Flow

```
┌─────────────────┐       ┌──────────────────────────────┐       ┌────────────────────────┐
│  Edge Camera    │ ────> │  Face Recognition Pipeline   │ ────> │  Liveness Detection    │
│ (ESP32 / USB)   │       │ (MTCNN / ArcFace / DeepFace) │       │ (Anti-Spoofing Check)  │
└─────────────────┘       └──────────────────────────────┘       └────────────────────────┘
                                                                             │
                                                                             ▼
┌─────────────────┐       ┌──────────────────────────────┐       ┌────────────────────────┐
│ Student Portal  │ <──── │    Flask Backend & REST APIs │ <──── │ Confidence Evaluator   │
│ & AI Planner    │       │ (JWT Auth, Firebase/AWS DB)  │       │ (Auto vs Manual Log)   │
└─────────────────┘       └──────────────────────────────┘       └────────────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────┐       ┌──────────────────────────────┐
│ Agentic AI LLM  │       │      Faculty Dashboard       │
│ (Tool Calling)  │       │ (Analytics & Risk Alerts)    │
└─────────────────┘       └──────────────────────────────┘
```

### Flow Summary
1. **Detection & Verification**: The camera captures classroom entry streams $\rightarrow$ Face detection & liveness check executed $\rightarrow$ Confidence score computed.
2. **Database Logging**: Match $\ge$ Threshold logged as `Present` $\rightarrow$ Match < Threshold sent to `Manual Verification` queue.
3. **Portal Sync & Notifications**: Real-time push alerts sent to absent students $\rightarrow$ Dashboards update instantly.
4. **Agentic Planning**: Student queries LLM Planner $\rightarrow$ Agent executes backend data tool $\rightarrow$ Dynamic plain-language report returned.

---

## Module Breakdown and Team Responsibilities

SmartAttend is structured into four cohesive development modules:

| # | Module | Core Scope & Focus | Team Focus |
|---|---|---|---|
| **1** | **Face Recognition & Liveness** | Computer Vision pipeline, face detection (MTCNN/MediaPipe), feature extraction (ArcFace/DeepFace), liveness anti-spoofing, confidence scoring. | Vision / ML Pipeline |
| **2** | **Core Backend & Database** | Flask web application, REST API design, database schemas (Firebase/AWS), JWT authentication, cloud backend hosting (Render/Railway). | Backend & Infrastructure |
| **3** | **Frontend & Web Portals** | Jinja2 templates, HTML5/CSS3, vanilla JavaScript, Bootstrap design system, Chart.js analytics for faculty and student interfaces. | UI/UX & Web Frontend |
| **4** | **Appeals, Notifications & Agentic AI** | Full-stack vertical slice: student appeal CRUD, FCM/Twilio notifications, predictive defaulter alerts, and Claude/OpenAI Agentic AI "What If?" planner integration. | Full-Stack & Agentic AI |

### Team Members — Team Vision
- **Tisha Amit**
- **Nidhi Tak**
- **Priyanshi Vasa**
- **Ahir Om**

*Department of Computer Science & Engineering, Karnavati University (2026)*

---

## Technology Stack

### Backend & Infrastructure
- **Language**: Python 3.10+
- **Framework**: Flask, Jinja2, Flask-JWT-Extended
- **Database**: Firebase Firestore / AWS DynamoDB
- **Hosting / Deployment**: Render / Railway (Cloud Hosting), Gunicorn WSGI

### AI, Machine Learning & Vision
- **Computer Vision**: OpenCV, MediaPipe, MTCNN
- **Facial Recognition**: DeepFace, ArcFace / InsightFace, scikit-learn
- **Agentic AI**: Claude API / OpenAI API (Function/Tool Calling)

### Frontend & Analytics
- **Languages**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Data Visualization**: Chart.js

### Hardware & Communication
- **Edge Hardware**: ESP32-CAM module / HD USB Webcam
- **Messaging & Notifications**: Firebase Cloud Messaging (FCM), Twilio SMS API, SMTP Email
- **API Testing**: Postman

---

## Repository Structure

```
smartattend/
├── recognition/          # Module 1 — Face detection, liveness & embedding pipeline
│   ├── detect.py         # Face detection & alignment
│   ├── liveness.py       # Anti-spoofing verification
│   └── recognize.py      # Embedding generation & matching logic
├── backend/              # Module 2 — Flask app, API endpoints & DB connection
│   ├── app.py            # Main application entry point
│   ├── config.py         # App configuration & environment setup
│   ├── models/           # Data models & Firestore schemas
│   └── routes/           # RESTful API route handlers (Auth, Attendance, Courses)
├── frontend/             # Module 3 — Jinja2 templates & web assets
│   ├── static/           # CSS stylesheets, JS scripts, images
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   └── templates/        # HTML templates (Faculty Dashboard, Student Portal)
├── features/             # Module 4 — Appeals, notifications & Agentic AI
│   ├── appeals.py        # Appeal submission & faculty review logic
│   ├── notifications.py  # FCM / Twilio / SMTP dispatchers
│   ├── predictor.py      # Defaulter statistical risk calculations
│   └── planner_agent.py  # Claude / OpenAI LLM tool-calling agent
├── docs/                 # Documentation & Architecture diagrams
│   ├── SmartAttend_SRS.docx
│   ├── SmartAttend_Architecture_Diagram.png
│   ├── SmartAttend_ER_Diagram.png
│   ├── SmartAttend_Module_Breakdown.pdf
│   └── SmartAttend_Presentation2.pptx
├── .env.example          # Sample environment variables config
├── requirements.txt      # Python dependencies list
└── README.md             # Project documentation
```

---

## Database Schema Summary

The system models six key entities stored in the cloud database:

1. **Student**: `student_id`, `name`, `email`, `roll_number`, `face_embedding_id`, `department`
2. **Faculty**: `faculty_id`, `name`, `email`, `department`
3. **Course**: `course_id`, `course_code`, `course_name`, `faculty_id`, `schedule`
4. **Enrollment**: `enrollment_id`, `student_id`, `course_id`, `semester`
5. **AttendanceRecord**: `record_id`, `student_id`, `course_id`, `timestamp`, `status` (`Present`/`Absent`/`Flagged`), `confidence_score`, `verification_type` (`Auto`/`Manual`)
6. **Appeal**: `appeal_id`, `record_id`, `student_id`, `reason`, `status` (`Pending`/`Approved`/`Rejected`), `reviewed_by`, `reviewed_at`

---

## Repository Initialization

To clone and initialize the repository:

```bash
git clone https://github.com/ommahir7447/Team-Vision.git
cd Team-Vision
```

---

## Documentation Links

All formal technical documentation and architectural blueprints can be found in the [`docs/`](docs/) directory:

- [Software Requirements Specification (SRS)](docs/SmartAttend_SRS.docx)
- [System Architecture Diagram](docs/SmartAttend_Architecture_Diagram.png)
- [Entity-Relationship (ER) Diagram](docs/SmartAttend_ER_Diagram.png)
- [Detailed Module Breakdown Document](docs/SmartAttend_Module_Breakdown.pdf)
- [Phase-I Capstone Presentation Slides](docs/SmartAttend_Presentation2.pptx)

---

## Deployment Plan

- **Backend Hosting**: [Render](https://render.com/) or [Railway](https://railway.app/) (Flask WSGI application).
- **Database & Storage**: Firebase Firestore & Firebase Storage.
- **Frontends**: Served directly through Jinja2 dynamic rendering from Flask.
- **Edge Deployment**: ESP32-CAM configured with local Wi-Fi calling deployed Flask REST API endpoints.

---

## License and Academic Credits

This project is developed as part of the **Capstone Project (Phase I & II)** curriculum at:
- **Institution**: Karnavati University — Unitedworld Institute of Technology (UIT)
- **Department**: Department of Computer Science & Engineering (CSE)
- **Year**: 2026
- **Team**: Team Vision

*Academic Project — All Rights Reserved.*

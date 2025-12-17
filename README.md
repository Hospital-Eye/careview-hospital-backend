# CareView Hospital Backend

## Overview

CareView Hospital Backend is a comprehensive backend system designed for hospital monitoring and management. It integrates a robust Node.js/Express REST API with a specialized Python-based Computer Vision (CV) service for real-time video analytics.

The system handles patient admissions, staff management, device logs, and real-time computer vision tasks such as person detection and tracking using YOLOv8 and DeepSORT/ByteTrack.

### Key Features

*   **Hospital Management API**: RESTful endpoints for managing Clinics, Patients, Staff, Rooms, and Admissions.
*   **Computer Vision Analytics**: dedicated Python service for detecting and tracking people in video feeds (RTSP/MP4).
*   **Real-time Alerts**: Compliance alerts and vital monitoring.
*   **Device Management**: Logging and monitoring of camera and sensor devices.
*   **Security**: Role-based access control (RBAC), JWT authentication, and Google OAuth integration.
*   **Cloud Native**: Designed for deployment on Google Cloud Platform (GCP) using Cloud Run and Cloud SQL.

---

## System Architecture

The project consists of two main components:

1.  **Main Backend (Node.js)**:
    *   **Framework**: Express.js
    *   **Database**: PostgreSQL (managed via Sequelize ORM)
    *   **Authentication**: Passport.js (Google OAuth), JWT
    *   **Storage**: Google Cloud Storage (GCS) for file uploads
    *   **Notifications**: Firebase Admin SDK

2.  **CV Service (Python)**:
    *   **Framework**: FastAPI
    *   **ML Models**: YOLOv8 (Object Detection), DeepSORT/ByteTrack (Tracking)
    *   **Functionality**: Processes video streams to detect and track individuals, generating analytics events.

---

## Tech Stack

*   **Runtime**: Node.js (v18+), Python (v3.9+)
*   **Database**: PostgreSQL
*   **Containerization**: Docker
*   **Cloud Provider**: Google Cloud Platform (GCP)
*   **CI/CD**: GitHub Actions

---

## Project Structure

```bash
careview-hospital-backend/
├── config/                 # Database and external service configurations
├── controllers/            # Request handlers for the Node.js API
├── cv-service/             # Python Computer Vision microservice
│   ├── app.py              # FastAPI entry point
│   ├── deep_sort/          # DeepSORT tracking implementation
│   └── requirements.txt    # Python dependencies
├── middleware/             # Express middleware (Auth, Uploads, RBAC)
├── models/                 # Sequelize (PostgreSQL) models
├── routes/                 # API route definitions
├── scripts/                # Utility scripts (Migration, Data Export/Import)
├── utils/                  # Helper functions (Logger, Cron jobs)
├── server.js               # Node.js application entry point
├── Dockerfile              # Docker configuration for the main backend
└── .github/workflows/      # CI/CD pipelines
```

---

## API Endpoints

The backend provides a comprehensive set of RESTful endpoints.

### 1. Authentication & Profile
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/authRoutes/signup` | Register a new user | Public |
| `POST` | `/api/authRoutes/login` | User login | Public |
| `GET` | `/api/authRoutes/logout` | User logout | Public |
| `POST` | `/api/authRoutes/send-otp` | Send OTP for verification | Public |
| `POST` | `/api/authRoutes/verify-otp` | Verify OTP | Public |
| `POST` | `/api/authRoutes/set-password` | Set new password | Public |
| `GET` | `/api/authRoutes/auth/google` | Initiate Google OAuth | Public |
| `GET` | `/api/profile` | Get current user profile | Authenticated Users |
| `GET` | `/api/my-health` | Get patient's own health data | Patient |

### 2. Hospital Administration
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| **Clinics** | | | |
| `POST` | `/api/clinics` | Create a new clinic | Admin, Manager |
| `GET` | `/api/clinics` | List all clinics | Admin, Manager, Doctor |
| `GET` | `/api/clinics/:id` | Get clinic details | Admin, Manager, Doctor |
| `PUT` | `/api/clinics/:id` | Update clinic | Admin, Manager, Doctor |
| `DELETE` | `/api/clinics/:id` | Delete clinic | Admin, Manager, Doctor |
| **Users & Staff** | | | |
| `POST` | `/api/users` | Create user | Admin |
| `GET` | `/api/users` | List users | Admin |
| `PATCH` | `/api/users/:id` | Update user | Admin |
| `DELETE` | `/api/users/:id` | Delete user | Admin |
| `POST` | `/api/staff` | Create staff member | Admin, Manager |
| `GET` | `/api/staff` | List staff | Admin, Manager, Doctor |
| `PUT` | `/api/staff/:id` | Update staff details | Admin, Manager, Doctor |
| `DELETE` | `/api/staff/:id` | Remove staff | Admin, Manager, Doctor |
| **Management** | | | |
| `POST` | `/api/management` | Create Admin/Manager | Admin |
| `GET` | `/api/management` | List managers | Admin, Manager |
| `PUT` | `/api/management/:id` | Update manager | Admin |
| `DELETE` | `/api/management/:id` | Delete manager | Admin |
| **Rooms** | | | |
| `POST` | `/api/rooms` | Create room | Admin, Manager |
| `GET` | `/api/rooms` | List rooms | Admin, Manager, Doctor, Nurse |
| `GET` | `/api/rooms/available` | List available rooms | Admin, Manager, Doctor, Nurse |
| `PUT` | `/api/rooms/:id` | Update room | Admin, Manager |
| `DELETE` | `/api/rooms/:id` | Delete room | Admin, Manager |
| **Devices** | | | |
| `POST` | `/api/device-logs` | Create device log | Admin, Manager |
| `GET` | `/api/device-logs` | List device logs | Admin, Manager |
| `DELETE` | `/api/device-logs/:id`| Delete device log | Admin, Manager |

### 3. Clinical Operations
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| **Patients & Admissions** | | | |
| `POST` | `/api/patients` | Create patient | Admin, Manager, Doctor, Nurse |
| `GET` | `/api/patients` | List patients | Admin, Manager, Doctor, Nurse |
| `GET` | `/api/patients/:mrn` | Get patient by MRN | Admin, Manager, Doctor, Nurse |
| `PUT` | `/api/patients/:mrn` | Update patient | Admin, Manager, Doctor |
| `DELETE` | `/api/patients/:mrn` | Delete patient | Admin, Manager |
| `POST` | `/api/admissions` | Admit patient | Admin, Nurse, Manager, Doctor |
| `GET` | `/api/admissions` | List admissions | Admin, Nurse, Manager, Doctor |
| `PUT` | `/api/admissions/:id` | Update admission | Admin, Nurse, Manager |
| `DELETE` | `/api/admissions/:id` | Discharge/Delete admission | Admin, Manager |
| **Care Management** | | | |
| `POST` | `/api/tasks` | Create task | Admin, Doctor, Manager |
| `GET` | `/api/tasks` | List tasks | Admin, Doctor, Manager, Nurse |
| `PUT` | `/api/tasks/:id` | Update task | Admin, Doctor, Manager, Nurse |
| `DELETE` | `/api/tasks/:id` | Delete task | Admin, Doctor, Manager |
| `POST` | `/api/vitals` | Record vitals | Admin, Doctor, Manager |
| `GET` | `/api/vitals/history/:patientId` | Get vitals history | Admin, Doctor, Manager, Nurse |
| `POST` | `/api/compliance-alerts` | Create compliance alert | Admin, Manager |
| `GET` | `/api/compliance-alerts` | List alerts | Admin, Manager, Doctor, Nurse |
| **Scans** | | | |
| `POST` | `/api/scans/upload` | Upload medical scan | Admin, Manager, Doctor |
| `GET` | `/api/scans/:mrn` | Get scans by MRN | Admin, Manager, Doctor |
| `PUT` | `/api/scans/:mrn` | Add doctor review | Doctor |
| **Dashboard** | | | |
| `GET` | `/api/dashboard` | Get dashboard metrics | Admin, Nurse, Doctor, Manager |

### 4. Computer Vision & Analytics
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| **Cameras (Streaming)** | | | |
| `POST` | `/api/cameras` | Register new camera | Public |
| `GET` | `/api/cameras` | List cameras | Public |
| `POST` | `/api/cameras/:id/start` | Start camera process | Public |
| `POST` | `/api/cameras/:id/stop` | Stop camera process | Public |
| `POST` | `/api/cv-analytics/:cameraId/start` | Start CV tracking | Public |
| `POST` | `/api/cv-analytics/:cameraId/stop` | Stop CV tracking | Public |
| **Detections & Events** | | | |
| `GET` | `/api/cv-detections` | Get CV detections | Admin, Manager, Doctor |
| `GET` | `/api/cv-events/recent` | Get recent CV events | Public |
| `GET` | `/api/analytics-events` | Get analytics events | Admin, Manager, Doctor, Nurse |
| **MP4 Analytics** | | | |
| `POST` | `/api/mp4-uploads/upload` | Upload MP4 file | Public |
| `GET` | `/api/mp4-uploads/files` | List uploaded files | Public |
| `POST` | `/api/mp4-uploads/analytics/:filename/start` | Run analytics on MP4 | Public |
| `GET` | `/api/mp4-events/recent/:filename` | Get events for MP4 | Public |

---

## Local Development Setup

### Prerequisites

*   Node.js (v18 or higher)
*   Python (3.10 or higher)
*   PostgreSQL
*   Docker (optional, for containerized run)

### 1. Main Backend (Node.js)

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Configuration**:
    Create a `.env` file in the root directory based on the following template:
    ```env
    PORT=8080
    NODE_ENV=development
    
    # Database
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=your_password
    POSTGRES_DB=hospital_eye
    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432
    
    # Authentication
    JWT_SECRET=your_jwt_secret
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_REDIRECT_URI=your_callback_url
    FRONTEND_BASE_URL=http://localhost:3000
    
    # External Services (Optional for local dev)
    FIREBASE_CREDENTIALS=path/to/firebase-key.json
    GCS_BUCKET_NAME=your_bucket_name
    ```

3.  **Database Migration**:
    Initialize the database schema:
    ```bash
    npx sequelize-cli db:migrate
    ```

4.  **Run Server**:
    ```bash
    npm start
    # OR for development with hot-reload
    npm run dev
    ```

### 2. CV Service (Python)

1.  **Navigate to Directory**:
    ```bash
    cd cv-service
    ```

2.  **Create Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run Service**:
    ```bash
    uvicorn app:app --reload --port 8000
    ```

---

## Deployment

The application is deployed to **Google Cloud Platform (GCP)** within the **Sigma-New Project** (`sigma-new-480301`). The deployment pipeline is fully automated using GitHub Actions.

### Deployment Workflow

The CI/CD pipeline is defined in `.github/workflows/cloud-run-deploy.yml`.

1.  **Trigger**:
    *   The deployment is triggered automatically when a new **tag** starting with `v*` (e.g., `v1.0.1`) is pushed to the repository.

2.  **Build Process**:
    *   Authenticates with Google Cloud using Workload Identity Federation.
    *   Builds the Docker image for the Node.js backend.
    *   Pushes the image to Google Artifact Registry:
        `[REGION]-docker.pkg.dev/[PROJECT_ID]/careview-backend-production/[SERVICE_NAME]:[COMMIT_SHA]`

3.  **Deploy to Cloud Run**:
    *   Deploys the new container image to **Cloud Run**.
    *   Connects to the **Cloud SQL** instance via the Cloud SQL Auth Proxy.
    *   Updates environment variables (Secrets) from GitHub Secrets.

### Environment & Secrets

The following secrets must be configured in the GitHub repository environment (`development`):

| Secret Name | Description |
| :--- | :--- |
| `PROJECT_ID` | GCP Project ID (`sigma-new-480301`) |
| `REGION` | GCP Region (e.g., `us-central1`) |
| `SERVICE_NAME` | Cloud Run Service Name |
| `SERVICE_ACCOUNT_EMAIL` | Service Account for deployment (`careview-backend-deployer@...`) |
| `CLOUDSQL_INSTANCE` | Cloud SQL Connection Name (`project:region:instance`) |
| `DB_USER` | PostgreSQL Username |
| `DB_PASSWORD` | PostgreSQL Password |
| `DB_NAME` | Database Name |
| `JWT_SECRET` | Secret key for JWT signing |
| `GOOGLE_CLIENT_ID` | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET`| OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth Redirect URI |

### Manual Deployment Command (Reference)

If manual deployment is ever required via CLI:

```bash
gcloud run deploy [SERVICE_NAME] \
  --image gcr.io/[PROJECT_ID]/[IMAGE_NAME] \
  --platform managed \
  --region [REGION] \
  --add-cloudsql-instances [INSTANCE_CONNECTION_NAME] \
  --set-env-vars "NODE_ENV=production,POSTGRES_HOST=/cloudsql/[INSTANCE_CONNECTION_NAME],..."
```

---

## Database Management

*   **ORM**: Sequelize
*   **Migrations**: Located in `migrations/` folder.
*   **Seeds/Data Import**: Use `npm run import-data` to populate initial data if needed.

## License

ISC


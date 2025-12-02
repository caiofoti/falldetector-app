# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Fall Detection application built with Laravel (PHP backend) and React (TypeScript frontend) using Inertia.js for seamless SPA integration. The application monitors video feeds in real-time using a Python-based fall detection service powered by MediaPipe and OpenCV.

**Key Stack:**
- **Backend:** Laravel 12, PHP 8.2+, SQLite
- **Frontend:** React 19, TypeScript, Inertia.js, TailwindCSS 4
- **Fall Detection:** Python Flask service with MediaPipe pose detection
- **Real-time:** Laravel Reverb (WebSockets), Pusher protocol
- **Authentication:** Laravel Fortify with 2FA support
- **PWA:** Progressive Web App capabilities via silviolleite/laravelpwa

## Development Commands

### Initial Setup
```bash
# Full project setup (Laravel + Node + Python)
composer setup

# Manual setup steps:
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

### Python Fall Detection Service
```bash
# First-time setup
setup-python.bat          # Windows: Creates venv and installs dependencies

# Start Python service (required for fall detection)
start-python.bat          # Windows: Runs on http://localhost:8080
# OR manually:
source venv/bin/activate  # Linux/Mac
python python/fall_detection_service.py
```

### Laravel Development
```bash
# Start all development services concurrently (recommended)
composer dev              # Runs: php artisan serve, queue:listen, npm run dev

# Individual commands:
php artisan serve         # Laravel server on http://localhost:8000
php artisan queue:listen --tries=1  # Queue worker for background jobs
php artisan reverb:start  # WebSocket server (if using Reverb locally)

# Database
php artisan migrate       # Run migrations
php artisan migrate:fresh --seed  # Fresh database with seeders

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
```

### Frontend Development
```bash
# Development with HMR
npm run dev

# Build for production
npm run build

# SSR build (if using server-side rendering)
npm run build:ssr

# Code quality
npm run lint              # ESLint with auto-fix
npm run format            # Prettier formatting
npm run format:check      # Check formatting without changes
npm run types             # TypeScript type checking
```

### Testing
```bash
# Laravel tests
composer test             # Runs: config:clear, php artisan test
php artisan test          # PHPUnit tests

# Code quality
vendor/bin/pint           # Laravel Pint (PHP CS Fixer)
```

## Architecture

### Backend Structure

**Core Models:**
- `MonitoringSession` - Represents a video monitoring session with camera configuration
- `FallAlert` - Stores detected fall events with confidence scores and snapshots
- `User` - Standard Laravel user with 2FA support and phone number for notifications
- `Notification` - User notifications for fall alerts and system events
- `NotificationSetting` - Per-user notification preferences (email, SMS, push, quiet hours)

**Event Broadcasting:**
- `FallDetected` event broadcasts via WebSockets to `private-monitoring-session.{id}` channels
- Uses Laravel Reverb for real-time communication
- Python service sends webhook to `/api/fall-detected` which creates alerts, notifications, and broadcasts events
- Real-time notifications are sent via WebSockets to connected clients

**Controllers:**
- `MonitoringSessionController` - CRUD for monitoring sessions
- `CameraStreamController` - Proxies to Python service for streaming and fall detection; handles webhooks from Python; sends webhooks to n8n
- `FallAlertController` - Manages fall alert acknowledgments
- `MonitoringApiController` - API endpoints for session stats and alerts
- `NotificationController` - API for user notifications (list, mark as read, delete)

**Jobs & Queues:**
- `ProcessFallDetection` - Legacy job, now processing is synchronous for real-time alerts
- Queue connection configured in `.env` (default: database)

**Observers:**
- `UserObserver` - Automatically creates NotificationSettings when a new user is created

### Frontend Structure

**Pages (resources/js/pages/):**
- `dashboard.tsx` - Main dashboard showing monitoring sessions
- `monitoring/` - Monitoring session views (create, show, live camera feed)
- `auth/` - Authentication pages (login, register, 2FA)
- `settings/` - User settings (profile, password, 2FA)
- `welcome.tsx` - Landing page

**Components:**
- Radix UI primitives for accessible UI components
- Custom components in `resources/js/components/`
- Layout components in `resources/js/layouts/`

**Routing:**
- Uses Laravel Wayfinder for type-safe routing
- Inertia.js handles SPA navigation
- Route definitions in `routes/web.php` and `routes/api.php`

**Real-time Features:**
- Laravel Echo + Pusher for WebSocket connections
- Subscribe to `private-monitoring-session.{sessionId}` for fall alerts
- Event listener for `fall.detected` broadcasts

### Python Detection Service

**File:** `python/fall_detection_service.py`

**Endpoints:**
- `GET /video_feed` - MJPEG stream of processed video
- `POST /start` - Start monitoring session (params: session_id, camera_url, camera_type)
- `POST /stop` - Stop current monitoring session
- `GET /status` - Current session status
- `GET /health` - Health check

**Fall Detection Logic:**
- Uses MediaPipe Pose for landmark detection
- Calculates fall confidence based on shoulder-hip positioning
- Requires 60 consecutive frames of horizontal posture to trigger alert
- 30-second cooldown between webhooks
- Sends webhook to Laravel at `http://localhost:8000/api/fall-detected`

**Webhook Payload:**
```json
{
  "session_id": 123,
  "confidence_score": 95.5,
  "snapshot_base64": "base64_encoded_image"
}
```

## Communication Flow

1. User creates monitoring session in Laravel
2. Frontend calls `/camera/{session}/start`
3. Laravel proxies to Python service `POST /start`
4. Python service starts camera capture and pose detection
5. Frontend polls `/camera/{session}/status` every 3 seconds (keep-alive)
6. On fall detection, Python sends webhook to Laravel `/api/fall-detected`
7. Laravel **synchronously** creates:
   - `FallAlert` record
   - `Notification` for the user
   - Broadcasts `FallDetected` event via WebSocket
   - Sends webhook to n8n (if configured)
8. Frontend receives WebSocket event and displays alert in real-time
9. User can acknowledge alerts via UI
10. n8n receives webhook and can trigger WhatsApp messages, emails, etc.

## Environment Configuration

Key `.env` variables:
- `DB_CONNECTION=sqlite` - Uses SQLite by default
- `QUEUE_CONNECTION=database` - Queue using database driver
- `BROADCAST_CONNECTION` - Set to Reverb or Pusher for real-time features
- `SESSION_DRIVER=database` - Sessions stored in database
- `CACHE_STORE=database` - Cache using database
- `N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/queda` - Webhook URL for n8n integration (optional)

For Python service, ensure Laravel is accessible at `http://localhost:8000` (or update `LARAVEL_BASE_URL` in `fall_detection_service.py`).

## Important Notes

- Python service must be running on port 8080 for fall detection to work
- WebSocket server (Reverb) must be running for real-time alerts
- Camera permissions required in browser for webcam monitoring
- Snapshot images stored in `storage/app/public/snapshots/{year}/{month}/`
- Run `php artisan storage:link` to create public symlink for snapshots
- User registration now requires phone number for SMS notifications
- NotificationSettings are automatically created for new users
- Fall detection processing is **synchronous** for real-time performance
- Session keep-alive happens automatically via frontend status polling every 3 seconds

## Notification System

**Database Tables:**
- `notifications` - Stores all user notifications
- `notification_settings` - Per-user preferences for notification delivery

**Notification Types:**
- `fall_detected` - Alert when a fall is detected during monitoring

**API Endpoints:**
- `GET /api/notifications` - List all notifications (paginated)
- `GET /api/notifications/unread` - Get unread notifications
- `POST /api/notifications/{id}/read` - Mark notification as read
- `POST /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification

**Notification Fields:**
- `user_id` - Owner of the notification
- `fall_alert_id` - Related fall alert (nullable)
- `type` - Notification type
- `title` - Notification title
- `message` - Notification message
- `data` - JSON data with additional context
- `read_at` - Timestamp when marked as read

## n8n Webhook Integration

When a fall is detected, Laravel sends a POST request to `N8N_WEBHOOK_URL` with:

```json
{
  "receiver": "victor.alves@ufcspa.edu.br",
  "usuario": {
    "nome": "John Doe",
    "email": "john@example.com",
    "telefone": "+55 11 98765-4321"
  },
  "queda": {
    "data_hora": "29/11/2025 23:30:15",
    "confianca": "95.5%",
    "local": "Living Room Camera"
  }
}
```

Environment variables:
- `N8N_WEBHOOK_URL` - The n8n webhook endpoint URL
- `N8N_RECEIVER_EMAIL` - Email address to receive notifications (default: victor.alves@ufcspa.edu.br)

This allows n8n workflows to:
- Send WhatsApp messages via Twilio/Evolution API
- Send SMS notifications
- Send emails with fall alert details
- Trigger emergency contacts
- Log to external systems

## PWA Features

- Service worker and manifest configured via laravelpwa package
- Configure in `config/laravelpwa.php`
- Generate icons and manifest with `php artisan laravelpwa:publish`

## Type Safety

- TypeScript configured with strict mode
- Inertia.js types in `resources/js/types/`
- Use `npm run types` to check for type errors before committing
- Wayfinder provides type-safe route helpers

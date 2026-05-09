# StudentSync

StudentSync is a zero-friction, minimum-setup Kanban board designed for short-term university student projects. It prioritizes speed and simplicity, allowing students to start tracking tasks in seconds instead of fighting complex project management tools or cluttering Telegram chats.

## Key Features

- **Instant Boards**: Create and manage multiple project boards from a personalized dashboard.
- **Secure Authentication**: User accounts with JWT-based persistent sessions.
- **Fluid Drag & Drop**: Move tasks between columns (To Do, In Progress, Done) with seamless animations.
- **Task Order Persistence**: Your custom task order is saved and preserved across page reloads.
- **Inline Editing**: Fix typos or update task titles instantly by clicking on them.
- **Shareable Links**: Copy a board link to share your progress with teammates.
- **Premium UI**: Modern, high-performance design using Tailwind CSS, glassmorphism, and Outfit/Inter typography.

## Tech Stack

### Frontend
- **Angular 17+** (Standalone Components)
- **Tailwind CSS** (Premium UI & Responsive Design)
- **Angular CDK** (Drag & Drop functionality)
- **RxJS** (State management)

### Backend
- **FastAPI** (Python)
- **SQLite** (Persistent storage)
- **PyJWT** (Secure authentication)
- **Bcrypt** (Password hashing)

---

## Setup Instructions

### Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   # Windows
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

### Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   Open your browser at `http://localhost:4200`.

---

## Design Principles

1. **Zero Friction**: Get from landing page to a working board in under 3 clicks.
2. **Minimalism**: No complex sub-menus or hidden settings. Everything is exactly where you expect it.
3. **No Placeholders**: Real icons and premium typography only.
4. **No Emojis**: A professional, focused aesthetic for academic work.

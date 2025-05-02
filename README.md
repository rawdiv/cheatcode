# CheatCode - Coding Interview Preparation Platform

CheatCode is a full-stack web application designed to help users prepare for coding interviews by providing structured problem-solving practice with unique "CheatCodes" (patterns/tricks) that help master common coding challenges more efficiently.

## Features

- **User Authentication**: Secure signup and login
- **Personalized Dashboard**: Track progress, streaks, and mastery level
- **AI-Generated Problems**: Dynamic problem generation based on difficulty and topics
- **Code Editor**: In-browser code editor with syntax highlighting
- **Solution Verification**: Automated solution evaluation and feedback
- **CheatCodes**: Pattern-based hints and tricks to solve problems efficiently
- **Progress Tracking**: Track your learning journey and identify weak areas

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **AI Integration**: Google Gemini API for problem generation and solution evaluation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)
- Supabase account for database
- Google Gemini API key (for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/cheatcode.git
   cd cheatcode
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following contents:
   ```
   PORT=3000
   NODE_ENV=development
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   SESSION_SECRET=your_random_session_secret
   ```

4. Set up your Supabase database:
   - Create tables for profiles, user_preferences, problems, and user_progress
   - Run the schema.sql script in Supabase SQL editor
   - Set up RLS policies for tables

### Running in Development

```bash
# Start the backend server
npm run dev

# Serve the frontend (in a separate terminal)
npm run client
```

### Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Database Schema

The application uses the following tables:

1. **profiles**: User profile information
2. **user_preferences**: User preferences and onboarding information
3. **problems**: Coding problems and their details
4. **user_progress**: User progress on each problem
5. **user_activity**: Daily user activity and streak information

## API Endpoints

### Authentication
- `POST /api/auth/signup`: Register a new user
- `POST /api/auth/login`: Log in a user
- `POST /api/auth/logout`: Log out a user

### User Profile
- `POST /api/profiles/create`: Create user profile
- `GET /api/profiles/:userId`: Get user profile
- `PUT /api/profiles/:userId`: Update user profile

### User Preferences
- `POST /api/preferences`: Save user preferences
- `GET /api/preferences/:userId`: Get user preferences

### Problems
- `GET /api/generate-problem`: Generate a new problem
- `GET /api/problem-solution`: Get solution for the current problem
- `POST /api/evaluate-solution`: Evaluate a user's solution
- `GET /api/problems`: Get a list of problems

### User Progress
- `POST /api/progress`: Save user progress
- `GET /api/progress/:userId`: Get user progress

### Dashboard
- `GET /api/dashboard/:userId`: Get user dashboard data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Supabase for database and authentication
- Google Gemini for AI capabilities
- Tailwind CSS for styling 
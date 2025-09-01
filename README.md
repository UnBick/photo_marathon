# 📸 Photo Marathon Website

A full-stack web application for organizing and participating in photo scavenger hunt games. Teams compete by taking photos of specific locations or objects, with automatic image verification and real-time leaderboards.

## 🚀 Features

### For Teams
- **User Registration & Authentication** - Secure team accounts with JWT tokens
- **Level Progression** - Unlock new challenges as you complete levels
- **Photo Upload** - Submit photos with drag & drop interface
- **Real-time Progress** - Track your advancement through the game
- **Leaderboard** - See how you rank against other teams
- **Mobile Responsive** - Works perfectly on all devices

### For Administrators
- **Game Management** - Create and manage photo challenges
- **Image Processing** - Automatic photo verification using perceptual hashing
- **Submission Review** - Manual approval/rejection of borderline submissions
- **Real-time Monitoring** - Live updates on team progress and submissions
- **Analytics Dashboard** - Comprehensive game statistics and insights

### Technical Features
- **Real-time Updates** - WebSocket integration for live leaderboards
- **Image Analysis** - Advanced image matching algorithms
- **Security** - JWT authentication, rate limiting, and input validation
- **Scalable Architecture** - Built for high-performance and scalability
- **API-First Design** - RESTful API with comprehensive documentation

## 🏗️ Architecture

```
photo-marathon/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout wrappers
│   │   ├── context/         # React Context providers
│   │   ├── services/        # API service layer
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── backend/                  # Node.js Express API
│   ├── src/
│   │   ├── config/          # Database and app configuration
│   │   ├── models/          # MongoDB schemas
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Helper functions
│   └── uploads/             # Image storage
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.IO** - Real-time WebSocket server
- **JWT** - JSON Web Token authentication
- **Multer** - File upload handling
- **Sharp** - Image processing
- **Image Hash** - Perceptual hashing for image comparison

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/photo-marathon.git
cd photo-marathon
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env with your configuration
# MONGODB_URI=mongodb://localhost:27017/photo-marathon
# JWT_SECRET=your-super-secret-key
# PORT=5000

# Start MongoDB (if not running)
# On macOS: brew services start mongodb-community
# On Windows: Start MongoDB service
# On Linux: sudo systemctl start mongod

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/photo-marathon

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Redis (optional)
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Image Processing
PHASH_THRESHOLD=8
ORB_THRESHOLD=25
EMBEDDING_THRESHOLD=0.3

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### MongoDB Setup

1. Install MongoDB Community Edition
2. Create a database named `photo-marathon`
3. Ensure MongoDB is running on the default port (27017)

## 📱 API Endpoints

### Authentication
- `POST /api/auth/team/register` - Team registration
- `POST /api/auth/team/login` - Team login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/super-admin` - Create super admin

### Team Operations
- `GET /api/team/progress` - Get team progress
- `GET /api/team/next` - Get next level
- `POST /api/team/submit` - Submit photo
- `GET /api/team/history` - Get submission history

### Level Management
- `GET /api/levels/current` - Get current level
- `GET /api/levels/:id` - Get level details

### Admin Operations
- `POST /api/admin/levels` - Create new level
- `GET /api/admin/submissions` - Get pending submissions
- `POST /api/admin/submissions/:id/approve` - Approve submission
- `POST /api/admin/submissions/:id/reject` - Reject submission
- `GET /api/admin/leaderboard` - Get leaderboard data

### Public
- `GET /api/leaderboard` - Public leaderboard
- `GET /health` - Health check

## 🎮 Game Flow

1. **Setup Phase**
   - Admin creates photo challenges (levels)
   - Admin configures game settings
   - Teams register for the event

2. **Game Phase**
   - Admin starts the game
   - Teams receive their first challenge
   - Teams take photos and submit them
   - System automatically verifies submissions
   - Teams progress through levels

3. **Final Challenge**
   - Teams unlock final challenge after completing all levels
   - First team to submit verified final photo wins
   - Game ends automatically

4. **Results**
   - Final leaderboard is displayed
   - Winners are announced
   - Game statistics are available

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with configurable rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Cross-origin request security
- **Helmet.js** - Security headers and protection
- **File Upload Security** - File type and size validation

## 📊 Image Verification

The system uses multiple algorithms for image verification:

1. **Perceptual Hashing (pHash)** - Fast comparison for near-identical images
2. **Feature Matching (ORB/SIFT)** - Structural similarity detection
3. **Deep Learning Embeddings** - Semantic similarity (optional)

### Verification Thresholds

- **pHash Threshold**: 8 (Hamming distance)
- **ORB Threshold**: 25 (good feature matches)
- **Embedding Threshold**: 0.3 (cosine similarity)

## 🚀 Deployment

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Considerations

- Use environment-specific configuration files
- Set up proper MongoDB authentication
- Configure reverse proxy (nginx/Apache)
- Set up SSL certificates
- Configure file storage (S3, CloudFront)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Performance Optimization

- **Database Indexing** - Optimized MongoDB queries
- **Image Caching** - Thumbnail generation and caching
- **CDN Integration** - Static asset delivery
- **Load Balancing** - Horizontal scaling support
- **Background Jobs** - Async image processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [Wiki](../../wiki) for detailed guides
- **Issues**: Report bugs and request features via [GitHub Issues](../../issues)
- **Discussions**: Join the community in [GitHub Discussions](../../discussions)

## 🙏 Acknowledgments

- **OpenCV** - Computer vision algorithms
- **MongoDB** - Database technology
- **React Team** - Frontend framework
- **Express.js** - Backend framework
- **Tailwind CSS** - Styling framework

## 📞 Contact

- **Project Maintainer**: [Your Name](mailto:your.email@example.com)
- **Project Link**: [https://github.com/yourusername/photo-marathon](https://github.com/yourusername/photo-marathon)

---

**Made with ❤️ by the Photo Marathon Team**

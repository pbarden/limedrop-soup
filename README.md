# Limedrop Soup OS

A modern, React-based desktop environment simulation with multi-user support, real-time authentication, and comprehensive application management.

## 🚀 Quick Deploy

Deploy to production with one click:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/limedrop-soup)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/limedrop-soup)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/yourusername/limedrop-soup)

## 🎯 Demo Access

**Live Demo**: [Your deployed URL here]

**Demo Credentials**:
- Email: `demo@limedrop.com`
- Password: `demo123`

**Admin Access**:
- Email: `admin@limedrop.com`
- Password: `admin123`

## ✨ Features

- **Multi-User Desktop Environment**: Complete user authentication and session management
- **Window Management**: Drag, resize, minimize, maximize with persistent settings
- **Application Suite**: File Manager, App Builder, Settings, and extensible app system
- **Real-Time Theming**: 53+ gradient backgrounds, custom window controls, live preview
- **Database Integration**: SQLite with Prisma ORM for user data and preferences
- **Production Ready**: Docker support, rate limiting, logging, and security middleware

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ and npm
- Docker (optional, for containerized development)

### Quick Start

#### For Unix/Linux/macOS:

1. **Clone and Install**:
   ```bash
   git clone https://github.com/yourusername/limedrop-soup.git
   cd limedrop-soup
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   ```bash
   npm run db:setup
   ```

4. **Development Mode**:
   ```bash
   npm run dev
   ```

#### For Windows (Command Prompt):

1. **Clone and Install**:
   ```cmd
   git clone https://github.com/yourusername/limedrop-soup.git
   cd limedrop-soup
   npm install
   ```

2. **Environment Setup**:
   ```cmd
   copy .env.example .env
   REM Edit .env with your configuration using notepad or your preferred editor
   notepad .env
   ```

3. **Database Setup**:
   ```cmd
   npm run db:setup
   ```

4. **Development Mode**:
   ```cmd
   npm run dev
   ```

#### For Windows (PowerShell):

1. **Clone and Install**:
   ```powershell
   git clone https://github.com/yourusername/limedrop-soup.git
   cd limedrop-soup
   npm install
   ```

2. **Environment Setup**:
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your configuration
   notepad .env
   ```

3. **Database Setup**:
   ```powershell
   npm run db:setup
   ```

4. **Development Mode**:
   ```powershell
   npm run dev
   ```

   **Visit**: `http://localhost:3000` (all platforms)

### Docker Development

#### Unix/Linux/macOS & Windows (WSL2/PowerShell):
```bash
docker-compose up
```

#### Windows (Command Prompt):
```cmd
docker-compose up
```

## 🏗️ Architecture

### Frontend (React + Vite)
- **React 18** with modern hooks and context
- **React Router** for SPA navigation
- **Custom Hooks**: `useWindowManager`, `useAuth`, `useNotifications`
- **Module CSS** for component styling

### Backend (Express.js)
- **Express.js** REST API server
- **SQLite** database with Prisma ORM
- **JWT Authentication** with bcrypt password hashing
- **Rate Limiting** and CORS middleware
- **Request Logging** with Morgan

### Key Components

- `src/components/Desktop.jsx` - Main desktop environment
- `src/components/Window.jsx` - Draggable, resizable windows
- `src/components/Dock.jsx` - Application launcher
- `src/components/apps/` - Built-in applications
- `src/hooks/useWindowManager.js` - Window state management
- `server/` - Express.js backend with API routes

## 📱 Applications

### Built-in Apps
- **Settings**: Theme customization, window controls, preferences
- **File Manager**: CRUD operations, search, import/export
- **App Builder**: Visual workflow builder with drag-and-drop
- **App Manager**: Install/uninstall applications, version management

### Creating Custom Apps

1. Create component in `src/components/apps/YourApp.jsx`
2. Register in `src/data/applications.js`
3. Add routing in `src/App.jsx`

Example:
```javascript
export const applications = [
  {
    id: 'your-app',
    name: 'Your App',
    icon: 'fas fa-your-icon',
    component: 'YourApp',
    defaultSize: { width: 800, height: 600 }
  }
]
```

## 🔐 Authentication & Security

- **JWT Tokens** with 7-day expiration
- **Bcrypt Password Hashing** with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation** with express-validator
- **CORS Protection** for cross-origin requests
- **Environment Variables** for sensitive configuration

## 📊 Admin Dashboard

Access admin features at `/admin`:
- User management and analytics
- System logs and monitoring
- Application deployment status
- Database management tools

## 🚀 Deployment

### Render (Recommended)

1. Fork this repository
2. Click "Deploy to Render" button above
3. Configure environment variables
4. Deploy automatically builds and starts

### Manual Deployment

#### Unix/Linux/macOS:
1. **Build Production**:
   ```bash
   npm run build
   ```

2. **Start Server**:
   ```bash
   npm start
   ```

#### Windows:
1. **Build Production**:
   ```cmd
   npm run build
   ```

2. **Start Server**:
   ```cmd
   npm start
   ```

### Environment Variables

Required for production:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
ADMIN_TOKEN=your-admin-access-token
DATABASE_URL=file:./data/database.sqlite
CORS_ORIGIN=https://yourdomain.com
```

## 📝 API Documentation

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/logs` - System logs

### Rate Limits
- Authentication: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Admin: 20 requests per 15 minutes

## 🔧 Configuration

### Window System
- Customizable window controls (close/minimize/maximize)
- Persistent window positions and sizes
- Theme-aware styling with CSS variables

### Theme System
- 53+ gradient background options
- Custom color schemes
- Real-time preview and application
- LocalStorage persistence

## 📋 Scripts

```json
{
  "dev": "Start development server",
  "build": "Build production bundle",
  "start": "Start production server",
  "preview": "Preview production build",
  "db:setup": "Initialize database",
  "db:seed": "Seed demo data",
  "db:migrate": "Run database migrations",
  "lint": "ESLint code checking",
  "test": "Run test suite"
}
```

## 🐳 Docker Support

### Development
#### Unix/Linux/macOS & Windows (WSL2/PowerShell):
```bash
docker-compose up
```

#### Windows (Command Prompt):
```cmd
docker-compose up
```

### Production
#### Unix/Linux/macOS & Windows (WSL2/PowerShell):
```bash
docker build -t limedrop-desktop .
docker run -p 3000:3000 limedrop-desktop
```

#### Windows (Command Prompt):
```cmd
docker build -t limedrop-desktop .
docker run -p 3000:3000 limedrop-desktop
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/limedrop-soup/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/limedrop-soup/discussions)
- **Email**: support@limedrop.com

## 🏆 Credits

Built with ❤️ using:
- React 18 & Vite
- Express.js & SQLite
- Docker & Render
- Font Awesome Icons

---

**Ready to deploy?** Use the one-click deploy buttons above for instant investor demos! 🚀
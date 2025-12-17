# Property Rental Management System

A full-stack web application for managing property rentals with role-based access control.

## 🏗️ Architecture

- **Frontend**: React + Tailwind CSS + Vite
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens

## 📁 Project Structure

```
/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Database services
│   │   ├── db/          # Database connection & schema
│   │   └── server.js    # Main server file
│   └── package.json
├── frontend/          # React application
│   ├── src/
│   └── package.json
└── README.md
```

## 🚀 Features

### For Property Owners
- Add and manage properties
- View owned properties
- Track rental history

### For Tenants
- Search properties by locality
- View property details
- Rent properties

### For Managers
- Monitor all properties and rentals
- View user information
- System administration

## 🛠️ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Windows PowerShell (for automated setup)

### Automated Setup (Recommended)
1. Run the setup script:
   ```bash
   setup.bat
   ```
   This will:
   - Create the PostgreSQL database
   - Set up tables and functions
   - Insert sample data
   - Install dependencies

2. Start the application:
   ```powershell
   .\run.ps1
   ```
   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

3. Open http://localhost:5173 in your browser

### Sample Login Credentials
- **Owner**: username: `john_smith`, password: `password` (Aadhar: 100000000001)
- **Tenant**: username: `sarah_j`, password: `password` (Aadhar: 100000000002)
- **Manager**: username: `admin`, password: `password` (Aadhar: 100000000005)

### Manual Setup
If automated setup doesn't work:

1. **Database Setup**:
   - Create a PostgreSQL database named `property_rental`
   - Run the SQL files in order:
     ```sql
     -- Run these in your PostgreSQL client
     \i backend/src/db/schema.sql
     \i backend/src/db/functions.sql
     \i backend/src/db/seed.sql
     ```

2. **Environment Variables**:
   Create `backend/.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=property_rental
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

3. **Install Dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Start Servers**:
   ```bash
   # Backend
   cd backend && npm run dev

   # Frontend (new terminal)
   cd frontend && npm run dev
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Properties
- `GET /api/properties/search?locality={locality}` - Search properties
- `POST /api/properties` - Add new property
- `GET /api/properties/owner/:ownerId` - Get owner's properties

### Rentals
- `GET /api/rentals/history/:propertyId` - Get rental history
- `GET /api/rentals/tenant/:propertyId` - Get current tenant

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User information with role-based access
- `properties` - Property listings
- `rentals` - Rental agreements
- `phone` - User phone numbers
- `other_facilities` - Property facilities
- `residential_property` - Residential property details
- `commercial_property` - Commercial property details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

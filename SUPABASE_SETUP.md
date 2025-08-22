# Supabase Authentication Setup Guide

This guide shows how to add Supabase authentication to your React app **without affecting your existing backend or database**.

## 🚀 Quick Setup

### 1. Install Supabase Dependency

```powershell
# Install Supabase JavaScript client
npm install @supabase/supabase-js
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for project to be created (2-3 minutes)

### 3. Get Your Supabase Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public key**

### 4. Set Environment Variables

Create a `.env` file in your project root (or update existing one):

```env
# Add these lines to your .env file:
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 5. Configure Email Authentication in Supabase

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (for development)
3. Add **Redirect URLs**:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/reset-password`
   - `https://your-app-domain.com/dashboard` (for production)
   - `https://your-app-domain.com/reset-password` (for production)

### 6. Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation and password reset emails
3. Make sure the action links point to your app's URLs

## 🔧 Integration with Your App

### Update Your App.jsx

Replace your existing routing with this pattern:

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ResetPassword from './pages/ResetPassword';
// Your existing components
import DashboardPage from './components/pages/DashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes - Wrap existing routes with ProtectedRoute */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Add ProtectedRoute to all your existing protected routes */}
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              {/* Your existing Projects component */}
            </ProtectedRoute>
          } 
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### Get Current User in Components

```jsx
import { getCurrentUser, isUserVerified } from '../lib/supabaseClient';

const MyComponent = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser && isUserVerified(currentUser)) {
        setUser(currentUser);
      }
    };
    fetchUser();
  }, []);

  return (
    <div>
      {user && <p>Welcome, {user.email}!</p>}
    </div>
  );
};
```

## 🖥️ Local Development

```powershell
# Start your development server
npm start

# Your app will be available at:
# http://localhost:3000
```

## 🌐 DigitalOcean App Platform Deployment

### 1. Set Environment Variables in DigitalOcean

1. Go to your App in DigitalOcean Control Panel
2. Go to **Settings** → **App-Level Environment Variables**
3. Add these variables:

```
REACT_APP_SUPABASE_URL = https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY = your_supabase_anon_key_here
```

### 2. Update Supabase URL Configuration

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Update **Site URL** to your production URL: `https://your-app.ondigitalocean.app`
3. Add production **Redirect URLs**:
   - `https://your-app.ondigitalocean.app/dashboard`
   - `https://your-app.ondigitalocean.app/reset-password`

### 3. Deploy

```powershell
# Push your changes to trigger deployment
git add .
git commit -m "Add Supabase authentication"
git push origin main
```

## 📧 Email Configuration

### Development Testing
- Use a real email address for testing
- Check spam folder for verification emails
- Supabase provides 50,000 free email authentications per month

### Production Email
- For production, consider configuring custom SMTP in Supabase
- Go to **Settings** → **Auth** → **SMTP Settings**
- Configure your email provider (SendGrid, Mailgun, etc.)

## 🔐 Security Features

✅ **Email verification required** - Users must verify email before accessing protected routes  
✅ **Secure password reset** - Reset links expire and are single-use  
✅ **Session management** - Automatic token refresh and secure storage  
✅ **PKCE flow** - More secure authentication flow for public clients  

## 🧪 Testing Authentication

### Test Signup Flow
1. Go to `/login`
2. Click "Sign up"
3. Enter email/password
4. Check email for verification link
5. Click verification link
6. Login with credentials

### Test Password Reset
1. Go to `/login`
2. Click "Forgot password?"
3. Enter email
4. Check email for reset link
5. Click reset link → should go to `/reset-password`
6. Enter new password
7. Login with new password

## ❗ Important Notes

- **Your existing backend remains unchanged** - Supabase only handles authentication
- **Your PostgreSQL database is separate** - No connection to Supabase database
- **API calls unchanged** - Your existing API endpoints work as before
- **Environment variables** - Use `REACT_APP_` prefix for Create React App

## 🐛 Troubleshooting

### Common Issues

**1. "Invalid redirect URL" error:**
- Make sure your redirect URLs are configured in Supabase
- Check that URLs match exactly (including http/https)

**2. Environment variables not working:**
- Restart development server after adding env vars
- Use `REACT_APP_` prefix for Create React App

**3. Email verification not working:**
- Check spam folder
- Verify Supabase email settings
- Make sure Site URL is correct

**4. Authentication state not persisting:**
- Check browser local storage
- Verify Supabase client configuration

### Debug Mode

Add this to your component to debug auth state:

```jsx
import { supabase } from '../lib/supabaseClient';

useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session);
    console.log('User:', session?.user);
  });
}, []);
```

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Router Documentation](https://reactrouter.com/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

---

**That's it!** Your app now has secure authentication with email verification and password reset, completely separate from your existing backend.
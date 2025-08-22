import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ResetPassword from './pages/ResetPassword';
import DashboardPage from './components/pages/DashboardPage';

// Example App.jsx with Supabase authentication
// This shows how to integrate the auth components with your existing app

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes - Wrap with ProtectedRoute */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Add more protected routes as needed */}
        <Route 
          path="/projects" 
          element={
            <ProtectedRoute>
              {/* Your existing Projects component */}
              <div>Projects Page (Protected)</div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              {/* Your existing Settings component */}
              <div>Settings Page (Protected)</div>
            </ProtectedRoute>
          } 
        />

        {/* Default redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

/*
INTEGRATION NOTES:
==================

1. Import the auth components at the top of your existing App.jsx:
   - Login
   - ProtectedRoute  
   - ResetPassword

2. Wrap any routes that require authentication with <ProtectedRoute>:
   
   Before:
   <Route path="/dashboard" element={<DashboardPage />} />
   
   After:
   <Route 
     path="/dashboard" 
     element={
       <ProtectedRoute>
         <DashboardPage />
       </ProtectedRoute>
     } 
   />

3. Add the public auth routes:
   - /login - Login page
   - /reset-password - Password reset page

4. The ProtectedRoute component will:
   - Check if user is logged in AND email is verified
   - Show loading spinner while checking
   - Redirect to /login if not authenticated
   - Render the protected content if authenticated

5. Your existing backend API calls remain unchanged. 
   Supabase is ONLY handling authentication, not your data.

6. To get the current user in any component:
   
   import { getCurrentUser } from './lib/supabaseClient';
   
   const user = await getCurrentUser();
   if (user) {
     console.log('User email:', user.email);
   }

7. To sign out from anywhere in your app:
   
   import { signOut } from './lib/supabaseClient';
   
   const handleLogout = async () => {
     await signOut();
     window.location.href = '/login';
   };
*/
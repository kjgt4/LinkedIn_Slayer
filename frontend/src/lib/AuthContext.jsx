import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Sync user to backend on sign in
  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !isSignedIn || !user || isUserSynced) return;

      try {
        const token = await getToken();
        if (!token) return;

        await axios.post(
          `${API_URL}/api/auth/sync`,
          {
            email: user.primaryEmailAddress?.emailAddress || '',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            image_url: user.imageUrl || ''
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setIsUserSynced(true);
        setSyncError(null);
      } catch (error) {
        console.error('Failed to sync user:', error);
        setSyncError(error.message);
        // Still mark as synced to prevent infinite retries
        setIsUserSynced(true);
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken, isUserSynced]);

  // Reset sync state on sign out
  useEffect(() => {
    if (!isSignedIn) {
      setIsUserSynced(false);
    }
  }, [isSignedIn]);

  // Create authenticated API instance
  const createAuthenticatedRequest = useCallback(async () => {
    if (!isSignedIn) {
      throw new Error('Not authenticated');
    }
    const token = await getToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }, [isSignedIn, getToken]);

  const value = {
    isLoaded,
    isSignedIn,
    userId,
    user,
    isUserSynced,
    syncError,
    getToken,
    createAuthenticatedRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Settings from "@/pages/Settings";
import Library from "@/pages/Library";
import KnowledgeVault from "@/pages/KnowledgeVault";
import Analytics from "@/pages/Analytics";
import VoiceProfile from "@/pages/VoiceProfile";
import Layout from "@/components/Layout";
import EngagementTimer from "@/components/EngagementTimer";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/lib/AuthContext";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function App() {
  return (
    <div className="App min-h-screen bg-obsidian">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth routes */}
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="editor" element={<Editor />} />
              <Route path="editor/:postId" element={<Editor />} />
              <Route path="library" element={<Library />} />
              <Route path="vault" element={<KnowledgeVault />} />
              <Route path="voice" element={<VoiceProfile />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <SignedIn>
            <EngagementTimer />
          </SignedIn>
        </BrowserRouter>
      </AuthProvider>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;

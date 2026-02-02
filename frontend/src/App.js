import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { ThemeProvider } from "next-themes";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Settings from "@/pages/Settings";
import Library from "@/pages/Library";
import KnowledgeVault from "@/pages/KnowledgeVault";
import Analytics from "@/pages/Analytics";
import VoiceProfile from "@/pages/VoiceProfile";
import InfluencerRoster from "@/pages/InfluencerRoster";
import EngagementQueue from "@/pages/EngagementQueue";
import Pricing from "@/pages/Pricing";
import Layout from "@/components/Layout";
import EngagementTimer from "@/components/EngagementTimer";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/lib/AuthContext";
import { SubscriptionProvider } from "@/hooks/useSubscription";

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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="App min-h-screen bg-background">
        <AuthProvider>
          <BrowserRouter>
            <SignedIn>
              <SubscriptionProvider>
                <Routes>
                  {/* Protected routes */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="editor" element={<Editor />} />
                    <Route path="editor/:postId" element={<Editor />} />
                    <Route path="library" element={<Library />} />
                    <Route path="vault" element={<KnowledgeVault />} />
                    <Route path="voice" element={<VoiceProfile />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="influencers" element={<InfluencerRoster />} />
                    <Route path="engagement" element={<EngagementQueue />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <EngagementTimer />
              </SubscriptionProvider>
            </SignedIn>
            <SignedOut>
              <Routes>
                <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
                <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
                <Route path="*" element={<RedirectToSignIn />} />
              </Routes>
            </SignedOut>
          </BrowserRouter>
        </AuthProvider>
        <Toaster position="bottom-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;

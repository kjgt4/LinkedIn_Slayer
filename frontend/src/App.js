import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Settings from "@/pages/Settings";
import Library from "@/pages/Library";
import KnowledgeVault from "@/pages/KnowledgeVault";
import Analytics from "@/pages/Analytics";
import Layout from "@/components/Layout";
import EngagementTimer from "@/components/EngagementTimer";

function App() {
  return (
    <div className="App min-h-screen bg-obsidian">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="editor" element={<Editor />} />
            <Route path="editor/:postId" element={<Editor />} />
            <Route path="library" element={<Library />} />
            <Route path="vault" element={<KnowledgeVault />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <EngagementTimer />
      </BrowserRouter>
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;

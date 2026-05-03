import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<WorkspaceLayout />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

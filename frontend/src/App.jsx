import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { JobDetails } from './pages/JobDetails';

/**
 * Main App Component
 *
 * Configures client-side routing using React Router:
 *  - Route '/' -> Home dashboard
 *  - Route '/jobs/:id' -> JobDetails page
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

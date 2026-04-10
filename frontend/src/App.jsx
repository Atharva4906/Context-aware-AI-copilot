import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import EducatorDashboard from './pages/EducatorDashboard';
import FloatingQuestionIngest from './components/FloatingQuestionIngest';

function App() {
  return (
    <BrowserRouter>
      <FloatingQuestionIngest />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin" element={<EducatorDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

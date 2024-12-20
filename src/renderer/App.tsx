import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import MainView from './components/MainView';
import SettingsView from './components/SettingsView';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/*" element={<MainView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

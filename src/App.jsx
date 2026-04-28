// Top-level route map for the CoStream frontend.
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import WatchRoom from './pages/WatchRoom.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:roomId" element={<WatchRoom />} />
    </Routes>
  );
}

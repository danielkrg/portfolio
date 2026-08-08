import { Route, Routes } from "react-router-dom";
import Dashboard from './Dashboard';
import Horoscope from './Horoscope'; 
import Error from "./Error";
import Home from "./Home"
import { UserDataProvider } from '../Components/UserDataContext';
// import Waves from '../assets/SVGs/layeredWavesHome.svg?react'

export default function App() {
  return (
    <div className="starsync">
      <UserDataProvider>
        <Routes >
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="horoscope" element={<Horoscope />} />
          <Route path="error" element={<Error />} />
        </Routes>
      </UserDataProvider>
    </div>
  );
}

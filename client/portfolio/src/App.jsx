import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Cursor from "./components/Cursor";
import Home from "./pages/Home";
import StarSyncWrapper from "./apps/StarSyncWrapper";

function Layout() {
  const [isDark, setIsDark] = useState(false);
  const [isFrench, setIsFrench] = useState(false);
  const location = useLocation();
  const inStarSync = location.pathname.startsWith("/apps/starsync");

  return (
    <>
      <Cursor dark={isDark || inStarSync} />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              isDark={isDark}
              setIsDark={setIsDark}
              isFrench={isFrench}
              setIsFrench={setIsFrench}
            />
          }
        />
        <Route path="/apps/starsync/*" element={<StarSyncWrapper />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
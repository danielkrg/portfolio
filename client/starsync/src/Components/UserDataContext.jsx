import { createContext, useState, useEffect, useContext } from "react";
import longTermDemo from '../assets/DemoData/longTermDemo.json'
import shortTermDemo from '../assets/DemoData/shortTermDemo.json'
import axios from "axios";
import { useNavigate } from "react-router-dom";

const UserDataContext = createContext();

export function UserDataProvider({ children }) {
    const navigate = useNavigate();
    const [longTermData, setLongTermData] = useState(null);
    const [shortTermData, setShortTermData] = useState(null);
    const [isDemo, setIsDemo] = useState(() => localStorage.getItem('demoMode') === 'true');
    const [accessToken, setAccessToken] = useState(() => {
      // Pick up token from URL if redirected from Spotify callback
      const params = new URLSearchParams(window.location.search);
      return params.get('token') || null;
    });
  
    const fetchLongTermData = async (token = accessToken) => {
      try {
        if (!token) return;
        const response = await axios.get('/api/starsync/userdata?time_range=long_term', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLongTermData(response.data);
      } catch (error) {
        console.error("Error fetching long-term user data:", error);
        navigate('error');
      }
    };
  
    const fetchShortTermData = async (token = accessToken) => {
      try {
        if (!token) return;
        const response = await axios.get('/api/starsync/userdata?time_range=short_term', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setShortTermData(response.data);
      } catch (error) {
        console.error("Error fetching short-term user data:", error);
        navigate('error');
      }
    };
  
    const fetchDemoData = () => {
      setLongTermData(longTermDemo);
      setShortTermData(shortTermDemo);
    };
  
    useEffect(() => {
      if (isDemo) {
        fetchDemoData();
      } else if (accessToken) {
        fetchLongTermData(accessToken);
        fetchShortTermData(accessToken);
        // Clean token from URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, [isDemo, accessToken]);
  
    return (
      <UserDataContext.Provider value={{ longTermData, shortTermData, isDemo, setIsDemo, accessToken, setAccessToken, fetchLongTermData, fetchShortTermData }}>
        {children}
      </UserDataContext.Provider>
    );
  }
  
export function useUserData() {
    return useContext(UserDataContext);
}

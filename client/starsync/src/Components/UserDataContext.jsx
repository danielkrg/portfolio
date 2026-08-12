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

    // Function to fetch long-term data
    const fetchLongTermData = async () => {
        try {
            console.log('fetching auth check...');
            const authCheck = await axios.get(`/api/starsync/checkAuth`, { withCredentials: true });
            console.log('authCheck:', authCheck.data);
            if (!authCheck.data.authenticated) {
                return;
            }
            console.log('fetching userdata...');
            const response = await axios.get(`/api/starsync/userdata?time_range=long_term`, { withCredentials: true });
            console.log('userdata:', response.data);
            setLongTermData(response.data);
        } catch (error) {
            console.error("Error fetching long-term user data:", error);
            navigate('error');
        }
    };

    // Function to fetch short-term data
    const fetchShortTermData = async () => {
        try {
            const authCheck = await axios.get(`/api/starsync/checkAuth`, { withCredentials: true });
            if (!authCheck.data.authenticated) return;
            
            const response = await axios.get(`/api/starsync/userdata?time_range=short_term`, { withCredentials: true });
            setShortTermData(response.data);
        } catch (error) {
            console.error("Error fetching short-term user data:", error);
            navigate('error');
        }
    };

    const fetchDemoData = async () => {
        setLongTermData(longTermDemo);
        setShortTermData(shortTermDemo);
    }

    useEffect(() => {
        if (isDemo) {
            fetchDemoData();
        } else {
            fetchLongTermData();
            fetchShortTermData();
        }
        console.log('isDemo:', isDemo);
        console.log('longTermData:', longTermData);
        console.log('shortTermData:', shortTermData);
    }, [isDemo]);

    return (
        <UserDataContext.Provider value={{ longTermData, shortTermData, isDemo, fetchLongTermData, fetchShortTermData, setIsDemo }}>
            {children}
        </UserDataContext.Provider>
    );
}

export function useUserData() {
    return useContext(UserDataContext);
}

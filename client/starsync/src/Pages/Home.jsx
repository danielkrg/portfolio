import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
// import Waves from '../assets/SVGs/layeredWavesHome.svg?react'

function Home({ preview = false }) {
    const navigate = useNavigate();
    const messages = ['Welcome to StarSync', 'View Your Top Tracks', 'Discover Your Musical Horoscope', 'Log in to Begin'];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [phase, setPhase] = useState('typing');

    const handleExit = () => {
      navigate("../");
    };
  
    useEffect(() => {
      if (preview) {
        setDisplayedText('');
        setPhase('typing');
        setCurrentIndex(0);
        return;
      }
      
      const currentMessage = messages[currentIndex];
      let timeout;
  
      if (phase === 'typing') {
        if (displayedText.length < currentMessage.length) {
          timeout = setTimeout(() => {
            setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
          }, 100);
        } 
        else {
          // Typing done → pause before deleting
          setTimeout(() => setPhase('pausing'), 2500);
        }
      } 
      else if (phase === 'pausing') {
        // Just hold the message for a bit longer before deleting
        timeout = setTimeout(() => setPhase('deleting'), 2000);
      } 
      else if (phase === 'deleting') {
        if (displayedText.length > 0) {
          timeout = setTimeout(() => {
            setDisplayedText(currentMessage.slice(0, displayedText.length - 1));
          }, 50);
        } else {
          // Move to next message and start typing
          setCurrentIndex((prev) => (prev + 1) % messages.length);
          setPhase('typing');
        }
      }
  
      return () => clearTimeout(timeout);
    }, [displayedText, phase, currentIndex]);
  
    const handleLogin = () => {
      window.location.href = 'http//localhost:5001/api/starsync/login';
    };
  
    return (
      <div className="relative flex flex-col h-screen bg-gradient-to-t from-pink-950 to-indigo-950 overflow-hidden">
        <div className="absolute top-4 left-4 text-right z-50 animate-fadeInMed">
          <button
            onClick={ handleExit }
            className={`font-semibold text-pink-500 hover:text-red-500
            py-2 px-4 rounded-full cursor-pointer
            transition-all duration-300 ease-in-out`}
          >
            Exit
          </button>
        </div>
        
        <div className="absolute top-4 right-4 text-right z-50 animate-fadeInMed">
          <button
            onClick={() => navigate('dashboard')}
            className={`font-semibold text-pink-500 hover:text-green-500
            py-2 px-4 rounded-full cursor-pointer
            transition-all duration-300 ease-in-out`}
          >
            View Demo
          </button>
        </div>
  
        <div className="flex flex-col items-center space-y-40 text-center pt-50 flex-grow z-10 animate-fadeInMed">
          <h1
            className="font-bold text-5xl text-pink-100 leading-tight h-14 px-5"
          >
            {preview ? '' : displayedText}
            <span className="animate-blinking-cursor">|</span>
          </h1>
  
          <button
            onClick={handleLogin}
            className="border-2 border-pink-600 hover:border-green-500 
              font-semibold text-pink-600 hover:text-green-500
              py-2 px-4 rounded-full cursor-pointer
              transition-all duration-300 ease-in-out
              hover:shadow-[0_0_10px_2px_rgba(29,185,84,0.6)]
              animate-fadeInMed"
          >
            Login With Spotify
          </button>
        </div>
  
        {/* <div className="absolute bottom-0 left-0 w-full pointer-events-none z-0">
          <Waves className="w-full h-auto" />
        </div> */}
      </div>
    );
  }
  
export default Home
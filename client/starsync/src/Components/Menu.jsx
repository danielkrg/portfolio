import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import useMobile from '@shared/hooks/useMobile'
import { useNavigate } from "react-router-dom";

function Menu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const handleLogin = () => {
    setIsOpen(false)
    localStorage.setItem('demoMode', 'false');
    window.location.href = `/api/starsync/login`;
  };
  const isDemo = localStorage.getItem('demoMode') === 'true'
  const mobile = useMobile();

  const handleExit = () => {
    if (window.parent !== window) {
      // Running inside portfolio iframe
      window.parent.postMessage("starsync:exit", "*");
    }
  };

  return (
    <div className={`absolute flex ${mobile ? "" : "flex-col"} left-0 ml-5 mt-5 z-10`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-pink-100 font-bold px-4 py-2 transition-all ease-in-out duration-300 cursor-pointer"
      >
        {!isOpen ? <Bars3Icon className="w-6 h-6 animate-fadeInFast hover:text-green-500 transition-all ease-in-out duration-300" /> 
        : <XMarkIcon className="w-6 h-6 animate-fadeInFast hover:text-red-500 transition-all ease-in-out duration-300" />}
      </button>

      {isOpen && (
        <div className={`flex ${mobile ? "justify-between gap-5 items-center text-sm max-w-3/4" : "flex-col space-y-5 mt-2"} text-pink-100/40`}>
          <Link
            to="../dashboard"
            className="hover:text-green-500 transition-all ease-in-out duration-300"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="../horoscope"
            className="hover:text-green-500 transition-all ease-in-out duration-300"
            onClick={() => setIsOpen(false)}
          >
            Horoscope
          </Link>
          {isDemo ? <button
            onClick={() => handleLogin()}
            className={`${isDemo ? "cursor-pointer" : "opacity-0 pointer-events-none"} hover:text-green-500 transition-all ease-in-out duration-300`}>
            Try With Your Own Account
          </button>
          : <></>}
          <Link
            to="../../"
            className="hover:text-red-500 transition-all ease-in-out duration-300"
            onClick={ handleExit }
          >
            Exit
          </Link>
        </div>
      )}
    </div>
  );
}

export default Menu;

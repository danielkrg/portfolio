import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

import Annecy from '../assets/images/annecy.jpg';
import Backpack from '../assets/images/backpack.jpg';
import Grad from '../assets/images/grad.jpg';
import Kelp from '../assets/images/kelp.jpg';
import TdF from '../assets/images/tdf.jpg';
import Tent from '../assets/images/tent.jpg';
import Vancouver from '../assets/images/vancouver.jpg';
import Vienna from '../assets/images/vienna.jpg';
import Widgeon from '../assets/images/widgeon.jpg';
import Freitag from '../assets/images/freitag.jpg';

const images = [
  Grad, TdF, Kelp, Vancouver, Widgeon, Backpack, Tent, Annecy, Freitag, Vienna
]

export default function ImageCarousel({ dimmed = false, isDark = false, captions = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);

  const textColor = isDark ? "text-white/30" : "text-black/30";
  const textColorMid = isDark ? "text-white/50" : "text-black/50";
  const hoverColor = isDark ? "hover:text-white" : "hover:text-black";

  const closeFullscreen = () => {
    setClosing(true);
    setTimeout(() => {
      setFullscreen(false);
      setClosing(false);
    }, 500);
  };

  const change = (direction, e) => {
    e?.stopPropagation();
    setCurrentIndex((curr) =>
      direction === 'left'
        ? (curr - 1 + images.length) % images.length
        : (curr + 1) % images.length
    );
  };

  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') change('left');
      else if (e.key === 'ArrowRight') change('right');
      else if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen, currentIndex]);

  const image = images[currentIndex];
  const caption = captions[currentIndex]

  return (
    <>
      <div className="relative flex flex-col items-center mt-5">
        <div className="absolute top-1 right-1">
          <p className={`text-sm font-extralight ${textColor}`}>
            {`${currentIndex + 1} / ${images.length}`}
          </p>
        </div>

        <div className="relative w-[450px] h-[450px] flex items-center justify-center">
          <img
            key={currentIndex}
            src={image}
            onClick={() => setFullscreen(true)}
            data-cursor="image"
            className="max-w-full max-h-full animate-fadeInMed"
            style={{
              opacity: dimmed ? 0.5 : 1,
              transition: "opacity 500ms ease",
            }}
          />
        </div>

        <div className="flex w-125 p-10 items-center justify-between">
          <button
            onClick={(e) => change("left", e)}
            className={`h-6 w-6 ${textColorMid} ${hoverColor} transition-all duration-300 ease-in-out cursor-pointer`}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <p
            key={`${currentIndex}-${caption}`}
            className={`text-m font-extralight ${textColorMid} animate-fadeInFast ease-in-out tracking-normal text-center`}
          >
            {caption}
          </p>
          <button
            onClick={(e) => change("right", e)}
            className={`h-6 w-6 ${textColorMid} ${hoverColor} transition-all duration-300 ease-in-out cursor-pointer`}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center animate-fadeInFast"
          style={{
            zIndex: 50,
            opacity: closing ? 0 : undefined,
            transition: "opacity 500ms ease",
          }}
          onClick={() => closeFullscreen()}
        >
          <button
            onClick={() => closeFullscreen()}
            className="absolute top-5 left-5 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>

          <div className="absolute top-5 right-5">
            <p className="text-sm text-white/50">
              {`${currentIndex + 1} / ${images.length}`}
            </p>
          </div>

          <button
            onClick={(e) => change("left", e)}
            className="absolute left-6 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <ChevronLeftIcon className="h-10 w-10" />
          </button>

          <div
            className="flex flex-col items-center gap-6 px-24"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={currentIndex}
              src={image}
              className="max-h-[80vh] max-w-[80vw] object-contain animate-fadeInFast"
            />
            <p className="text-white/50 font-light tracking-normal text-center">
              {caption}
            </p>
          </div>

          <button
            onClick={(e) => change("right", e)}
            className="absolute right-6 text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <ChevronRightIcon className="h-10 w-10" />
          </button>
        </div>
      )}
    </>
  );
}
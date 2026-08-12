import { useState, useEffect } from "react";

const SELECTORS = [
  'button',
  'a',
  '[role="button"]',
  'input',
  'select',
  'textarea',
  '[data-cursor]',
];

export default function Cursor({ dark = false }) {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) return null;
  
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [state, setState] = useState("default");
  const color = dark ? "white" : "black";
  const labelColor = dark ? "black" : "white";

  useEffect(() => {
    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });

      const target = e.target;

      if (target.closest('[data-cursor="app"]')) {
        setState("app");
      } else if (target.closest('[data-cursor="image"]')) {
        setState("image");
      } else if (SELECTORS.some((sel) => target.closest(sel))) {
        setState("hover");
      } else {
        setState("default");
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const styles = {
    default: {
      width: 16,
      height: 16,
      borderRadius: "50%",
    },
    hover: {
      width: 30,
      height: 30,
      borderRadius: "50%",
    },
    image: {
      width: 30,
      height: 30,
      borderRadius: "50%",
    },
    app: {
      width: 50,
      height: 30,
      borderRadius: "999px",
    },
  };

  return (
    <>
      {/* Hide default cursor globally */}
      <style>{`* { cursor: none !important; }`}</style>

      <div
        style={{
          position: "fixed",
          top: pos.y,
          left: pos.x,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 9999,
          background: color,
          opacity: 0.3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...styles[state],
          transition: "width 300ms ease, height 300ms ease, border-radius 300ms ease, opacity 300ms ease, background 300ms ease",
        }}
      >
        {state === "image" && (
          <span style={{ fontSize: 18, opacity: 1, color: labelColor}}>+</span>
        )}
        {state === "app" && (
          <span style={{ fontSize: 12, letterSpacing: "0.1em", opacity: 1, color: labelColor }}>
            click
          </span>
        )}
      </div>
    </>
  );
}
import { useNavigate } from "react-router-dom";
import PhotosApp from "@client/photos";
import { light, dark } from "../styling/theme";
import galleryCover from "@shared/galleryCoverPhoto/DSCF6913.jpg";

// The Photos app uses the shared portfolio theme, but with a neutral dark-gray
// backdrop in dark mode instead of the portfolio's dark green — a one-token
// override, so there is no near-duplicate theme to maintain.
const PHOTOS_DARK_BG = "bg-[#1a1a1a]";

export default function PhotosWrapper({ isDark, setIsDark }) {
  const navigate = useNavigate();
  const theme = isDark ? { ...dark, bg: PHOTOS_DARK_BG } : light;

  return (
    <div className="fixed inset-0 overflow-y-scroll">
      <PhotosApp
        isDark={isDark}
        setIsDark={setIsDark}
        theme={theme}
        coverUrl={galleryCover}
        onExit={() => navigate("/")}
      />
    </div>
  );
}

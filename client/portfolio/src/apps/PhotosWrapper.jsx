import { useNavigate } from "react-router-dom";
import PhotosApp from "@client/photos";
import { dark } from "../styling/theme";
import galleryCover from "@shared/galleryCoverPhoto/DSCF6913.jpg";

// The Photos app is always dark, regardless of the portfolio's global theme,
// with a near-black backdrop (darker than the portfolio's dark green) — a
// one-token override of the shared dark theme, so there is no near-duplicate
// theme to maintain.
const PHOTOS_DARK_BG = "bg-[#1a1a1a]";

export default function PhotosWrapper() {
  const navigate = useNavigate();
  const theme = { ...dark, bg: PHOTOS_DARK_BG };

  return (
    <div className="fixed inset-0 overflow-y-scroll">
      <PhotosApp
        isDark={true}
        setIsDark={() => {}}
        theme={theme}
        coverUrl={galleryCover}
        onExit={() => navigate("/")}
      />
    </div>
  );
}

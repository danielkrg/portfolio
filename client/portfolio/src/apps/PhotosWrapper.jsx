import { useNavigate } from "react-router-dom";
import PhotosApp from "@client/photos";
import { light, dark } from "../styling/theme";

export default function PhotosWrapper({ isDark, setIsDark }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 overflow-y-scroll">
      <PhotosApp
        isDark={isDark}
        setIsDark={setIsDark}
        theme={isDark ? dark : light}
        onExit={() => navigate("/")}
      />
    </div>
  );
}

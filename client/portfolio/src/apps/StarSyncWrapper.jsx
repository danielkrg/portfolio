import { useNavigate } from "react-router-dom";
import StarSyncApp from "@client/starsync";

export default function StarSyncWrapper() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <StarSyncApp onExit={() => navigate("/")} />
    </div>
  );
}
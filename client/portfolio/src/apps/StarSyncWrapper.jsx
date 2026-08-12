import { useNavigate } from "react-router-dom";
import StarSyncApp from "@client/starsync";

export default function StarSyncWrapper() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 overflow-hidden">
      <StarSyncApp onExit={() => navigate("/")} />
    </div>
  );
}
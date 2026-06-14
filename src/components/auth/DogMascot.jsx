import { useEffect, useRef, useState } from "react";
import mascotDogSprite from "../../assets/brand/mascot-dog-pant-sprite.png";

export default function DogMascot() {
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    timerRef.current = window.setTimeout(() => setRunning(false), 2800);
  };

  return (
    <div className={`dog-mascot-stage${running ? " is-running" : ""}`}>
      <button
        type="button"
        className="dog-mascot-button"
        onClick={handleRun}
        aria-label="춘배투어 강아지 달리기"
        disabled={running}
      >
        <span
          className="dog-mascot-sprite"
          style={{ "--dog-sprite": `url(${mascotDogSprite})` }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

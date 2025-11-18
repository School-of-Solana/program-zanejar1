"use client";

import { useState, useEffect } from "react";

interface TimeRemainingProps {
  deadline: number;
  className?: string;
}

export function TimeRemaining({ deadline, className = "" }: TimeRemainingProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = deadline - now;

      if (remaining <= 0) {
        setIsEnded(true);
        setTimeLeft("Ended");
        return;
      }

      setIsEnded(false);

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className={`${className} ${isEnded ? "text-foreground/40" : "text-foreground/70"}`}>
      {isEnded ? "Ended" : `${timeLeft} left`}
    </span>
  );
}

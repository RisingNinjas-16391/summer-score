"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ColorFlash() {
  const [color, setColor] = useState("black");
  const [timer, setTimer] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "realtime", "timer"), (docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      if (data.reset) {
        setColor("black");
        setTimer(null);
        setIsRunning(false);
        setCountdown(0);
        return;
      }

      setIsRunning(!!data.start && !data.paused);
      if (typeof data.timer === "number") {
        setTimer(data.timer);
      }

      if (typeof data.countdown === "number") {
        setCountdown(data.countdown);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (
      isRunning &&
      timer === 120 && // match just started after 8-second countdown
      countdown === 0
    ) {
      let step = 0;
      const sequence = [
        "red", "blue", "red", "blue", "red", "blue",
        "red", "blue", "red", "blue", "red", "blue",
      ];

      interval = setInterval(() => {
        if (step >= sequence.length) {
          setColor("black");
          clearInterval(interval);
          return;
        }
        setColor(sequence[step]);
        step++;
      }, 5000); // every 5 seconds
    }

    return () => clearInterval(interval);
  }, [isRunning, timer, countdown]);

  return (
    <div
      style={{
        backgroundColor: color,
        height: "100vh",
        width: "100vw",
        transition: "background-color 0.5s ease",
      }}
    />
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ColorFlash() {
  const [timer, setTimer] = useState(150);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInCountdown, setIsInCountdown] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [playedTransition, setPlayedTransition] = useState(false);

  const [backgroundColor, setBackgroundColor] = useState("black");
  const [flashing, setFlashing] = useState(false);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null); // ← added

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "realtime", "timer"), async (docSnap) => {
      const data = docSnap.data();

      if (data?.start) {
        setIsRunning(true);
        setIsPaused(false);
        setPlayedTransition(false);
      }

      if (data?.reset) {
        setIsRunning(false);
        setTimer(150);
        setIsInCountdown(false);
        setCountdown(8);
        setPlayedTransition(false);
        setIsPaused(false);
        setBackgroundColor("black");
        setFlashing(false);

        if (flashIntervalRef.current) {
          clearInterval(flashIntervalRef.current);
          flashIntervalRef.current = null;
        }
        return;
      }

      if (data?.paused) {
        setIsPaused(true);
        setIsRunning(false);
      }

      if (data?.finished) {
        setIsRunning(false);
        setFlashing(false);
        setBackgroundColor("black");
      }
    });

    return () => unsub();
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning || isPaused || isInCountdown) return;

    let current = timer;
    const interval = setInterval(() => {
      current--;
      if (current === 120 && !playedTransition) {
        clearInterval(interval);
        setIsInCountdown(true);
        setCountdown(8);
        setPlayedTransition(true);
        return;
      }

      if (current === 0) {
        clearInterval(interval);
        setIsRunning(false);
      }

      setTimer(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, isInCountdown, playedTransition, timer]);

  // Countdown logic
  useEffect(() => {
    if (!isInCountdown) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(120);
          setBackgroundColor("red");
          setFlashing(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isInCountdown]);

  // Flashing start logic
  useEffect(() => {
    if (timer <= 60 && flashing) {
      setFlashing(false);
      setBackgroundColor("black");

      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
    }
  }, [timer, flashing]);

  // Color alternating logic
  useEffect(() => {
    if (!flashing) return;

    // Only switch color on exact multiples of 5 between 120 and 60
    if (timer <= 120 && timer >= 60 && timer % 5 === 0) {
      const stepIndex = (120 - timer) / 5;
      const colors = ["red", "blue"];
      setBackgroundColor(colors[stepIndex % 2]);
    }

    // End flashing cleanly at 60
    if (timer === 60) {
      setFlashing(false);
      setBackgroundColor("black");
    }
  }, [timer, flashing]);

  const formatTime = (time: number) =>
    `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        backgroundColor,
        height: "100vh",
        width: "100vw",
        transition: "background-color 0.5s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: "8rem",
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {isInCountdown
          ? `0:${countdown.toString().padStart(2, "0")}`
          : formatTime(timer)}
      </h1>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

interface MatchData {
  red_name: string;
  blue_name: string;
  match_number: string;
}

interface ScoreData {
  teamColor: "red" | "blue";
  totalScore: number;
}

export default function Scoreboard() {
  const [match, setMatch] = useState<MatchData>({
    red_name: "Red",
    blue_name: "Blue",
    match_number: "Match",
  });

  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [timer, setTimer] = useState<number>(150); // 2:30
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isInCountdown, setIsInCountdown] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(8);
  const [playedTransition, setPlayedTransition] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Audio refs
  const matchStartSound = useRef<HTMLAudioElement | null>(null);
  const autonomousComplete = useRef<HTMLAudioElement | null>(null);
  const driverControllers = useRef<HTMLAudioElement | null>(null);
  const teleopStart = useRef<HTMLAudioElement | null>(null);
  const endgameStart = useRef<HTMLAudioElement | null>(null);
  const matchEnd = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    matchStartSound.current = new Audio("/sounds/match_start.mp3");
    autonomousComplete.current = new Audio("/sounds/autonomous_complete.mp3");
    driverControllers.current = new Audio("/sounds/drivers_controllers.mp3");
    teleopStart.current = new Audio("/sounds/teleop_start.mp3");
    endgameStart.current = new Audio("/sounds/endgame_start.mp3");
    matchEnd.current = new Audio("/sounds/match_end.mp3");
  }, []);

  // Firestore triggers
  useEffect(() => {
    const unsubTimer = onSnapshot(doc(db, "realtime", "timer"), async (docSnap) => {
      const data = docSnap.data();

      if (data?.start) {
        setIsRunning(true);
        setIsPaused(false);
        setPlayedTransition(false);
        matchStartSound.current?.play();
        await updateDoc(doc(db, "realtime", "timer"), { start: false, paused: false });
      }

      if (data?.reset) {
        setIsRunning(false);
        setTimer(150);
        setIsInCountdown(false);
        setCountdown(8);
        setPlayedTransition(false);
        setIsPaused(false);
        await updateDoc(doc(db, "realtime", "timer"), { reset: false });
      }

      if (data?.paused) {
        setIsPaused(true);
        setIsRunning(false);
      }
    });

    return () => unsubTimer();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isRunning || isInCountdown || isPaused) return;

    let current = timer;
    const interval = setInterval(() => {
      current--;

      if (current === 120 && !playedTransition) {
        clearInterval(interval);
        setIsInCountdown(true);
        setCountdown(8);
        setPlayedTransition(true);
        playTwoTransitionSounds();
        return;
      }

      if (current === 30) {
        endgameStart.current?.play();
      }

      if (current === 0) {
        clearInterval(interval);
        if (matchEnd.current) {
          matchEnd.current.currentTime = 0;
          matchEnd.current.play();
        }
        setIsRunning(false);
      }

      setTimer(current);
      if (current <= 0) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isInCountdown, playedTransition, timer, isPaused]);

  // 8-second countdown
  useEffect(() => {
    if (!isInCountdown || countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;

        if (newCount === 3) {
          if (teleopStart.current) {
            teleopStart.current.currentTime = 0;
            teleopStart.current.play();
          }
        }

        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(120);
        }

        return newCount;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isInCountdown, countdown]);

  const playTwoTransitionSounds = async () => {
    if (!autonomousComplete.current || !driverControllers.current) return;

    autonomousComplete.current.currentTime = 0;
    driverControllers.current.currentTime = 0;

    await autonomousComplete.current.play();
    await new Promise<void>((resolve) => {
      autonomousComplete.current!.onended = () => resolve();
    });

    await driverControllers.current.play();
    await new Promise<void>((resolve) => {
      driverControllers.current!.onended = () => resolve();
    });
  };

  // Fetch scores and match info
  useEffect(() => {
    const unsubMatch = onSnapshot(doc(db, "realtime", "matches"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatch({
          red_name: data.red_name || "Red",
          blue_name: data.blue_name || "Blue",
          match_number: data.match_number || "Match",
        });
      }
    });

    const unsubRed = onSnapshot(doc(db, "realtime", "red"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        setRedScore(data.totalScore || 0);
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        setBlueScore(data.totalScore || 0);
      }
    });

    return () => {
      unsubMatch();
      unsubRed();
      unsubBlue();
    };
  }, []);

  return (
    <div style={{ backgroundColor: "#1a1a1a", color: "white", minHeight: "100vh", padding: "2rem" }}>
      <center>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "bold" }}>{match.match_number}</h1>

        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "3rem" }}>
          <div>
            <h2 style={{ color: "#ff4d4f" }}>{match.red_name}</h2>
            <p style={{ fontSize: "2.5rem" }}>{redScore}</p>
          </div>
          <div>
            <h2 style={{ color: "#4d88ff" }}>{match.blue_name}</h2>
            <p style={{ fontSize: "2.5rem" }}>{blueScore}</p>
          </div>
        </div>

        <div style={{ marginTop: "2rem", fontSize: "2rem" }}>
          {isInCountdown ? (
            <span>0:{countdown.toString().padStart(2, "0")}</span>
          ) : (
            <span>
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
            </span>
          )}
        </div>
      </center>
    </div>
  );
}

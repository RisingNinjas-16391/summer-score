"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Typography, Grid } from "@mui/material";

const matchStartSound = new Audio("/sounds/match_start.mp3");
const autonomousComplete = new Audio("/sounds/autonomous_complete.mp3");
const driverControllers = new Audio("/sounds/drivers_controllers.mp3");
const teleopStart = new Audio("/sounds/teleop_start.mp3");
const endgameStart = new Audio("/sounds/endgame_start.mp3");
const matchEnd = new Audio("/sounds/match_end.mp3");

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

  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [timer, setTimer] = useState(150);
  const [isRunning, setIsRunning] = useState(false);
  const [isInCountdown, setIsInCountdown] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [playedTransition, setPlayedTransition] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    autonomousComplete.load();
    driverControllers.load();
    teleopStart.load();
    endgameStart.load();
    matchEnd.load();
  }, []);

  useEffect(() => {
    const unsubTimer = onSnapshot(doc(db, "realtime", "timer"), async (docSnap) => {
      const data = docSnap.data();
      if (data?.start) {
        setIsRunning(true);
        setIsPaused(false);
        setPlayedTransition(false);
        matchStartSound.play();
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
      if (current === 30) endgameStart.play();
      if (current === 0) {
        clearInterval(interval);
        matchEnd.currentTime = 0;
        matchEnd.play();
        setIsRunning(false);
      }
      setTimer(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isInCountdown, playedTransition, timer, isPaused]);

  useEffect(() => {
    if (!isInCountdown || countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount === 3) teleopStart.play();
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
    autonomousComplete.currentTime = 0;
    driverControllers.currentTime = 0;

    await autonomousComplete.play();
    await new Promise<void>((resolve) => {
      autonomousComplete.onended = () => resolve();
    });

    await driverControllers.play();
    await new Promise<void>((resolve) => {
      driverControllers.onended = () => resolve();
    });
  };

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
  <div style={{ backgroundColor: "#000000", color: "#ffffff", minHeight: "100vh", padding: "1rem" }}>
    <center>
      <Typography variant="h3" component="div" gutterBottom>
        {match.match_number}
      </Typography>
    </center>

    <Grid container spacing={4} paddingX={5} paddingTop={3} paddingBottom={1}>
      {/* Red Team */}
      <Grid size={6}>
        <div
          style={{
            backgroundColor: "#ff0000",
            padding: "2rem",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h2" style={{ color: "#ffffff" }} gutterBottom>
            {match.red_name}
          </Typography>
          <Typography variant="h1" style={{ color: "#ffffff" }}>
            {redScore}
          </Typography>
        </div>
      </Grid>

      {/* Blue Team */}
      <Grid size={6}>
        <div
          style={{
            backgroundColor: "#0000ff",
            padding: "2rem",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h2" style={{ color: "#ffffff" }} gutterBottom>
            {match.blue_name}
          </Typography>
          <Typography variant="h1" style={{ color: "#ffffff" }}>
            {blueScore}
          </Typography>
        </div>
      </Grid>
    </Grid>

    {/* Timer */}
    <Grid container justifyContent="center" paddingTop={2}>
      <Typography variant="h1" sx={{ fontSize: "17rem" }}>
        {isInCountdown
          ? `0:${countdown.toString().padStart(2, "0")}`
          : `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`}
      </Typography>
    </Grid>
  </div>
);
}

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Typography, Grid } from "@mui/material";

interface MatchData {
  red_name: string;
  blue_name: string;
  match_number: string;
}

interface ScoreData {
  teamColor: "red" | "blue";
  totalScore: number;
  penalties?: number;
}

export default function Scoreboard() {
  const [match, setMatch] = useState<MatchData>({
    red_name: "Red",
    blue_name: "Blue",
    match_number: "Match",
  });

  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redPenalties, setRedPenalties] = useState(0);
  const [bluePenalties, setBluePenalties] = useState(0);

  const [timer, setTimer] = useState(150);
  const [isRunning, setIsRunning] = useState(false);
  const [isInCountdown, setIsInCountdown] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [playedTransition, setPlayedTransition] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMatchOver, setIsMatchOver] = useState(false);

  const [showAnimation, setShowAnimation] = useState(false);
  const [animationSrc, setAnimationSrc] = useState("");
  const [showFinalScore, setShowFinalScore] = useState(false);

  const [sounds, setSounds] = useState({
    matchStart: undefined as HTMLAudioElement | undefined,
    autonomousComplete: undefined as HTMLAudioElement | undefined,
    driverControllers: undefined as HTMLAudioElement | undefined,
    teleopStart: undefined as HTMLAudioElement | undefined,
    endgameStart: undefined as HTMLAudioElement | undefined,
    matchEnd: undefined as HTMLAudioElement | undefined,
    results: undefined as HTMLAudioElement | undefined,
    aborted: undefined as HTMLAudioElement | undefined,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSounds({
        matchStart: new Audio("/sounds/match_start.mp3"),
        autonomousComplete: new Audio("/sounds/autonomous_complete.mp3"),
        driverControllers: new Audio("/sounds/drivers_controllers.mp3"),
        teleopStart: new Audio("/sounds/teleop_start.mp3"),
        endgameStart: new Audio("/sounds/endgame_start.mp3"),
        matchEnd: new Audio("/sounds/match_end.mp3"),
        results: new Audio("/sounds/results.wav"),
        aborted: new Audio("/sounds/abort_match.mp3"),
      });
    }
  }, []);

  const playTwoTransitionSounds = async () => {
    const { autonomousComplete, driverControllers } = sounds;
    if (!autonomousComplete || !driverControllers) return;

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
    const unsubTimer = onSnapshot(doc(db, "realtime", "timer"), async (docSnap) => {
      const data = docSnap.data();
      if (data?.start) {
        setIsRunning(true);
        setIsPaused(false);
        setPlayedTransition(false);
        setShowFinalScore(false);
        sounds.matchStart?.play();
        await updateDoc(doc(db, "realtime", "timer"), { start: false, paused: false });
      }
      if (data?.reset) {
        setIsRunning(false);
        setTimer(150);
        setIsInCountdown(false);
        setCountdown(8);
        setPlayedTransition(false);
        setIsPaused(false);
        setIsMatchOver(false);
        setShowAnimation(false);
        setShowFinalScore(false);
        await updateDoc(doc(db, "realtime", "timer"), { reset: false, finished: false });
      }
      if (data?.paused) {
        setIsPaused(true);
        setIsRunning(false);
        sounds.aborted?.play();
      }
      if (data?.finished) {
        setIsMatchOver(true);
        sounds.results?.play();
        setShowAnimation(true);

        const redFinal = redScore + bluePenalties * 5;
        const blueFinal = blueScore + redPenalties * 5;

        if (redFinal > blueFinal) {
          setAnimationSrc("/animations/power_play_red.webm");
        } else if (blueFinal > redFinal) {
          setAnimationSrc("/animations/power_play_blue.webm");
        } else {
          setAnimationSrc("/animations/power_play_tie.webm");
        }
      }
    });

    return () => unsubTimer();
  }, [sounds, redScore, blueScore, redPenalties, bluePenalties]);

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
      if (current === 30) sounds.endgameStart?.play();
      if (current === 0) {
        clearInterval(interval);
        sounds.matchEnd?.play();
        setIsRunning(false);
        setIsMatchOver(true);
      }
      setTimer(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isInCountdown, playedTransition, timer, isPaused, sounds]);

  useEffect(() => {
    if (!isInCountdown || countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount === 3) sounds.teleopStart?.play();
        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(120);
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isInCountdown, countdown, sounds]);

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
        if (!isMatchOver) setRedScore(data.totalScore || 0);
        setRedPenalties(data.penalties || 0);
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        if (!isMatchOver) setBlueScore(data.totalScore || 0);
        setBluePenalties(data.penalties || 0);
      }
    });

    return () => {
      unsubMatch();
      unsubRed();
      unsubBlue();
    };
  }, [isMatchOver]);

  // ✅ Final Display Logic
  const redDisplay = showFinalScore
    ? redScore + bluePenalties * 5
    : redScore;

  const blueDisplay = showFinalScore
    ? blueScore + redPenalties * 5
    : blueScore;

  return (
    <div style={{ backgroundColor: "#000000", color: "#ffffff", padding: "1rem" }}>
      <center>
        <Typography variant="h3" component="div" gutterBottom>
          {match.match_number}
        </Typography>
      </center>

      <Grid container spacing={4} paddingX={5} paddingTop={3} paddingBottom={1}>
        <Grid size={6}>
          <div
            style={{
              backgroundColor: "#ff0000",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              opacity: showAnimation ? 0 : 1,
              transition: "opacity 1s ease-in-out",
            }}
          >
            <Typography variant="h2" gutterBottom>
              {match.red_name}
            </Typography>
            <Typography variant="h1">{redDisplay}</Typography>
          </div>
        </Grid>

        <Grid size={6}>
          <div
            style={{
              backgroundColor: "#0000ff",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              opacity: showAnimation ? 0 : 1,
              transition: "opacity 1s ease-in-out",
            }}
          >
            <Typography variant="h2" gutterBottom>
              {match.blue_name}
            </Typography>
            <Typography variant="h1">{blueDisplay}</Typography>
          </div>
        </Grid>
      </Grid>

      <Grid container justifyContent="center" paddingTop={2}>
        <Typography variant="h1" sx={{ fontSize: "17rem" }}>
          {isInCountdown
            ? `0:${countdown.toString().padStart(2, "0")}`
            : `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`}
        </Typography>
      </Grid>

      {showAnimation && animationSrc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 9999,
            backgroundColor: "#000000",
          }}
        >
          <video
            src={animationSrc}
            autoPlay
            onEnded={() => {
              setShowAnimation(false);
              setTimeout(() => {
                setShowFinalScore(true);
              }, 300);
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}

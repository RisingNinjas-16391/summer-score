"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  preliminaryScore?: number;
  penalties?: number;
  autoScore?: number;
  teleopScore?: number;
  endgameScore?: number;
}

export default function Scoreboard() {
  const [match, setMatch] = useState<MatchData>({
    red_name: "Red",
    blue_name: "Blue",
    match_number: "Match",
  });

  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redPrelim, setRedPrelim] = useState(0);
  const [bluePrelim, setBluePrelim] = useState(0);
  const [redPenalties, setRedPenalties] = useState(0);
  const [bluePenalties, setBluePenalties] = useState(0);

  const [redStatus, setRedStatus] = useState("⠀");
  const [blueStatus, setBlueStatus] = useState("⠀");
  const redTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  <style jsx global>{`
    .fade-message {
      opacity: 0;
      animation: fadeInOut 1s ease-in-out forwards;
    }

    @keyframes fadeInOut {
      0% {
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  `}</style>;

  const [redBreakdown, setRedBreakdown] = useState({
    auto: 0,
    teleop: 0,
    endgame: 0,
  });
  const [blueBreakdown, setBlueBreakdown] = useState({
    auto: 0,
    teleop: 0,
    endgame: 0,
  });

  const [timer, setTimer] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [isInCountdown, setIsInCountdown] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [playedTransition, setPlayedTransition] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [showResultsScreen, setShowResultsScreen] = useState(false);

  const [showAnimation, setShowAnimation] = useState(false);
  const [animationSrc, setAnimationSrc] = useState("");

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

  const playTwoTransitionSounds = useCallback(async () => {
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
  }, [sounds]);

  useEffect(() => {
    const unsubTimer = onSnapshot(
      doc(db, "realtime", "timer"),
      async (docSnap) => {
        const data = docSnap.data();
        if (data?.start) {
          setIsRunning(true);
          setIsPaused(false);
          setPlayedTransition(false);
          setShowFinalScore(false);
          setShowResultsScreen(false);
          sounds.matchStart?.play();
          await updateDoc(doc(db, "realtime", "timer"), {
            start: false,
            paused: false,
          });
        }
        if (data?.reset) {
          setIsRunning(false);
          setTimer(120);
          setIsInCountdown(false);
          setCountdown(8);
          setPlayedTransition(false);
          setIsPaused(false);
          setShowAnimation(false);
          setShowFinalScore(false);
          setShowResultsScreen(false);
          await updateDoc(doc(db, "realtime", "timer"), {
            reset: false,
            finished: false,
          });
        }
        if (data?.paused) {
          setIsPaused(true);
          setIsRunning(false);
          sounds.aborted?.play();
        }
        if (data?.finished) {
          setShowFinalScore(true);
          setShowAnimation(true);
          sounds.results?.play();

          const redFinal = redScore + bluePenalties * 5;
          const blueFinal = blueScore + redPenalties * 5;

          setAnimationSrc(
            redFinal > blueFinal
              ? "/animations/power_play_red.webm"
              : blueFinal > redFinal
              ? "/animations/power_play_blue.webm"
              : "/animations/power_play_tie.webm"
          );
        }
      }
    );

    return () => unsubTimer();
  }, [sounds, redScore, blueScore, redPenalties, bluePenalties]);

  useEffect(() => {
    if (!isRunning || isInCountdown || isPaused) return;

    let current = timer;
    const interval = setInterval(() => {
      current--;
      if (current === 90 && !playedTransition) {
        clearInterval(interval);
        setIsInCountdown(true);
        setCountdown(8);
        setPlayedTransition(true);
        playTwoTransitionSounds();
        return;
      }
      if (current === 15) sounds.endgameStart?.play();
      if (current === 0) {
        clearInterval(interval);
        sounds.matchEnd?.play();
        setIsRunning(false);
      }
      setTimer(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isRunning,
    isInCountdown,
    playedTransition,
    timer,
    isPaused,
    sounds,
    playTwoTransitionSounds,
  ]);

  useEffect(() => {
    if (!isInCountdown || countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount === 3) sounds.teleopStart?.play();
        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(90);
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
        setRedScore(data.totalScore || 0);
        setRedPrelim(data.preliminaryScore || 0);
        setRedPenalties(data.penalties || 0);
        setRedBreakdown({
          auto: data.autoScore || 0,
          teleop: data.teleopScore || 0,
          endgame: data.endgameScore || 0,
        });
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        setBlueScore(data.totalScore || 0);
        setBluePrelim(data.preliminaryScore || 0);
        setBluePenalties(data.penalties || 0);
        setBlueBreakdown({
          auto: data.autoScore || 0,
          teleop: data.teleopScore || 0,
          endgame: data.endgameScore || 0,
        });
      }
    });

    return () => {
      unsubMatch();
      unsubRed();
      unsubBlue();
    };
  }, []);

  useEffect(() => {
    let currentRedPenalties = 0;
    let currentBluePenalties = 0;

    const unsubRed = onSnapshot(doc(db, "realtime", "red"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        const newPenalties = data.penalties || 0;

        setRedScore(data.totalScore || 0);
        setRedPrelim(data.preliminaryScore || 0);
        setRedBreakdown({
          auto: data.autoScore || 0,
          teleop: data.teleopScore || 0,
          endgame: data.endgameScore || 0,
        });

        if (newPenalties > currentRedPenalties) {
          setRedStatus("PENALTY GIVEN TO RED!");
          if (redTimeoutRef.current) clearTimeout(redTimeoutRef.current);
          redTimeoutRef.current = setTimeout(() => setRedStatus("⠀"), 1000);
        }

        currentRedPenalties = newPenalties;
        setRedPenalties(newPenalties);
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ScoreData;
        const newPenalties = data.penalties || 0;

        setBlueScore(data.totalScore || 0);
        setBluePrelim(data.preliminaryScore || 0);
        setBlueBreakdown({
          auto: data.autoScore || 0,
          teleop: data.teleopScore || 0,
          endgame: data.endgameScore || 0,
        });

        if (newPenalties > currentBluePenalties) {
          setBlueStatus("PENALTY GIVEN TO BLUE!");
          if (blueTimeoutRef.current) clearTimeout(blueTimeoutRef.current);
          blueTimeoutRef.current = setTimeout(() => setBlueStatus("⠀"), 1000);
        }

        currentBluePenalties = newPenalties;
        setBluePenalties(newPenalties);
      }
    });

    return () => {
      unsubRed();
      unsubBlue();
      if (redTimeoutRef.current) clearTimeout(redTimeoutRef.current);
      if (blueTimeoutRef.current) clearTimeout(blueTimeoutRef.current);
    };
  }, []);

  const redDisplay = showFinalScore ? redScore + bluePenalties * 5 : redPrelim;

  const blueDisplay = showFinalScore
    ? blueScore + redPenalties * 5
    : bluePrelim;

  <style jsx global>{`
    .fade-in {
      animation: fadeIn 1s ease-in-out;
    }
    @keyframes fadeIn {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `}</style>;

  const fontSizes = {
    title: "clamp(1.5rem, 4vw, 3rem)",
    teamName: "clamp(1rem, 3vw, 2.5rem)",
    score: "clamp(4rem, 10vw, 10rem)",
    win: "clamp(2rem, 6vw, 6rem)",
    breakdown: "clamp(0.875rem, 2vw, 1.875rem)",
  };

  if (showResultsScreen) {
    const isRedWinner = redDisplay > blueDisplay;
    const isBlueWinner = blueDisplay > redDisplay;

    return (
      // RESULTS SCREEN
      <div
        className="fade-in"
        style={{
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
          backgroundColor: "#000000",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1rem",
        }}
      >
        <Typography
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold", fontSize: fontSizes.title }}
        >
          {match.match_number} — Results
        </Typography>

        <Grid container spacing={4} paddingTop={4}>
          {/* Red Side */}
          <Grid size={{ xs: 12, sm: 6 }} style={{ textAlign: "right" }}>
            <div
              style={{
                backgroundColor: "#ff0000",
                borderRadius: "12px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: fontSizes.teamName,
                  alignSelf: "flex-end",
                  color: "#ffffff",
                }}
              >
                {match.red_name}
              </Typography>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  marginTop: "1rem",
                  marginBottom: "1rem",
                  width: "80%", // or "40vw", depending on layout
                  maxWidth: "400px", // optional
                  textAlign: "center", // ensure text is centered
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center", // horizontal centering
                  justifyContent: "center", // vertical centering (if needed)
                }}
              >
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.score }}
                >
                  {redDisplay}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.win }}
                >
                  {isRedWinner ? "WIN" : "⠀"}
                </Typography>
              </div>

              <div
                style={{
                  backgroundColor: "#2c2c2c",
                  color: "#ffffff",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  width: "400px",
                  textAlign: "right",
                }}
              >
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  AUTONOMOUS: {redBreakdown.auto}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  DRIVER-CONTROL: {redBreakdown.teleop}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  END GAME: {redBreakdown.endgame}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  BLUE PENALTY: {bluePenalties * 5}
                </Typography>
              </div>
            </div>
          </Grid>

          {/* Blue Side */}
          <Grid size={{ xs: 12, sm: 6 }} style={{ textAlign: "left" }}>
            <div
              style={{
                backgroundColor: "#0000ff",
                borderRadius: "12px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: fontSizes.teamName,
                  color: "#ffffff",
                }}
              >
                {match.blue_name}
              </Typography>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  marginTop: "1rem",
                  marginBottom: "1rem",
                  width: "400px",
                  textAlign: "center", // ensure text is centered
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center", // horizontal centering
                  justifyContent: "center", // vertical centering (if needed)
                }}
              >
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.score }}
                >
                  {blueDisplay}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.win }}
                >
                  {isBlueWinner ? "WIN" : "⠀"}
                </Typography>
              </div>

              <div
                style={{
                  backgroundColor: "#2c2c2c",
                  color: "#ffffff",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  width: "400px",
                  textAlign: "left",
                }}
              >
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  AUTONOMOUS: {blueBreakdown.auto}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  DRIVER-CONTROL: {blueBreakdown.teleop}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  END GAME: {blueBreakdown.endgame}
                </Typography>
                <Typography
                  sx={{ fontWeight: "bold", fontSize: fontSizes.breakdown }}
                >
                  RED PENALTY: {redPenalties * 5}
                </Typography>
              </div>
            </div>
          </Grid>
        </Grid>
      </div>
    );
  }
  return (
    // SCOREBOARD
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "#000000",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1rem",
      }}
    >
      <center>
        <Typography
          variant="h3"
          sx={{ fontWeight: "bold" }}
          component="div"
          gutterBottom
        >
          {match.match_number}
        </Typography>
      </center>

      <Grid container spacing={1} paddingX={2} paddingTop={1} paddingBottom={1}>
        <Grid size={6}>
          <div
            style={{
              backgroundColor: "#ff0000",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold" }}>
              {match.red_name}
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: "bold" }}>
              {redDisplay}
            </Typography>
          </div>
          <Typography
            className={redStatus !== "⠀" ? "fade-message" : ""}
            sx={{
              fontWeight: "bold",
              color: "#ffff00",
              fontSize: "2rem",
              marginTop: "1rem",
              textAlign: "center",
            }}
          >
            {redStatus}
          </Typography>
        </Grid>
        <Grid size={6}>
          <div
            style={{
              backgroundColor: "#0000ff",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold" }}>
              {match.blue_name}
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: "bold" }}>
              {blueDisplay}
            </Typography>
          </div>
          <Typography
            className={blueStatus !== "⠀" ? "fade-message" : ""}
            sx={{
              fontWeight: "bold",
              fontSize: "2rem",
              color: "#ffff00",
              marginTop: "1rem",
              textAlign: "center",
            }}
          >
            {blueStatus}
          </Typography>
        </Grid>
      </Grid>

      <Grid container justifyContent="center" paddingTop={2}>
        <Typography
          variant="h1"
          sx={{ fontSize: "clamp(6rem, 15vw, 12rem)", fontWeight: "bold" }}
        >
          {isInCountdown
            ? `0:${countdown.toString().padStart(2, "0")}`
            : `${Math.floor(timer / 60)}:${(timer % 60)
                .toString()
                .padStart(2, "0")}`}
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
              setShowResultsScreen(true);
            }}
            onError={() => {
              console.error("Animation video failed to load");
              setShowAnimation(false);
              setShowResultsScreen(true);
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}

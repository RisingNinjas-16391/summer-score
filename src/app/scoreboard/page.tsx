"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Typography, Grid } from "@mui/material";
import { teamMap } from "@/lib/teamMap";

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
  postMatchAddedPoints: number;
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

  const [timer, setTimer] = useState(150);
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
    teleopCountdown: undefined as HTMLAudioElement | undefined,
    teleopStart: undefined as HTMLAudioElement | undefined,
    endgameStart: undefined as HTMLAudioElement | undefined,
    matchEnd: undefined as HTMLAudioElement | undefined,
    results: undefined as HTMLAudioElement | undefined,
    aborted: undefined as HTMLAudioElement | undefined,
    sonar: undefined as HTMLAudioElement | undefined,
    womp: undefined as HTMLAudioElement | undefined,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSounds({
        matchStart: new Audio("/sounds/charge.wav"),
        autonomousComplete: new Audio("/sounds/endauto_with_warning.wav"),
        teleopCountdown: new Audio("/sounds/3-2-1.wav"),
        teleopStart: new Audio("/sounds/firebell.wav"),
        endgameStart: new Audio("/sounds/factwhistle.wav"),
        matchEnd: new Audio("/sounds/endmatch.wav"),
        results: new Audio("/sounds/results.wav"),
        aborted: new Audio("/sounds/fogblast.wav"),
        sonar: new Audio("/sounds/warning_sonar.wav"),
        womp: new Audio("/sounds/womp.wav"),
      });
    }
  }, []);

  useEffect(() => {
    let currentAudio: HTMLAudioElement | null = null;
    let currentTeam: number | null = null;

    const fadeAudio = (
      audio: HTMLAudioElement,
      fadeType: "in" | "out",
      duration = 2500
    ): Promise<void> => {
      return new Promise((resolve) => {
        const step = 50; // ms
        const volumeStep = step / duration;

        const interval = setInterval(() => {
          if (!audio) {
            clearInterval(interval);
            return resolve();
          }

          if (fadeType === "in") {
            audio.volume = Math.min(1, audio.volume + volumeStep);
            if (audio.volume >= 1) {
              clearInterval(interval);
              return resolve();
            }
          } else {
            audio.volume = Math.max(0, audio.volume - volumeStep);
            if (audio.volume <= 0) {
              audio.pause();
              audio.currentTime = 0;
              clearInterval(interval);
              return resolve();
            }
          }
        }, step);
      });
    };

    const unsubWalkout = onSnapshot(
      doc(db, "realtime", "walkout"),
      async (docSnap) => {
        const data = docSnap.data();
        const team = data?.team;

        if (!team || team < 1 || team > 7) return;

        const walkoutSounds: { [key: number]: string } = {
          1: "/sounds/walkouts/1_Final Countdown.mp3",
          2: "/sounds/walkouts/2_Thick of It.mp3",
          3: "/sounds/walkouts/3_Waiting for Love.mp3",
          4: "/sounds/walkouts/4_Seven Nation Army.mp3",
          5: "/sounds/walkouts/5_Radioactive.mp3",
          6: "/sounds/walkouts/6_Back One Day.mp3",
          7: "/sounds/walkouts/7_Trap Queen.mp3",
        };

        const newSrc = walkoutSounds[team];

        if (currentTeam === team) {
          // Same team again: fade out and stop
          if (currentAudio) await fadeAudio(currentAudio, "out");
          currentAudio = null;
          currentTeam = null;
        } else {
          // Different team
          if (currentAudio) {
            await fadeAudio(currentAudio, "out");
            currentAudio = null;
          }

          const audio = new Audio(newSrc);
          audio.volume = 0;
          audio.play();

          currentAudio = audio;
          currentTeam = team;

          await fadeAudio(audio, "in");
        }

        // Clear the Firestore trigger
        await updateDoc(doc(db, "realtime", "walkout"), { team: null });
      }
    );

    return () => {
      if (currentAudio) currentAudio.pause();
      unsubWalkout();
    };
  }, []);

  useEffect(() => {
    const unsubTimer = onSnapshot(
      doc(db, "realtime", "timer"),
      async (docSnap) => {
        const data = docSnap.data();
        if (data?.jacobJoke) {
          sounds.womp?.play();
          await updateDoc(doc(db, "realtime", "timer"), {
            jacobJoke: false,
          });
        }
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
          setTimer(150);
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
          await updateDoc(doc(db, "realtime", "overlay"), {
            revealFinalScores: false,
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
              ? "/animations/deep_space_red.mp4"
              : blueFinal > redFinal
              ? "/animations/deep_space_blue.mp4"
              : "/animations/deep_space_tie.mp4"
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
      if (current === 120 && !playedTransition) {
        clearInterval(interval);
        setIsInCountdown(true);
        setCountdown(8);
        setPlayedTransition(true);
        sounds.autonomousComplete?.play();
        return;
      }
      if (current === 60) sounds.sonar?.play();
      if (current === 15) sounds.endgameStart?.play();
      if (current === 0) {
        clearInterval(interval);
        sounds.matchEnd?.play();
        setIsRunning(false);
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
        if (newCount === 3) sounds.teleopCountdown?.play();
        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(120);
          sounds.teleopStart?.play();
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
          endgame: data.postMatchAddedPoints || 0,
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
          endgame: data.postMatchAddedPoints || 0,
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
          endgame: data.postMatchAddedPoints || 0,
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
          endgame: data.postMatchAddedPoints || 0,
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

  if (showResultsScreen) {
    const isRedWinner = redDisplay > blueDisplay;
    const isBlueWinner = blueDisplay > redDisplay;

    return (
      // RESULTS SCREEN
      <div
        style={{
          height: "100vh",
          width: "100vw",
          maxWidth: "1920px",
          maxHeight: "1080px",
          margin: "0 auto",
          overflow: "hidden",
          backgroundColor: "#000000",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: "1rem",
          boxSizing: "border-box",
        }}
      >
        <Typography
          align="center"
          gutterBottom
          sx={{
            fontWeight: "bold",
            fontSize: "4rem",
          }}
        >
          {match.match_number} — Results
        </Typography>

        <Grid container spacing={2} style={{ paddingTop: "1rem" }}>
          {/* RED Side */}
          <Grid
            size={{ xs: 12, sm: 6 }}
            style={{ textAlign: "right", height: "100%" }}
          >
            <div
              // red box
              style={{
                backgroundColor: "#ff0000",
                flex: 1,
                borderRadius: "12px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "4rem",
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                {teamMap[match.red_name] || match.red_name}
              </Typography>

              <div
                // score box
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  marginTop: "1.5rem",
                  marginBottom: "1.5rem",
                  width: "450px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: "8rem",
                  }}
                >
                  {redDisplay}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: "4rem",
                  }}
                >
                  {isRedWinner ? "WIN" : "⠀"}
                </Typography>
              </div>

              <div
                // breakdown box
                style={{
                  backgroundColor: "#2c2c2c",
                  color: "#ffffff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  width: "700px",
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  AUTONOMOUS: {redBreakdown.auto}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  DRIVER-CONTROL: {redBreakdown.teleop}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  END GAME: {redBreakdown.endgame}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  BLUE PENALTY: {bluePenalties * 5}
                </Typography>
              </div>
            </div>
          </Grid>

          {/* BLUE Side */}
          <Grid
            size={{ xs: 12, sm: 6 }}
            style={{ textAlign: "left", height: "100%" }}
          >
            <div
              style={{
                backgroundColor: "#0000ff",
                flex: 1,
                borderRadius: "12px",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "4rem",
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                {teamMap[match.blue_name] || match.blue_name}
              </Typography>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  marginTop: "1.5rem",
                  marginBottom: "1.5rem",
                  width: "450px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: "8rem",
                  }}
                >
                  {blueDisplay}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    fontSize: "4rem",
                  }}
                >
                  {isBlueWinner ? "WIN" : "⠀"}
                </Typography>
              </div>

              <div
                style={{
                  backgroundColor: "#2c2c2c",
                  color: "#ffffff",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  width: "700px",
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  AUTONOMOUS: {blueBreakdown.auto}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  DRIVER-CONTROL: {blueBreakdown.teleop}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
                  END GAME: {blueBreakdown.endgame}
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "3rem" }}>
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

      <Grid
        container
        spacing={1}
        paddingX={2}
        paddingTop={1}
        paddingBottom={1}
        alignItems="stretch"
      >
        <Grid size={6} style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              backgroundColor: "#ff0000",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold" }}>
              {teamMap[match.red_name] || match.red_name}
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

        <Grid size={6} style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              backgroundColor: "#0000ff",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold" }}>
              {teamMap[match.blue_name] || match.blue_name}
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
            onEnded={async () => {
              setShowAnimation(false);
              setShowResultsScreen(true);
              await updateDoc(doc(db, "realtime", "overlay"), {
                revealFinalScores: true,
              });
            }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}

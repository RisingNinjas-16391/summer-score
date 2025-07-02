"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { teamMap } from "@/lib/teamMap";

interface MatchData {
  red_name: string;
  blue_name: string;
  match_number: string;
}

export default function StreamOverlay() {
  const [match, setMatch] = useState<MatchData>({
    red_name: "Red",
    blue_name: "Blue",
    match_number: "Match",
  });

  const [redPrelim, setRedPrelim] = useState(0);
  const [bluePrelim, setBluePrelim] = useState(0);
  const [redPenalties, setRedPenalties] = useState(0);
  const [bluePenalties, setBluePenalties] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);

  const [timer, setTimer] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInCountdown, setIsInCountdown] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [playedTransition, setPlayedTransition] = useState(false);
  const [showFinalScore, setShowFinalScore] = useState(false);

  const [revealFinalScores, setRevealFinalScores] = useState(false);

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
        const data = docSnap.data();
        setRedScore(data.totalScore || 0);
        setRedPrelim(data.preliminaryScore || 0);
        setRedPenalties(data.penalties || 0);
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBlueScore(data.totalScore || 0);
        setBluePrelim(data.preliminaryScore || 0);
        setBluePenalties(data.penalties || 0);
      }
    });

    const unsubTimer = onSnapshot(doc(db, "realtime", "timer"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.start) {
          setIsRunning(true);
          setIsPaused(false);
          setPlayedTransition(false);
          setShowFinalScore(false);
        }
        if (data.reset) {
          setIsRunning(false);
          setTimer(120);
          setIsInCountdown(false);
          setCountdown(8);
          setPlayedTransition(false);
          setIsPaused(false);
          setShowFinalScore(false);
        }
        if (data.paused) {
          setIsPaused(true);
          setIsRunning(false);
        }
        if (data.finished) {
          setIsRunning(false);
          setShowFinalScore(true);
        }
      }
    });

    return () => {
      unsubMatch();
      unsubRed();
      unsubBlue();
      unsubTimer();
    };
  }, []);

  // Timer logic
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
        return;
      }
      if (current === 0) {
        clearInterval(interval);
        setIsRunning(false);
      }
      setTimer(current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isInCountdown, playedTransition, timer, isPaused]);

  // Countdown logic
  useEffect(() => {
    if (!isInCountdown || countdown <= 0) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          clearInterval(countdownInterval);
          setIsInCountdown(false);
          setTimer(90);
        }
        return newCount;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isInCountdown, countdown]);

  // Reveal final scores logic
  useEffect(() => {
    const unsubReveal = onSnapshot(
      doc(db, "realtime", "overlay"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRevealFinalScores(data.revealFinalScores || false);
        }
      }
    );

    return () => unsubReveal();
  }, []);

  const redDisplay = showFinalScore && revealFinalScores
   ? redScore + bluePenalties * 5 
   : redPrelim;

  const blueDisplay = showFinalScore && revealFinalScores
    ? blueScore + redPenalties * 5
    : bluePrelim;

  const formatTime = (time: number) =>
    `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: "1920px",
        height: "250px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 3rem",
        backgroundColor: "#000000",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* Left Side: Red Team + Red Score */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            backgroundColor: "#ff0000",
            padding: "0 2.5rem",
            height: "250px",
            display: "flex",
            alignItems: "center",
            borderTopLeftRadius: "12px",
            borderBottomLeftRadius: "12px",
            fontWeight: "bold",
            fontSize: "3rem",
          }}
        >
          {teamMap[match.red_name] || match.red_name}
        </div>

        <div
          style={{
            backgroundColor: "#ff8c00",
            padding: "0 4rem",
            height: "250px",
            display: "flex",
            alignItems: "center",
            marginRight: "2.5rem",
            borderTopRightRadius: "12px",
            borderBottomRightRadius: "12px",
            fontWeight: "900",
            fontSize: "8rem",
          }}
        >
          {redDisplay}
        </div>
      </div>

      {/* Center: Timer */}
      <div
        style={{
          backgroundColor: "#000000",
          padding: "0 4rem",
          height: "250px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          fontWeight: "bold",
          fontSize: "6rem",
          minWidth: "12rem",
        }}
      >
        {isInCountdown
          ? `0:${countdown.toString().padStart(2, "0")}`
          : formatTime(timer)}
      </div>

      {/* Right Side: Blue Score + Blue Team */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            backgroundColor: "#ff69b4",
            padding: "0 4rem",
            height: "250px",
            display: "flex",
            alignItems: "center",
            borderTopLeftRadius: "12px",
            borderBottomLeftRadius: "12px",
            fontWeight: "900",
            fontSize: "8rem",
          }}
        >
          {blueDisplay}
        </div>

        <div
          style={{
            backgroundColor: "#0000ff",
            padding: "0 2.5rem",
            height: "250px",
            display: "flex",
            alignItems: "center",
            borderTopRightRadius: "12px",
            borderBottomRightRadius: "12px",
            fontWeight: "bold",
            fontSize: "3rem",
          }}
        >
          {teamMap[match.blue_name] || match.blue_name}
        </div>
      </div>
    </div>
  );
}

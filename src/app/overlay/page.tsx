"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
// import { Typography } from "@mui/material";

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

  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [timer, setTimer] = useState("2:00");

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
      }
    });

    const unsubBlue = onSnapshot(doc(db, "realtime", "blue"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBlueScore(data.totalScore || 0);
      }
    });

    const unsubTimer = onSnapshot(doc(db, "realtime", "timer"), (docSnap) => {
      if (docSnap.exists()) {
        const timeLeft = docSnap.data().time;
        if (typeof timeLeft === "number") {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = (timeLeft % 60).toString().padStart(2, "0");
          setTimer(`${minutes}:${seconds}`);
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

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        fontFamily: "sans-serif",
        fontSize: "1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            backgroundColor: "#0091ff",
            padding: "0.5rem 1rem",
            marginRight: "0.5rem",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {match.blue_name}
        </div>
        <div>{blueScore}</div>
      </div>

      <div style={{ fontWeight: "bold", fontSize: "2rem" }}>{timer}</div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div>{redScore}</div>
        <div
          style={{
            backgroundColor: "#ff1000",
            padding: "0.5rem 1rem",
            marginLeft: "0.5rem",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          {match.red_name}
        </div>
      </div>
    </div>
  );
}

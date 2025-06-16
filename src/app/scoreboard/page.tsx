"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

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
        <h1 style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
          {match.match_number}
        </h1>
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
      </center>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function ScoreIndex() {
  const [matchNumber, setMatchNumber] = useState("");
  const [redName, setRedName] = useState("");
  const [blueName, setBlueName] = useState("");

  const updateMatchInfo = async () => {
    await setDoc(doc(db, "realtime", "matches"), {
      match_number: matchNumber,
      red_name: redName,
      blue_name: blueName,
    });
  };

  return (
    <div style={{ backgroundColor: "#1a1a1a", color: "white", padding: "2rem" }}>
      <center>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>Score Index</h1>

        <input
          type="text"
          placeholder="Match Number"
          value={matchNumber}
          onChange={(e) => setMatchNumber(e.target.value)}
          onBlur={updateMatchInfo}
          style={{ margin: "0.5rem", padding: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Red Team Name"
          value={redName}
          onChange={(e) => setRedName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{ margin: "0.5rem", padding: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Blue Team Name"
          value={blueName}
          onChange={(e) => setBlueName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{ margin: "0.5rem", padding: "0.5rem" }}
        />

        <div style={{ marginTop: "1rem" }}>
          <Link href="/red-score" style={{ color: "#ff4d4f", margin: "1rem", display: "inline-block" }}>
            Red
          </Link>
          <Link href="/blue-score" style={{ color: "#4d88ff", margin: "1rem", display: "inline-block" }}>
            Blue
          </Link>
          <Link href="/scoreboard" style={{ color: "#6db5ff", margin: "1rem", display: "inline-block" }}>
            Scoreboard
          </Link>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Button variant="contained" color="primary" style={{ margin: "0.5rem" }}>
            Start Match
          </Button>
          <Button variant="contained" color="secondary" style={{ margin: "0.5rem" }}>
            Finish Match
          </Button>
          <Button variant="outlined" style={{ margin: "0.5rem" }}>
            Reset Match
          </Button>
        </div>
      </center>
    </div>
  );
}

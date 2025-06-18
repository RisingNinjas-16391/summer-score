"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";

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
    <div style={{ backgroundColor: "#000000", color: "white", padding: "2rem" }}>
      <center>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>Score Index</h1>

        <input
          type="text"
          placeholder="Match Number"
          value={matchNumber}
          onChange={(e) => setMatchNumber(e.target.value)}
          onBlur={updateMatchInfo}
          style={{
            margin: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#2a2a2a",
            color: "white",
            border: "1px solid gray",
            borderRadius: "4px",
          }}
        />
        <input
          type="text"
          placeholder="Red Team Name"
          value={redName}
          onChange={(e) => setRedName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{
            margin: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#2a2a2a",
            color: "#ff1000",
            border: "1px solid #ff1000",
            borderRadius: "4px",
          }}
        />
        <input
          type="text"
          placeholder="Blue Team Name"
          value={blueName}
          onChange={(e) => setBlueName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{
            margin: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#2a2a2a",
            color: "#0091ff",
            border: "1px solid #0091ff",
            borderRadius: "4px",
          }}
        />

        <div style={{ marginTop: "1rem" }}>
          <Link
            href="/red-score"
            style={{
              color: "#ff1000",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Red
          </Link>
          <Link
            href="/blue-score"
            style={{
              color: "#0091ff",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Blue
          </Link>
          <Link
            href="/scoreboard"
            style={{
              color: "white",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Scoreboard
          </Link>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Button
            variant="contained"
            style={{
              margin: "0.5rem",
              backgroundColor: "#0091ff",
              color: "white",
            }}
            onClick={() => {
              setDoc(doc(db, "realtime", "timer"), { start: true });
            }}
          >
            Start Match
          </Button>

          <Button
            variant="contained"
            style={{
              margin: "0.5rem",
              backgroundColor: "#bf00ff",
              color: "white",
            }}
            onClick={async () => {
              await updateDoc(doc(db, "realtime", "timer"), {
                finished: true,
              });
            }}
          >
            Finalize Match
          </Button>

          <Button
            variant="outlined"
            style={{
              margin: "0.5rem",
              color: "#ffffff",
              borderColor: "#ffffff",
            }}
            onClick={async () => {
              await setDoc(doc(db, "realtime", "timer"), {
                start: false,
                reset: true,
              });

              await setDoc(doc(db, "realtime", "red"), {
                teamColor: "red",
                autoPeg: 0,
                autoUpright: 0,
                autoKnocked: 0,
                teleopPeg: 0,
                teleopUpright: 0,
                teleopKnocked: 0,
                teleopRows: 0,
                climbed: false,
                parked: false,
                penalties: 0,
                totalScore: 0,
              });

              await setDoc(doc(db, "realtime", "blue"), {
                teamColor: "blue",
                autoPeg: 0,
                autoUpright: 0,
                autoKnocked: 0,
                teleopPeg: 0,
                teleopUpright: 0,
                teleopKnocked: 0,
                teleopRows: 0,
                climbed: false,
                parked: false,
                penalties: 0,
                totalScore: 0,
              });
            }}
          >
            Reset Match
          </Button>

          <Button
            variant="contained"
            style={{
              margin: "0.5rem",
              backgroundColor: "#ff1000",
              color: "white",
            }}
            onClick={async () => {
              await updateDoc(doc(db, "realtime", "timer"), {
                start: false,
                paused: true,
              });
            }}
          >
            Abort Match
          </Button>
        </div>
      </center>
    </div>
  );
}

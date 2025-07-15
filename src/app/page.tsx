"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { teamMap } from "@/lib/teamMap";

export default function ScoreIndex() {
  const [matchNumber, setMatchNumber] = useState("");
  const [redName, setRedName] = useState("");
  const [blueName, setBlueName] = useState("");

  const teamOptions = Object.keys(teamMap);

  const updateMatchInfo = async () => {
    await setDoc(doc(db, "realtime", "matches"), {
      match_number: matchNumber,
      red_name: redName,
      blue_name: blueName,
    });
  };

  return (
    <div
      style={{ backgroundColor: "#000000", color: "white", padding: "2rem" }}
    >
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
        <select
          value={redName}
          onChange={(e) => setRedName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{
            margin: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#2a2a2a",
            color: "#ff0000",
            border: "1px solid #ff0000",
            borderRadius: "4px",
          }}
        >
          <option value="">None</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        <select
          value={blueName}
          onChange={(e) => setBlueName(e.target.value)}
          onBlur={updateMatchInfo}
          style={{
            margin: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#2a2a2a",
            color: "#0000ff",
            border: "1px solid #0000ff",
            borderRadius: "4px",
          }}
        >
          <option value="">None</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        <div style={{ marginTop: "1rem" }}>
          <Link
            href="/red-score"
            target="_blank"
            style={{
              color: "#ff0000",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Red
          </Link>
          <Link
            href="/blue-score"
            target="_blank"
            style={{
              color: "#0000ff",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Blue
          </Link>
          <Link
            href="/scoreboard"
            target="_blank"
            style={{
              color: "white",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Scoreboard
          </Link>
          <Link
            href="/overlay"
            target="_blank"
            style={{
              color: "white",
              margin: "1rem",
              display: "inline-block",
              textDecoration: "underline",
            }}
          >
            Overlay
          </Link>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <Button
            variant="contained"
            style={{
              margin: "0.5rem",
              backgroundColor: "#0000ff",
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
              backgroundColor: "#00ff00",
              color: "black",
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
                totalScore: 0,
              });

              await setDoc(doc(db, "realtime", "blue"), {
                teamColor: "blue",
                totalScore: 0,
              });

              // Clear the input fields
              setMatchNumber("");
              setRedName("");
              setBlueName("");
            }}
          >
            Reset Match
          </Button>

          <Button
            variant="contained"
            style={{
              margin: "0.5rem",
              backgroundColor: "#ff0000",
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

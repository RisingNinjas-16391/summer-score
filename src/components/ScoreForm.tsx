"use client";

import Grid from "@mui/material/Grid";
import { Button, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

export type CapOptions = "blue" | "red" | "";

export type ScoreData = {
  teamColor: CapOptions;
  autoBall: number;
  parked: boolean;
  autoScore: number;
  teleopBall: number;
  teleopPlayerBalls: number;
  teleopLinks: number;
  teleopScore: number;
  climbed: boolean;
  endgameBallFirst: boolean;
  endgameBallSecond: boolean;
  postMatchAddedPoints: number;
  totalScore: number;
  penalties: number;
  preliminaryScore?: number;
};

interface ScoreFormProps {
  teamColor: string;
}

function ScoreForm({ teamColor }: ScoreFormProps) {
  const [score, setScore] = useState<ScoreData>({
    teamColor: teamColor as CapOptions,
    autoBall: 0,
    parked: false,
    autoScore: 0,
    teleopBall: 0,
    teleopPlayerBalls: 0,
    teleopLinks: 0,
    teleopScore: 0,
    climbed: false,
    endgameBallFirst: false,
    endgameBallSecond: false,
    preliminaryScore: 0,
    postMatchAddedPoints: 0,
    penalties: 0,
    totalScore: 0,
  });

  const [opponentPenalties, setOpponentPenalties] = useState(0);

  useEffect(() => {
    const color = teamColor === "red" ? "blue" : "red";
    const unsub = onSnapshot(doc(db, "realtime", color), (snap) => {
      const data = snap.data();
      if (data?.penalties !== undefined) {
        setOpponentPenalties(data.penalties);
      }
    });
    return () => unsub();
  }, [teamColor]);

  const textColor =
    teamColor === "red"
      ? "#ff0000"
      : teamColor === "blue"
      ? "#0000ff"
      : "white";

  const updateAndSave = (updated: ScoreData) => {
    const autoScore = updated.autoBall * 5 + (updated.parked ? 10 : 0);

    const teleopScore =
      updated.teleopBall * 5 +
      updated.teleopPlayerBalls +
      (updated.endgameBallFirst ? 20 : 0) +
      (updated.endgameBallSecond ? 10 : 0) + 
      (updated.climbed ? 10 : 0);

    const postMatchAddedPoints =
      updated.teleopLinks * 5;

    const preliminary = autoScore + teleopScore;
    const total = preliminary + postMatchAddedPoints;

    const newScore = {
      ...updated,
      autoScore,
      teleopScore,
      postMatchAddedPoints,
      preliminaryScore: preliminary,
      totalScore: total,
    };

    setScore(newScore);

    setDoc(doc(db, "realtime", teamColor), newScore).catch((err) => {
      console.error(
        `[ERROR] Failed to send ${teamColor.toUpperCase()} score:`,
        err
      );
    });
  };

  const updateScore = (field: keyof ScoreData, delta: number) => {
    const newValue = Math.max(0, (score[field] as number) + delta);
    const updated = { ...score, [field]: newValue };
    updateAndSave(updated);
  };

  const renderCounter = (label: string, field: keyof ScoreData) => (
    <Grid size={12} style={{ textAlign: "center" }}>
      <Typography variant="h6" style={{ color: textColor }}>
        {label}
      </Typography>
      <Grid container spacing={1} justifyContent="center" alignItems="center">
        <Grid>
          <Typography variant="h4" style={{ color: textColor }}>
            {score[field]}
          </Typography>
        </Grid>
        <Grid>
          <Button
            variant="contained"
            onClick={() => updateScore(field, -1)}
            style={{ backgroundColor: "#333", color: textColor }}
          >
            -
          </Button>
        </Grid>
        <Grid>
          <Button
            variant="contained"
            onClick={() => updateScore(field, 1)}
            style={{ backgroundColor: "#aaa", color: textColor }}
          >
            +
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );

  const displayScore = score.totalScore + opponentPenalties * 5;

  return (
    <div
      style={{
        backgroundColor: "#000000",
        color: textColor,
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Typography
        variant="h3"
        style={{ color: textColor, marginBottom: "2rem" }}
      >
        {teamColor.toUpperCase()} Score Form
      </Typography>

      <Grid container spacing={4} justifyContent="center" maxWidth="lg">
        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography
            variant="h5"
            style={{ color: textColor, marginBottom: "1rem" }}
          >
            Auto
          </Typography>
          {renderCounter("Ball", "autoBall")}
          <FormControlLabel
            control={
              <Checkbox
                checked={score.parked}
                onChange={(e) =>
                  updateAndSave({ ...score, parked: e.target.checked })
                }
                sx={{ color: textColor }}
              />
            }
            label={
              <Typography style={{ color: textColor }}>Parked?</Typography>
            }
            sx={{ mt: 2 }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography
            variant="h5"
            style={{ color: textColor, marginBottom: "1rem" }}
          >
            Driver-Control
          </Typography>
          {renderCounter("Robot-scored Balls", "teleopBall")}
          {renderCounter("Human-scored Balls", "teleopPlayerBalls")}
          <FormControlLabel
            control={
              <Checkbox
                checked={score.endgameBallFirst}
                onChange={(e) =>
                  updateAndSave({
                    ...score,
                    endgameBallFirst: e.target.checked,
                  })
                }
                sx={{ color: textColor }}
              />
            }
            label={
              <Typography style={{ color: textColor }}>
                Endgame Ball Scored First?
              </Typography>
            }
            sx={{ mt: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={score.endgameBallSecond}
                onChange={(e) =>
                  updateAndSave({
                    ...score,
                    endgameBallSecond: e.target.checked,
                  })
                }
                sx={{ color: textColor }}
              />
            }
            label={
              <Typography style={{ color: textColor }}>
                Endgame Ball Scored Second?
              </Typography>
            }
            sx={{ mt: 2 }}
          />

                    <FormControlLabel
            control={
              <Checkbox
                checked={score.climbed}
                onChange={(e) =>
                  updateAndSave({ ...score, climbed: e.target.checked })
                }
                sx={{ color: textColor }}
              />
            }
            label={
              <Typography style={{ color: textColor }}>Climbed?</Typography>
            }
            sx={{ mt: 2 }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography
            variant="h5"
            style={{ color: textColor, marginBottom: "1rem" }}
          >
            Post-Match
          </Typography>
          {renderCounter("Links Created", "teleopLinks")}
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography
            variant="h5"
            style={{ color: textColor, marginBottom: "1rem" }}
          >
            Penalties
          </Typography>
          {renderCounter("Penalties", "penalties")}
          <div style={{ marginTop: "1rem" }}>
            <Typography variant="subtitle1" style={{ color: textColor }}>
              Opponent Penalties: {opponentPenalties}
            </Typography>
            <Typography variant="caption" style={{ color: textColor }}>
              (+{opponentPenalties * 5} points)
            </Typography>
          </div>
        </Grid>

        <Grid size={12} style={{ textAlign: "center" }}>
          <Typography
            variant="h5"
            style={{ color: textColor, marginTop: "1rem" }}
          >
            Total Score: {displayScore}
          </Typography>
        </Grid>
      </Grid>
    </div>
  );
}

export default ScoreForm;

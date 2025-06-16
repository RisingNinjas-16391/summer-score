"use client";

import Grid from '@mui/material/Grid';
import { Button, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { useState } from 'react';
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export type CapOptions = 'blue' | 'red' | '';

export type ScoreData = {
  teamColor: CapOptions;
  autoPeg: number;
  autoUpright: number;
  autoKnocked: number;
  teleopPeg: number;
  teleopUpright: number;
  teleopKnocked: number;
  teleopRows: number;
  climbed: boolean;
  totalScore: number;
};

interface ScoreFormProps {
  teamColor: string;
}

function ScoreForm({ teamColor }: ScoreFormProps) {
  const [score, setScore] = useState<ScoreData>({
    teamColor: teamColor as CapOptions,
    autoPeg: 0,
    autoUpright: 0,
    autoKnocked: 0,
    teleopPeg: 0,
    teleopUpright: 0,
    teleopKnocked: 0,
    teleopRows: 0,
    climbed: false,
    totalScore: 0,
  });

  const textColor = teamColor === 'red' ? '#ff4d4f' : teamColor === 'blue' ? '#4d88ff' : 'white';

  const updateAndSave = (updated: ScoreData) => {
  const autoScore = (updated.autoPeg * 5 + updated.autoUpright * 2 + updated.autoKnocked * 1) * 2;
  const teleopScore =
    updated.teleopPeg * 5 +
    updated.teleopUpright * 2 +
    updated.teleopKnocked * 1 +
    updated.teleopRows * 5 +
    (updated.climbed ? 10 : 0);

  updated.totalScore = autoScore + teleopScore;
  setScore(updated);

  setDoc(doc(db, "realtime", teamColor), updated)
    .then(() => {
      console.log(`[DEBUG] Sent ${teamColor.toUpperCase()} score to Firebase:`, updated);
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to send ${teamColor.toUpperCase()} score:`, err);
    });
};


  const updateScore = (field: keyof ScoreData, delta: number) => {
    const newValue = Math.max(0, (score[field] as number) + delta);
    const updated = {
      ...score,
      [field]: newValue,
    };
    updateAndSave(updated);
  };

  const renderCounter = (label: string, field: keyof ScoreData) => (
    <Grid size={12}>
      <Typography variant="h6" style={{ color: textColor }}>{label}</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid>
          <Typography variant="h4" style={{ color: textColor }}>{score[field]}</Typography>
        </Grid>
        <Grid>
          <Button variant="contained" onClick={() => updateScore(field, -1)} style={{ backgroundColor: '#333', color: textColor }}>-</Button>
        </Grid>
        <Grid>
          <Button variant="contained" onClick={() => updateScore(field, 1)} style={{ backgroundColor: '#aaa', color: textColor }}>+</Button>
        </Grid>
      </Grid>
    </Grid>
  );

  return (
    <div style={{ backgroundColor: '#1a1a1a', color: textColor, padding: '2rem' }}>
      <Typography variant="h3" align="center" style={{ color: textColor, marginBottom: '2rem' }}>
        {teamColor.toUpperCase()} Score Form
      </Typography>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h5" style={{ color: textColor }}>Auto Period</Typography>
        </Grid>
        {renderCounter("Peg", "autoPeg")}
        {renderCounter("Upright", "autoUpright")}
        {renderCounter("Knocked", "autoKnocked")}

        <Grid size={12}>
          <Typography variant="h5" style={{ color: textColor }}>Teleop Period</Typography>
        </Grid>
        {renderCounter("Peg", "teleopPeg")}
        {renderCounter("Upright", "teleopUpright")}
        {renderCounter("Knocked", "teleopKnocked")}
        {renderCounter("Rows Owned", "teleopRows")}

        <Grid size={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={score.climbed}
                onChange={(e) => {
                  const updated = {
                    ...score,
                    climbed: e.target.checked,
                  };
                  updateAndSave(updated);
                }}
                sx={{ color: textColor }}
              />
            }
            label={<Typography style={{ color: textColor }}>Climbed?</Typography>}
          />
        </Grid>

        <Grid size={12}>
          <Typography variant="h6" style={{ color: textColor }}>
            Total Score: {score.totalScore}
          </Typography>
        </Grid>
      </Grid>
    </div>
  );
}

export default ScoreForm;

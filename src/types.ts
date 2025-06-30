export type MatchData = {
  name: string;
  red_name: string;
  blue_name: string;
};

export type ScoreData = {
  teamColor: "red" | "blue";
  autoPeg: number;
  autoUpright: number;
  autoKnocked: number;
  parked: boolean;
  autoScore: number;
  teleopPeg: number;
  teleopUpright: number;
  teleopKnocked: number;
  teleopRows: number;
  teleopScore: number;
  climbed: boolean;
  postMatchAddedPoints: number;
  totalScore: number;
  penalties: number;
  preliminaryScore: number;
};

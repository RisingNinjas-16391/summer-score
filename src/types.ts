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
  teleopPeg: number;
  teleopUpright: number;
  teleopKnocked: number;
  teleopRows: number;
  climbed: boolean;
  totalScore: number;
};

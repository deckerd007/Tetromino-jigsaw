export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Point {
  x: number;
  y: number;
}

export interface Tetromino {
  id: string;
  groupId: string;
  type: TetrominoType;
  position: Point;
  rotation: number;
  isPlaced: boolean;
  color: string;
  targetPosition: Point;
  targetRotation: number;
}

export interface GameState {
  placedBlocks: Tetromino[];
  availableBlocks: Tetromino[];
  targetGrid: boolean[][]; // true if cell needs to be filled
  gridSize: number;
}

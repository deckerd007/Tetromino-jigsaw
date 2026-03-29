/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, RotateCw, Trash2, CheckCircle2, Trophy, Info } from 'lucide-react';
import { Tetromino, TetrominoType, Point } from './types';
import { TETROMINO_SHAPES, TETROMINO_COLORS, GRID_SIZE, CELL_SIZE } from './constants';

const TETROMINO_CENTERS: Record<TetrominoType, {x: number, y: number}> = {
  I: {x: 2, y: 0.5},
  J: {x: 1.5, y: 1.0},
  L: {x: 1.5, y: 1.0},
  O: {x: 1, y: 1},
  S: {x: 1.5, y: 1.0},
  T: {x: 1.5, y: 1.0},
  Z: {x: 1.5, y: 1.0}
};

// Helper to rotate points
const rotatePoints = (type: TetrominoType, rotation: number): Point[] => {
  const points = TETROMINO_SHAPES[type];
  if (rotation % 360 === 0) return points;
  
  const cx = TETROMINO_CENTERS[type].x;
  const cy = TETROMINO_CENTERS[type].y;
  
  const rotated = points.map(p => {
    // Center of the cell
    const cellCx = p.x + 0.5;
    const cellCy = p.y + 0.5;
    
    // Rotate around local center
    const r = rotateAround({ x: cellCx, y: cellCy }, { x: cx, y: cy }, rotation);
    
    // Convert back to top-left coordinate
    return {
      x: Math.round(r.x - 0.5),
      y: Math.round(r.y - 0.5)
    };
  });

  // Normalize so the top-left cell is always at (0,0)
  return normalizePoints(rotated);
};


// Helper to rotate a point around a center
const rotateAround = (point: Point, center: { x: number; y: number }, rotation: number): Point => {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: dx * cos - dy * sin + center.x,
    y: dx * sin + dy * cos + center.y
  };
};

// Helper to get normalized points (min x, y = 0)
const normalizePoints = (points: Point[]): Point[] => {
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  return points.map(p => ({ x: p.x - minX, y: p.y - minY }));
};

interface BlockProps {
  block: Tetromino;
  onDragEnd: (b: Tetromino, event: any, info: any) => void;
  onRotate: (id: string) => void;
  isPlaced: boolean;
  imageUrl?: string;
}

const Block: React.FC<BlockProps> = ({ 
  block, 
  onDragEnd, 
  onRotate,
  isPlaced,
  imageUrl
}) => {
  const targetShape = useMemo(() => rotatePoints(block.type, block.targetRotation), [block.type, block.targetRotation]);
  
  const centroid = useMemo(() => {
    const center = TETROMINO_CENTERS[block.type];
    return { x: center.x * CELL_SIZE, y: center.y * CELL_SIZE };
  }, [block.type]);

  return (
    <motion.div
      layoutId={block.id}
      drag={!isPlaced}
      dragMomentum={false}
      onDragEnd={(event, info) => onDragEnd(block, event, info)}
      className={`absolute ${isPlaced ? '' : 'cursor-grab active:cursor-grabbing'} z-10 tetromino-block drop-shadow-md`}
      initial={false}
      animate={{
        x: block.position.x * CELL_SIZE,
        y: block.position.y * CELL_SIZE,
        rotate: block.rotation - block.targetRotation,
        zIndex: isPlaced ? 10 : 20,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        left: 0,
        top: 0,
        width: CELL_SIZE,
        height: CELL_SIZE,
        transformOrigin: `${centroid.x}px ${centroid.y}px`
      }}
      whileHover={!isPlaced ? { scale: 1.02, zIndex: 50 } : {}}
      whileDrag={!isPlaced ? { scale: 1.05, zIndex: 100 } : {}}
      onTap={() => !isPlaced && onRotate(block.id)}
    >
      <div className="relative">
        {targetShape.map((p, i) => {
          const solvedX = block.targetPosition.x + p.x;
          const solvedY = block.targetPosition.y + p.y;

          return (
            <div
              key={i}
              className="absolute overflow-hidden"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: p.x * CELL_SIZE,
                top: p.y * CELL_SIZE,
                backgroundColor: isPlaced ? 'transparent' : '#f0f0f0',
                backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                backgroundSize: `${GRID_SIZE * CELL_SIZE}px ${GRID_SIZE * CELL_SIZE}px`,
                backgroundPosition: `-${solvedX * CELL_SIZE}px -${solvedY * CELL_SIZE}px`,
                border: isPlaced ? 'none' : '1px solid rgba(0,0,0,0.1)',
                borderRadius: '2px',
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

interface BlockGroupProps {
  blocks: Tetromino[];
  onDragEnd: (b: Tetromino, event: any, info: any) => void;
  onRotate: (id: string) => void;
  imageUrl?: string;
  activeGroupId: string | null;
  onDragStart: (groupId: string) => void;
}

const BlockGroup: React.FC<BlockGroupProps> = ({ 
  blocks, 
  onDragEnd, 
  onRotate,
  imageUrl,
  activeGroupId,
  onDragStart
}) => {
  const refBlock = blocks[0];
  const isActive = activeGroupId === refBlock.groupId;

  const centroid = useMemo(() => {
    let tx = 0, ty = 0, count = 0;
    blocks.forEach(b => {
      const center = TETROMINO_CENTERS[b.type];
      const relX = b.targetPosition.x - refBlock.targetPosition.x;
      const relY = b.targetPosition.y - refBlock.targetPosition.y;
      tx += (relX + center.x);
      ty += (relY + center.y);
      count++;
    });
    return { x: (tx / count) * CELL_SIZE, y: (ty / count) * CELL_SIZE };
  }, [blocks, refBlock]);
  
  return (
    <motion.div
      layout
      drag
      dragMomentum={false}
      onDragStart={() => onDragStart(refBlock.groupId)}
      onDragEnd={(event, info) => onDragEnd(refBlock, event, info)}
      className="absolute cursor-grab active:cursor-grabbing z-10 tetromino-block drop-shadow-md"
      initial={false}
      animate={{
        x: refBlock.position.x * CELL_SIZE,
        y: refBlock.position.y * CELL_SIZE,
        rotate: refBlock.rotation - refBlock.targetRotation,
        zIndex: isActive ? 100 : 10,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        left: 0,
        top: 0,
        width: CELL_SIZE,
        height: CELL_SIZE,
        transformOrigin: `${centroid.x}px ${centroid.y}px`
      }}
    >
      {blocks.map(block => {
        const targetShape = rotatePoints(block.type, block.targetRotation);
        const relX = block.targetPosition.x - refBlock.targetPosition.x;
        const relY = block.targetPosition.y - refBlock.targetPosition.y;

        return (
          <motion.div 
            key={block.id} 
            className="absolute"
            style={{ 
              left: relX * CELL_SIZE, 
              top: relY * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE
            }}
            onTap={() => onRotate(block.id)}
          >
            {targetShape.map((p, i) => {
              const solvedX = block.targetPosition.x + p.x;
              const solvedY = block.targetPosition.y + p.y;

              return (
                <div
                  key={i}
                  className="absolute overflow-hidden"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    left: p.x * CELL_SIZE,
                    top: p.y * CELL_SIZE,
                    backgroundColor: '#f0f0f0',
                    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                    backgroundSize: `${GRID_SIZE * CELL_SIZE}px ${GRID_SIZE * CELL_SIZE}px`,
                    backgroundPosition: `-${solvedX * CELL_SIZE}px -${solvedY * CELL_SIZE}px`,
                  }}
                />
              );
            })}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

type PuzzleSize = '4x4' | '4x6';

const PUZZLE_CONFIGS: Record<PuzzleSize, { width: number; height: number; offsetX: number; offsetY: number; blocks: { type: TetrominoType; targetX: number; targetY: number; targetRot: number }[] }> = {
  '4x4': {
    width: 4,
    height: 4,
    offsetX: 2,
    offsetY: 2,
    blocks: [
      // Row 0: I (horizontal 4 wide)        covers (2,2)(3,2)(4,2)(5,2)
      { type: 'I', targetX: 2, targetY: 2, targetRot: 0 },
      // Rows 1-2: two O pieces              covers (2,3)(3,3)(2,4)(3,4) and (4,3)(5,3)(4,4)(5,4)
      { type: 'O', targetX: 2, targetY: 3, targetRot: 0 },
      { type: 'O', targetX: 4, targetY: 3, targetRot: 0 },
      // Row 3: I (horizontal 4 wide)        covers (2,5)(3,5)(4,5)(5,5)
      { type: 'I', targetX: 2, targetY: 5, targetRot: 0 },
    ]
  },
  '4x6': {
    width: 4,
    height: 6,
    offsetX: 2,
    offsetY: 1,
    blocks: [
      // Grid x=[2..5], y=[1..6], 24 cells total, 6 pieces
      //
      // Verified layout (no overlaps):
      //   y=1:     I(rot=0)   at (2,1) → (2,1)(3,1)(4,1)(5,1)
      //   y=2-4:   L(rot=90)  at (2,2) → (2,2)(2,3)(2,4)(3,4)
      //            O(rot=0)   at (3,2) → (3,2)(4,2)(3,3)(4,3)
      //            J(rot=270) at (4,2) → (5,2)(5,3)(5,4)(4,4)
      //   y=5-6:   O(rot=0)   at (2,5) → (2,5)(3,5)(2,6)(3,6)
      //            O(rot=0)   at (4,5) → (4,5)(5,5)(4,6)(5,6)
      //   Total: 24 cells ✓  No overlaps ✓
      { type: 'I',  targetX: 2, targetY: 1, targetRot: 0   },  // top row
      { type: 'L',  targetX: 2, targetY: 2, targetRot: 90  },  // left column 3-tall
      { type: 'O',  targetX: 3, targetY: 2, targetRot: 0   },  // center 2x2
      { type: 'J',  targetX: 4, targetY: 2, targetRot: 270 },  // right column 3-tall
      { type: 'O',  targetX: 2, targetY: 5, targetRot: 0   },  // bottom-left 2x2
      { type: 'O',  targetX: 4, targetY: 5, targetRot: 0   },  // bottom-right 2x2
    ]
  }
};

export default function App() {
  const [blocks, setBlocks] = useState<Tetromino[]>([]);
  const [targetGrid, setTargetGrid] = useState<boolean[][]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [puzzleImage, setPuzzleImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<PuzzleSize>('4x4');
  const [gameStarted, setGameStarted] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    startNewGame(selectedSize);
  }, [selectedSize]);

  const startNewGame = (size: PuzzleSize = selectedSize) => {
    const config = PUZZLE_CONFIGS[size];
    if (!config) return;

    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    
    for (let y = config.offsetY; y < config.offsetY + config.height; y++) {
      for (let x = config.offsetX; x < config.offsetX + config.width; x++) {
        newGrid[y][x] = true;
      }
    }
    setTargetGrid(newGrid);

    // New random image for each game
    const randomSeed = Math.floor(Math.random() * 1000);
    const imageUrl = `https://picsum.photos/seed/${randomSeed}/400/400`;
    setPuzzleImage(imageUrl);

    const initialBlocks: Tetromino[] = config.blocks.map((blockConfig, i) => {
      const id = `block-${i}-${Date.now()}`;
      
      return {
        id,
        groupId: id,
        type: blockConfig.type,
        // Start at target position for debugging/preview
        position: { x: blockConfig.targetX, y: blockConfig.targetY },
        rotation: blockConfig.targetRot,
        isPlaced: true,
        color: TETROMINO_COLORS[blockConfig.type],
        targetPosition: { x: blockConfig.targetX, y: blockConfig.targetY },
        targetRotation: blockConfig.targetRot,
      };
    });
    
    setBlocks(initialBlocks);
    setGameWon(false);
    setGameStarted(false);
  };

  const shuffleBlocks = () => {
    setBlocks(prev => {
      return prev.map(block => ({
        ...block,
        groupId: block.id, // Ungroup everything
        position: {
          x: Math.floor(Math.random() * (GRID_SIZE - 2)),
          y: Math.floor(Math.random() * (GRID_SIZE - 2))
        },
        rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)]
      }));
    });
    setGameStarted(true);
    setGameWon(false);
  };

  const checkGrouping = (currentBlocks: Tetromino[]) => {
    // Deep-copy positions to avoid mutation issues
    const newBlocks = currentBlocks.map(b => ({ ...b, position: { ...b.position } }));
    let changed = false;
    let didMerge = true;

    while (didMerge) {
      didMerge = false;

      outer:
      for (let i = 0; i < newBlocks.length; i++) {
        for (let j = i + 1; j < newBlocks.length; j++) {
          const a = newBlocks[i];
          const b = newBlocks[j];

          if (a.groupId === b.groupId) continue;

          // Both must have the same rotation offset from their target
          const offsetA = ((a.rotation - a.targetRotation) % 360 + 360) % 360;
          const offsetB = ((b.rotation - b.targetRotation) % 360 + 360) % 360;
          if (offsetA !== offsetB) continue;

          // When two pieces are in correct relative position (with rotation applied),
          // the actual position difference equals the target position difference rotated by offsetA.
          const tdx = a.targetPosition.x - b.targetPosition.x;
          const tdy = a.targetPosition.y - b.targetPosition.y;

          // Rotate the target delta by the same rotation offset
          const rotated = rotateAround({ x: tdx, y: tdy }, { x: 0, y: 0 }, offsetA);
          const expectedRelX = Math.round(rotated.x);
          const expectedRelY = Math.round(rotated.y);

          // Actual relative position (rounded to nearest grid cell)
          const actualRelX = Math.round(a.position.x - b.position.x);
          const actualRelY = Math.round(a.position.y - b.position.y);

          if (actualRelX === expectedRelX && actualRelY === expectedRelY) {
            // Merge group B into group A, snapping B blocks to exact integer position
            const oldGroupId = b.groupId;
            const newGroupId = a.groupId;

            // Sub-grid snap correction
            const snapDx = expectedRelX - (a.position.x - b.position.x);
            const snapDy = expectedRelY - (a.position.y - b.position.y);

            for (let k = 0; k < newBlocks.length; k++) {
              if (newBlocks[k].groupId === oldGroupId) {
                newBlocks[k] = {
                  ...newBlocks[k],
                  groupId: newGroupId,
                  position: {
                    x: newBlocks[k].position.x + snapDx,
                    y: newBlocks[k].position.y + snapDy,
                  }
                };
              }
            }

            changed = true;
            didMerge = true;
            break outer;
          }
        }
      }
    }

    return changed ? newBlocks : currentBlocks;
  };

  const handleRotate = (id: string) => {
    setBlocks(prev => {
      const targetBlock = prev.find(b => b.id === id);
      if (!targetBlock) return prev;

      const groupId = targetBlock.groupId;
      setActiveGroupId(groupId);
      
      const rotatedBlocks = prev.map(b => {
        if (b.groupId !== groupId) return b;
        return {
          ...b,
          rotation: b.rotation + 90
        };
      });

      return checkGrouping(rotatedBlocks);
    });
  };

  const onDragEnd = (block: Tetromino, event: any, info: any) => {
    setActiveGroupId(null);
    setBlocks(prev => {
      const groupId = block.groupId;
      const dx = Math.round(info.offset.x / CELL_SIZE);
      const dy = Math.round(info.offset.y / CELL_SIZE);

      if (dx === 0 && dy === 0) return prev;

      const nextBlocks = prev.map(b => 
        b.groupId === groupId ? { ...b, position: { x: b.position.x + dx, y: b.position.y + dy } } : b
      );
      
      return checkGrouping(nextBlocks);
    });
  };

  useEffect(() => {
    if (blocks.length === 0 || !gameStarted) return;

    // Win condition: Check if all blocks are close to their target positions and rotations
    const allCorrect = blocks.every(block => {
      const posDiff = Math.sqrt(
        Math.pow(Math.round(block.position.x) - block.targetPosition.x, 2) + 
        Math.pow(Math.round(block.position.y) - block.targetPosition.y, 2)
      );
      const rotDiff = (Math.abs(block.rotation - block.targetRotation) % 360 + 360) % 360;
      
      return posDiff < 0.1 && (rotDiff < 10 || rotDiff > 350);
    });

    if (allCorrect) {
      setGameWon(true);
    }
  }, [blocks, gameStarted]);

  // Group blocks by groupId and sort them for a stable refBlock
  const groupedBlocks = useMemo(() => {
    const groups = blocks.reduce((acc, block) => {
      if (!acc[block.groupId]) acc[block.groupId] = [];
      acc[block.groupId].push(block);
      return acc;
    }, {} as Record<string, Tetromino[]>);

    // Sort each group by ID to ensure blocks[0] is stable
    Object.keys(groups).forEach(id => {
      groups[id].sort((a, b) => a.id.localeCompare(b.id));
    });

    return groups;
  }, [blocks]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 sm:p-8 flex flex-col items-center overflow-x-hidden">
      <header className="w-full max-w-4xl flex flex-wrap justify-between items-center border-b-2 border-[#141414] pb-4 mb-8 gap-4">
        <div className="flex flex-col">
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none">Tetromino</h1>
          <h2 className="text-xl sm:text-2xl font-serif italic opacity-60">Jigsaw Puzzle</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#141414]/10 p-1 rounded-sm">
            {(['4x4', '4x6'] as PuzzleSize[]).map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-1 font-bold uppercase tracking-widest transition-all ${
                  selectedSize === size 
                    ? 'bg-[#141414] text-[#E4E3E0]' 
                    : 'text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {!gameStarted ? (
            <button 
              onClick={shuffleBlocks}
              className="px-6 py-2 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-80 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
            >
              <Trash2 size={18} />
              Shuffle
            </button>
          ) : (
            <button 
              onClick={() => startNewGame()}
              className="px-6 py-2 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-80 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center gap-8">
        {/* Game Board */}
        <div className="relative">
          <div 
            ref={boardRef}
            className="relative border-4 border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            style={{ 
              width: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 40), 
              height: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 40),
            }}
          >
            {/* Target Area Outline */}
            {PUZZLE_CONFIGS[selectedSize] && (
              <div 
                className="absolute border-4 border-dashed border-[#141414] pointer-events-none z-0"
                style={{
                  left: PUZZLE_CONFIGS[selectedSize].offsetX * CELL_SIZE,
                  top: PUZZLE_CONFIGS[selectedSize].offsetY * CELL_SIZE,
                  width: PUZZLE_CONFIGS[selectedSize].width * CELL_SIZE,
                  height: PUZZLE_CONFIGS[selectedSize].height * CELL_SIZE,
                  backgroundColor: 'rgba(20,20,20,0.03)'
                }}
              />
            )}

            {/* Blocks (Grouped) */}
            {Object.entries(groupedBlocks).map(([groupId, groupBlocks]) => (
              <BlockGroup 
                key={groupId} 
                blocks={groupBlocks} 
                onDragEnd={onDragEnd} 
                onRotate={handleRotate}
                imageUrl={puzzleImage}
                activeGroupId={activeGroupId}
                onDragStart={setActiveGroupId}
              />
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="max-w-2xl text-center px-4">
          <p className="text-sm uppercase tracking-widest font-bold opacity-40 mb-2">Instructions</p>
          <p className="text-base sm:text-lg">
            Drag the pieces to fill the <span className="font-bold underline">shaded area</span>. 
            Click a piece to <span className="font-bold underline">rotate around its center</span>. 
            Pieces will <span className="font-bold underline">snap together</span> when aligned correctly.
          </p>
        </div>
      </main>

      {/* Win Modal - Adjusted to not cover the board entirely */}
      <AnimatePresence>
        {gameWon && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-[#141414] text-[#E4E3E0] p-6 sm:p-8 border-4 border-white shadow-[12px_12px_0px_0px_rgba(20,20,20,0.5)] text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Trophy className="text-yellow-400" size={32} />
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Puzzle Solved!</h2>
              </div>
              <p className="font-serif italic text-lg mb-6 opacity-80">You've successfully completed the image.</p>
              <button 
                onClick={startNewGame}
                className="w-full py-3 bg-[#E4E3E0] text-[#141414] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={20} />
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

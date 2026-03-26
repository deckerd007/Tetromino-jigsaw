/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, RotateCw, Trash2, CheckCircle2, Trophy, Info } from 'lucide-react';
import { Tetromino, TetrominoType, Point } from './types';
import { TETROMINO_SHAPES, TETROMINO_COLORS, GRID_SIZE, CELL_SIZE } from './constants';

// Helper to rotate points
const rotatePoints = (points: Point[], rotation: number): Point[] => {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  
  return points.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos
  }));
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
  // Always use the 0-rotation shape for the local layout
  const shape = useMemo(() => normalizePoints(rotatePoints(TETROMINO_SHAPES[block.type], 0)), [block.type]);
  
  // Calculate centroid for rotation pivot (average of cell centers)
  const centroid = useMemo(() => {
    const sumX = shape.reduce((sum, p) => sum + p.x, 0);
    const sumY = shape.reduce((sum, p) => sum + p.y, 0);
    return {
      x: (sumX / shape.length) + 0.5,
      y: (sumY / shape.length) + 0.5
    };
  }, [shape]);
  
  return (
    <motion.div
      layoutId={block.id}
      drag
      dragMomentum={false}
      onDragEnd={(event, info) => onDragEnd(block, event, info)}
      className="absolute cursor-grab active:cursor-grabbing z-10 tetromino-block drop-shadow-md"
      initial={false}
      animate={{
        x: block.position.x * CELL_SIZE,
        y: block.position.y * CELL_SIZE,
        rotate: block.rotation,
        zIndex: isPlaced ? 10 : 20,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        left: 0,
        top: 0,
        width: CELL_SIZE,
        height: CELL_SIZE,
        transformOrigin: `${centroid.x * CELL_SIZE}px ${centroid.y * CELL_SIZE}px`
      }}
      whileHover={{ scale: 1.02, zIndex: 50 }}
      whileDrag={{ scale: 1.05, zIndex: 100 }}
      onTap={() => onRotate(block.id)}
    >
      <div className="relative">
        {shape.map((p, i) => {
          const targetShape = rotatePoints(TETROMINO_SHAPES[block.type], block.targetRotation);
          const targetP = targetShape[i];
          
          const solvedX = block.targetPosition.x + targetP.x;
          const solvedY = block.targetPosition.y + targetP.y;

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
                // Counteract the target rotation so the image is upright when solved
                transform: `rotate(${-block.targetRotation}deg)`,
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
}

const BlockGroup: React.FC<BlockGroupProps> = ({ 
  blocks, 
  onDragEnd, 
  onRotate,
  imageUrl
}) => {
  const refBlock = blocks[0];

  // Calculate the centroid of the entire group relative to the refBlock's top-left (0,0)
  // This centroid is stable for a given group configuration.
  const centroid = useMemo(() => {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    blocks.forEach(block => {
      // Use the unrotated shape to calculate a stable relative centroid
      const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[block.type], 0));
      const relX = block.targetPosition.x - refBlock.targetPosition.x;
      const relY = block.targetPosition.y - refBlock.targetPosition.y;
      shape.forEach(p => {
        sumX += relX + p.x;
        sumY += relY + p.y;
        count++;
      });
    });
    return {
      x: (sumX / count) + 0.5,
      y: (sumY / count) + 0.5
    };
  }, [blocks, refBlock]);
  
  return (
    <motion.div
      layout
      drag
      dragMomentum={false}
      onDragEnd={(event, info) => onDragEnd(refBlock, event, info)}
      className="absolute cursor-grab active:cursor-grabbing z-10 tetromino-block drop-shadow-md"
      initial={false}
      animate={{
        x: refBlock.position.x * CELL_SIZE,
        y: refBlock.position.y * CELL_SIZE,
        rotate: refBlock.rotation,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        left: 0,
        top: 0,
        width: CELL_SIZE,
        height: CELL_SIZE,
        transformOrigin: `${centroid.x * CELL_SIZE}px ${centroid.y * CELL_SIZE}px`
      }}
    >
      {blocks.map(block => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[block.type], 0));
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
            {shape.map((p, i) => {
              const targetShape = rotatePoints(TETROMINO_SHAPES[block.type], block.targetRotation);
              const targetP = targetShape[i];
              const solvedX = block.targetPosition.x + targetP.x;
              const solvedY = block.targetPosition.y + targetP.y;

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
                    transform: `rotate(${-block.targetRotation}deg)`,
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
      { type: 'I', targetX: 2, targetY: 2, targetRot: 0 },
      { type: 'O', targetX: 2, targetY: 3, targetRot: 0 },
      { type: 'O', targetX: 4, targetY: 3, targetRot: 0 },
      { type: 'I', targetX: 2, targetY: 5, targetRot: 0 },
    ]
  },
  '4x6': {
    width: 4,
    height: 6,
    offsetX: 2,
    offsetY: 1,
    blocks: [
      { type: 'I', targetX: 2, targetY: 1, targetRot: 0 },
      { type: 'O', targetX: 2, targetY: 2, targetRot: 0 },
      { type: 'J', targetX: 4, targetY: 1, targetRot: 90 },
      { type: 'L', targetX: 2, targetY: 4, targetRot: 0 },
      { type: 'S', targetX: 3, targetY: 5, targetRot: 0 },
      { type: 'T', targetX: 2, targetY: 6, targetRot: 0 },
    ]
  }
};

export default function App() {
  const [blocks, setBlocks] = useState<Tetromino[]>([]);
  const [targetGrid, setTargetGrid] = useState<boolean[][]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [puzzleImage, setPuzzleImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<PuzzleSize>('4x4');
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    startNewGame(selectedSize);
  }, [selectedSize]);

  const startNewGame = (size: PuzzleSize = selectedSize) => {
    const config = PUZZLE_CONFIGS[size];
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
      // Random starting position on the board, but not exactly at target
      const startX = Math.floor(Math.random() * (GRID_SIZE - 2));
      const startY = Math.floor(Math.random() * (GRID_SIZE - 2));
      
      return {
        id,
        groupId: id,
        type: blockConfig.type,
        position: { x: startX, y: startY },
        // Randomize starting rotation for challenge
        rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
        isPlaced: true,
        color: TETROMINO_COLORS[blockConfig.type],
        targetPosition: { x: blockConfig.targetX, y: blockConfig.targetY },
        targetRotation: blockConfig.targetRot,
      };
    });
    
    setBlocks(initialBlocks);
    setGameWon(false);
  };

  const checkGrouping = (currentBlocks: Tetromino[]) => {
    const newBlocks = [...currentBlocks];
    let changed = false;

    for (let i = 0; i < newBlocks.length; i++) {
      for (let j = i + 1; j < newBlocks.length; j++) {
        const a = newBlocks[i];
        const b = newBlocks[j];

        if (!a.isPlaced || !b.isPlaced || a.groupId === b.groupId) continue;

        // Relative rotation offset from target
        const offsetA = ((a.rotation - a.targetRotation) % 360 + 360) % 360;
        const offsetB = ((b.rotation - b.targetRotation) % 360 + 360) % 360;

        if (offsetA !== offsetB) continue;

        // Check relative alignment
        const targetRelX = a.targetPosition.x - b.targetPosition.x;
        const targetRelY = a.targetPosition.y - b.targetPosition.y;
        
        // Rotate the target relative vector by the current group rotation offset
        const rotatedTargetRel = rotatePoints([{ x: targetRelX, y: targetRelY }], offsetA)[0];

        const relX = a.position.x - b.position.x;
        const relY = a.position.y - b.position.y;

        if (relX === rotatedTargetRel.x && relY === rotatedTargetRel.y) {
          // Merge groups
          const oldGroupId = b.groupId;
          const newGroupId = a.groupId;
          for (let k = 0; k < newBlocks.length; k++) {
            if (newBlocks[k].groupId === oldGroupId) {
              newBlocks[k].groupId = newGroupId;
            }
          }
          changed = true;
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
      const group = prev.filter(b => b.groupId === groupId);
      const refBlock = group.sort((a, b) => a.id.localeCompare(b.id))[0];

      // Calculate group centroid relative to refBlock's top-left (0,0)
      let sumX = 0, sumY = 0, count = 0;
      group.forEach(b => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[b.type], 0));
        const relX = b.targetPosition.x - refBlock.targetPosition.x;
        const relY = b.targetPosition.y - refBlock.targetPosition.y;
        shape.forEach(p => {
          sumX += relX + p.x;
          sumY += relY + p.y;
          count++;
        });
      });
      const gcx = sumX / count + 0.5;
      const gcy = sumY / count + 0.5;

      const newRotation = refBlock.rotation + 90;
      
      // Calculate bounds after rotation around centroid
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      group.forEach(b => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[b.type], 0));
        const relX = b.targetPosition.x - refBlock.targetPosition.x;
        const relY = b.targetPosition.y - refBlock.targetPosition.y;
        
        shape.forEach(p => {
          const localX = relX + p.x + 0.5;
          const localY = relY + p.y + 0.5;
          
          const rad = (newRotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          
          const rx = (localX - gcx) * cos - (localY - gcy) * sin;
          const ry = (localX - gcx) * sin + (localY - gcy) * cos;
          
          const gx = Math.round(refBlock.position.x + gcx + rx - 0.5);
          const gy = Math.round(refBlock.position.y + gcy + ry - 0.5);
          
          minX = Math.min(minX, gx);
          maxX = Math.max(maxX, gx);
          minY = Math.min(minY, gy);
          maxY = Math.max(maxY, gy);
        });
      });
      
      // If out of bounds, shift the group back
      let dx = 0, dy = 0;
      if (minX < 0) dx = -minX;
      if (maxX >= GRID_SIZE) dx = GRID_SIZE - 1 - maxX;
      if (minY < 0) dy = -minY;
      if (maxY >= GRID_SIZE) dy = GRID_SIZE - 1 - maxY;

      const finalBlocks = prev.map(b => {
        if (b.groupId !== groupId) return b;
        return { 
          ...b, 
          rotation: newRotation,
          position: { x: b.position.x + dx, y: b.position.y + dy } 
        };
      });

      return checkGrouping(finalBlocks);
    });
  };

  const onDragEnd = (block: Tetromino, event: any, info: any) => {
    setBlocks(prev => {
      const groupId = block.groupId;
      const dx = Math.round(info.offset.x / CELL_SIZE);
      const dy = Math.round(info.offset.y / CELL_SIZE);

      if (dx === 0 && dy === 0) return prev;

      const group = prev.filter(b => b.groupId === groupId);
      const refBlock = group.sort((a, b) => a.id.localeCompare(b.id))[0];

      // Calculate group centroid relative to refBlock's top-left (0,0)
      let sumX = 0, sumY = 0, count = 0;
      group.forEach(b => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[b.type], 0));
        const relX = b.targetPosition.x - refBlock.targetPosition.x;
        const relY = b.targetPosition.y - refBlock.targetPosition.y;
        shape.forEach(p => {
          sumX += relX + p.x;
          sumY += relY + p.y;
          count++;
        });
      });
      const gcx = sumX / count + 0.5;
      const gcy = sumY / count + 0.5;
      
      // Calculate bounds after move
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      group.forEach(b => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[b.type], 0));
        const relX = b.targetPosition.x - refBlock.targetPosition.x;
        const relY = b.targetPosition.y - refBlock.targetPosition.y;
        
        shape.forEach(p => {
          const localX = relX + p.x + 0.5;
          const localY = relY + p.y + 0.5;
          
          const rad = (b.rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          
          const rx = (localX - gcx) * cos - (localY - gcy) * sin;
          const ry = (localX - gcx) * sin + (localY - gcy) * cos;
          
          const gx = Math.round(refBlock.position.x + dx + gcx + rx - 0.5);
          const gy = Math.round(refBlock.position.y + dy + gcy + ry - 0.5);
          
          minX = Math.min(minX, gx);
          maxX = Math.max(maxX, gx);
          minY = Math.min(minY, gy);
          maxY = Math.max(maxY, gy);
        });
      });

      // Clamp to board
      let finalDx = dx;
      let finalDy = dy;
      if (minX < 0) finalDx -= minX;
      if (maxX >= GRID_SIZE) finalDx -= (maxX - (GRID_SIZE - 1));
      if (minY < 0) finalDy -= minY;
      if (maxY >= GRID_SIZE) finalDy -= (maxY - (GRID_SIZE - 1));

      const nextBlocks = prev.map(b => 
        b.groupId === groupId ? { ...b, position: { x: b.position.x + finalDx, y: b.position.y + finalDy } } : b
      );
      
      return checkGrouping(nextBlocks);
    });
  };

  useEffect(() => {
    if (blocks.length === 0) return;

    // Win condition: Compare the set of occupied cells for each block
    // We must account for the fact that groups rotate around their centroid.
    const allCorrect = blocks.every(block => {
      const group = blocks.filter(b => b.groupId === block.groupId);
      const refBlock = group.sort((a, b) => a.id.localeCompare(b.id))[0];
      
      // Calculate group centroid relative to refBlock's top-left (0,0)
      let sumX = 0, sumY = 0, count = 0;
      group.forEach(b => {
        const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[b.type], 0));
        const relX = b.targetPosition.x - refBlock.targetPosition.x;
        const relY = b.targetPosition.y - refBlock.targetPosition.y;
        shape.forEach(p => {
          sumX += relX + p.x;
          sumY += relY + p.y;
          count++;
        });
      });
      const gcx = sumX / count + 0.5;
      const gcy = sumY / count + 0.5;

      // Current occupied cells in grid coordinates
      const shape = normalizePoints(rotatePoints(TETROMINO_SHAPES[block.type], 0));
      const relX = block.targetPosition.x - refBlock.targetPosition.x;
      const relY = block.targetPosition.y - refBlock.targetPosition.y;
      
      const currentCells = shape.map(p => {
        const localX = relX + p.x + 0.5;
        const localY = relY + p.y + 0.5;
        
        // Rotate around group centroid
        const rad = (block.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const rx = (localX - gcx) * cos - (localY - gcy) * sin;
        const ry = (localX - gcx) * sin + (localY - gcy) * cos;
        
        const finalX = Math.round(refBlock.position.x + gcx + rx - 0.5);
        const finalY = Math.round(refBlock.position.y + gcy + ry - 0.5);
        
        return `${finalX},${finalY}`;
      }).sort();
      
      // Target occupied cells in grid coordinates
      const targetShape = rotatePoints(TETROMINO_SHAPES[block.type], block.targetRotation);
      const targetCells = targetShape.map(p => 
        `${Math.round(block.targetPosition.x + p.x)},${Math.round(block.targetPosition.y + p.y)}`
      ).sort();
      
      return JSON.stringify(currentCells) === JSON.stringify(targetCells);
    });

    if (allCorrect) {
      setGameWon(true);
    }
  }, [blocks]);

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

          <button 
            onClick={() => startNewGame()}
            className="px-6 py-2 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-80 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
          >
            <RotateCcw size={18} />
            Reset
          </button>
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
            <div 
              className="absolute border-4 border-dashed border-[#141414] pointer-events-none z-0"
              style={{
                left: 2 * CELL_SIZE,
                top: 2 * CELL_SIZE,
                width: 4 * CELL_SIZE,
                height: 4 * CELL_SIZE,
                backgroundColor: 'rgba(20,20,20,0.03)'
              }}
            />

            {/* Blocks (Grouped) */}
            {Object.entries(groupedBlocks).map(([groupId, groupBlocks]) => (
              <BlockGroup 
                key={groupId} 
                blocks={groupBlocks} 
                onDragEnd={onDragEnd} 
                onRotate={handleRotate}
                imageUrl={puzzleImage}
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


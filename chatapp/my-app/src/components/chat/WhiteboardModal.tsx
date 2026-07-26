"use client";

import {
  Brush,
  Download,
  Eraser,
  Redo2,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/src/lib/utils";

interface WhiteboardModalProps {
  isOpen: boolean;
  isSending: boolean;
  onClose: () => void;
  onSend: (drawing: Blob) => Promise<void>;
}

type Tool = "pencil" | "eraser";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
// Bound canvas history so undo remains responsive on memory-constrained phones.
const MAX_HISTORY = 15;
const COLORS = ["#111111", "#7c3aed", "#2563eb", "#16a34a", "#dc2626", "#f59e0b"];

function WhiteboardModal({
  isOpen,
  isSending,
  onClose,
  onSend,
}: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(5);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const syncHistoryState = useCallback(() => {
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    const currentIndex = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    historyRef.current.push(snapshot);

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    syncHistoryState();
  }, [syncHistoryState]);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    historyRef.current = [];
    historyIndexRef.current = -1;
    saveSnapshot();
  }, [saveSnapshot]);

  useEffect(() => {
    if (!isOpen) return;
    resetCanvas();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSending, onClose, resetCanvas]);

  const getPoint = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }, []);

  const startDrawing = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context || isSending) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getPoint(event);
      isDrawingRef.current = true;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = brushSize;
      context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      context.globalCompositeOperation = "source-over";
    },
    [brushSize, color, getPoint, isSending, tool]
  );

  const draw = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const context = canvasRef.current?.getContext("2d");
      if (!context || !isDrawingRef.current) return;
      const point = getPoint(event);
      context.lineTo(point.x, point.y);
      context.stroke();
    },
    [getPoint]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current?.getContext("2d")?.closePath();
    saveSnapshot();
  }, [saveSnapshot]);

  const restoreSnapshot = useCallback(
    (nextIndex: number) => {
      const context = canvasRef.current?.getContext("2d");
      const snapshot = historyRef.current[nextIndex];
      if (!context || !snapshot) return;
      context.putImageData(snapshot, 0, 0);
      historyIndexRef.current = nextIndex;
      syncHistoryState();
    },
    [syncHistoryState]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      restoreSnapshot(historyIndexRef.current - 1);
    }
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      restoreSnapshot(historyIndexRef.current + 1);
    }
  }, [restoreSnapshot]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `convo-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const send = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSending) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.95)
    );
    if (!blob) throw new Error("Unable to export the drawing");
    await onSend(blob);
  }, [isSending, onSend]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5">
          <motion.button
            type="button"
            aria-label="Close whiteboard"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSending && onClose()}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="whiteboard-title"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-zinc-950/95 p-3 text-white shadow-2xl shadow-black/40 sm:p-5"
          >
            <header className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                  Create together
                </p>
                <h2 id="whiteboard-title" className="text-xl font-semibold">
                  Whiteboard
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="rounded-full border border-white/10 bg-white/10 p-2.5 transition hover:scale-105 hover:bg-white/20 disabled:opacity-50"
                aria-label="Close whiteboard"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="h-full w-full touch-none cursor-crosshair bg-white"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
              />

              <div className="absolute bottom-3 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border border-black/10 bg-white/90 p-2 text-black shadow-xl backdrop-blur-xl sm:gap-2">
                <ToolButton
                  active={tool === "pencil"}
                  label="Pencil"
                  onClick={() => setTool("pencil")}
                  icon={<Brush className="h-4 w-4" />}
                />
                <ToolButton
                  active={tool === "eraser"}
                  label="Eraser"
                  onClick={() => setTool("eraser")}
                  icon={<Eraser className="h-4 w-4" />}
                />
                <span className="mx-0.5 h-7 w-px shrink-0 bg-black/10" />
                <label className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-black/10 bg-white hover:bg-zinc-100" title="Color">
                  <span className="h-5 w-5 rounded-full border border-black/20" style={{ backgroundColor: color }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => {
                      setColor(event.target.value);
                      setTool("pencil");
                    }}
                    className="sr-only"
                  />
                </label>
                <div className="hidden items-center gap-1 sm:flex">
                  {COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-label={`Use ${preset}`}
                      onClick={() => {
                        setColor(preset);
                        setTool("pencil");
                      }}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition hover:scale-110",
                        color === preset ? "border-black" : "border-white"
                      )}
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                </div>
                <select
                  aria-label="Brush size"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  className="h-9 shrink-0 rounded-xl border border-black/10 bg-white px-2 text-xs font-medium outline-none"
                >
                  <option value={2}>2 px</option>
                  <option value={5}>5 px</option>
                  <option value={10}>10 px</option>
                  <option value={18}>18 px</option>
                  <option value={28}>28 px</option>
                </select>
                <span className="mx-0.5 h-7 w-px shrink-0 bg-black/10" />
                <ToolButton disabled={!historyState.canUndo} label="Undo" onClick={undo} icon={<Undo2 className="h-4 w-4" />} />
                <ToolButton disabled={!historyState.canRedo} label="Redo" onClick={redo} icon={<Redo2 className="h-4 w-4" />} />
                <ToolButton label="Clear" onClick={resetCanvas} icon={<Trash2 className="h-4 w-4" />} />
                <ToolButton label="Download" onClick={download} icon={<Download className="h-4 w-4" />} />
              </div>
            </div>

            <footer className="mt-3 flex items-center justify-between gap-3">
              <p className="hidden text-xs text-white/60 sm:block">
                Draw, download, or send it directly into this conversation.
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg transition hover:scale-[1.02] hover:bg-violet-100 disabled:pointer-events-none disabled:opacity-60"
                >
                  {isSending ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSending ? "Sending…" : "Send"}
                </button>
              </div>
            </footer>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ToolButtonProps {
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ToolButton({ active, disabled, icon, label, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30",
        active ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-100"
      )}
    >
      {icon}
    </button>
  );
}

export default memo(WhiteboardModal);

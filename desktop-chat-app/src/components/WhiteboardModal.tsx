import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eraser, Pencil, Redo2, RotateCcw, Send, Trash2, Undo2, X } from "lucide-react";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; size: number; tool: "pencil" | "eraser" };

type WhiteboardModalProps = {
  onClose: () => void;
  onSend: (blob: Blob) => Promise<void>;
};

export function WhiteboardModal({ onClose, onSend }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const activeStroke = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");
  const [color, setColor] = useState("#171A18");
  const [size, setSize] = useState(4);
  const [sending, setSending] = useState(false);

  const render = useCallback((items = strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of items) {
      if (stroke.points.length < 2) continue;
      context.beginPath();
      context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let index = 1; index < stroke.points.length; index++) {
        const previous = stroke.points[index - 1];
        const point = stroke.points[index];
        context.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
      }
      context.stroke();
    }
    context.globalCompositeOperation = "source-over";
  }, [strokes]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const old = canvas.toDataURL();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(wrap.clientWidth * ratio);
      canvas.height = Math.floor(wrap.clientHeight * ratio);
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      canvas.getContext("2d")?.scale(ratio, ratio);
      if (strokes.length) render();
      else {
        const image = new window.Image();
        image.onload = () => canvas.getContext("2d")?.drawImage(image, 0, 0, wrap.clientWidth, wrap.clientHeight);
        image.src = old;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [render, strokes.length]);

  useEffect(() => { render(); }, [render]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    activeStroke.current = { points: [pointFromEvent(event)], color, size: tool === "eraser" ? size * 3 : size, tool };
  };

  const moveDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !activeStroke.current) return;
    activeStroke.current.points.push(pointFromEvent(event));
    render([...strokes, activeStroke.current]);
  };

  const endDrawing = () => {
    if (!drawing.current || !activeStroke.current) return;
    drawing.current = false;
    if (activeStroke.current.points.length === 1) {
      activeStroke.current.points.push({ ...activeStroke.current.points[0], x: activeStroke.current.points[0].x + .1 });
    }
    setStrokes((current) => [...current, activeStroke.current!]);
    setRedoStack([]);
    activeStroke.current = null;
  };

  const undo = () => setStrokes((current) => {
    if (!current.length) return current;
    setRedoStack((redo) => [...redo, current[current.length - 1]]);
    return current.slice(0, -1);
  });
  const redo = () => setRedoStack((current) => {
    if (!current.length) return current;
    setStrokes((items) => [...items, current[current.length - 1]]);
    return current.slice(0, -1);
  });
  const clear = () => {
    if (!strokes.length) return;
    setRedoStack(strokes);
    setStrokes([]);
  };
  const getBlob = () => new Promise<Blob>((resolve, reject) => {
    canvasRef.current?.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create drawing")), "image/png");
  });
  const download = async () => {
    const blob = await getBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `convo-drawing-${Date.now()}.png`; link.click();
    URL.revokeObjectURL(url);
  };
  const send = async () => {
    if (!strokes.length || sending) return;
    setSending(true);
    try { await onSend(await getBlob()); onClose(); }
    finally { setSending(false); }
  };

  return <div className="whiteboard-backdrop" role="dialog" aria-modal="true" aria-label="Whiteboard">
    <section className="whiteboard-modal">
      <header className="whiteboard-header">
        <div><span className="whiteboard-icon"><Pencil size={17} /></span><div><h2>Whiteboard</h2><p>Sketch an idea and send it in the conversation</p></div></div>
        <button onClick={onClose} aria-label="Close whiteboard"><X size={19} /></button>
      </header>
      <div className="whiteboard-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={moveDrawing}
          onPointerUp={endDrawing}
          onPointerCancel={endDrawing}
          aria-label="Drawing canvas"
        />
        {!strokes.length && <div className="canvas-hint">Draw something here</div>}
        <div className="drawing-toolbar">
          <button className={tool === "pencil" ? "active" : ""} onClick={() => setTool("pencil")} title="Pencil"><Pencil size={17} /></button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")} title="Eraser"><Eraser size={17} /></button>
          <span className="tool-divider" />
          <label className="color-control" title="Color"><input type="color" value={color} onChange={(event) => { setColor(event.target.value); setTool("pencil"); }} /><i style={{ background: color }} /></label>
          <label className="size-control" title="Brush size"><span>{size}px</span><input type="range" min="1" max="20" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
          <span className="tool-divider" />
          <button disabled={!strokes.length} onClick={undo} title="Undo"><Undo2 size={17} /></button>
          <button disabled={!redoStack.length} onClick={redo} title="Redo"><Redo2 size={17} /></button>
          <button disabled={!strokes.length} onClick={clear} title="Clear"><Trash2 size={17} /></button>
        </div>
      </div>
      <footer className="whiteboard-footer">
        <button className="download-drawing" disabled={!strokes.length} onClick={download}><Download size={16} />Download PNG</button>
        <div><button className="cancel-drawing" onClick={onClose}>Cancel</button><button className="send-drawing" disabled={!strokes.length || sending} onClick={send}>{sending ? <RotateCcw className="sending-icon" size={16} /> : <Send size={16} />} {sending ? "Sending" : "Send drawing"}</button></div>
      </footer>
    </section>
  </div>;
}

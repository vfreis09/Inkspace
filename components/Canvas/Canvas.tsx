"use client";
import { Stage, Layer, Rect } from "react-konva";
import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";

export default function Canvas() {
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [gridImage, setGridImage] = useState<HTMLImageElement | undefined>(
    undefined,
  );
  const [size, setSize] = useState({ width: 0, height: 0 });

  const shapes = useStore((state: any) => state.shapes);
  const addShape = useStore((state: any) => state.addShape);
  const updateShape = useStore((state: any) => state.updateShape);

  useEffect(() => {
    const checkSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const step = 40;
    canvas.width = step;
    canvas.height = step;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.strokeStyle = "#d1d1ca";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(step, 0);
      ctx.lineTo(step, step);
      ctx.lineTo(0, step);
      ctx.stroke();
      ctx.fillStyle = "#a1a19a";
      ctx.fillRect(step - 1, step - 1, 2, 2);
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    img.onload = () => setGridImage(img);
  }, []);

  const dynamicGridScale = useMemo(() => {
    const log = Math.log2(1 / camera.scale);
    const pow = Math.pow(2, Math.floor(log));
    return pow;
  }, [camera.scale]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: (stage.getPointerPosition().x - stage.x()) / oldScale,
      y: (stage.getPointerPosition().y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale < 0.01) newScale = 0.01;
    if (newScale > 50) newScale = 50;

    setCamera({
      scale: newScale,
      x: stage.getPointerPosition().x - mousePointTo.x * newScale,
      y: stage.getPointerPosition().y - mousePointTo.y * newScale,
    });
  };

  const handleStageClick = (e: any) => {
    if (e.target !== e.target.getStage()) return;
    if (e.target.getStage().isDragging()) return;

    const stage = e.target.getStage();
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = transform.point(stage.getPointerPosition());

    addShape("rect", pos.x, pos.y);
  };

  return (
    <Stage
      width={size.width}
      height={size.height}
      draggable
      x={camera.x}
      y={camera.y}
      scaleX={camera.scale}
      scaleY={camera.scale}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onDragEnd={(e) => {
        if (e.target === e.target.getStage()) {
          setCamera({
            ...camera,
            x: e.target.x(),
            y: e.target.y(),
          });
        }
      }}
    >
      <Layer>
        {gridImage && (
          <Rect
            x={-camera.x / camera.scale}
            y={-camera.y / camera.scale}
            width={size.width / camera.scale}
            height={size.height / camera.scale}
            fillPatternImage={gridImage}
            fillPatternScale={{
              x: dynamicGridScale,
              y: dynamicGridScale,
            }}
            fillPatternOffset={{ x: 0, y: 0 }}
            fillPatternRepeat="repeat"
            opacity={0.9}
            listening={false}
          />
        )}

        {shapes.map((shape: any) => (
          <Rect
            key={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="#4f46e5"
            cornerRadius={4}
            draggable
            onDragEnd={(e) => {
              updateShape(shape.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = "grab";
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = "default";
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
}

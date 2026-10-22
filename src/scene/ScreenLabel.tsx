import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";

interface ScreenLabelProps {
  position: [number, number, number];
  text: string;
  className: string;
}

/**
 * A crisp HTML label pinned to a point in the 3D scene.
 *
 * Every frame we "project" the 3D point through the camera into normalized
 * device coordinates (−1…1 on each axis), convert that to pixels, and move a
 * plain <div> there. This is the same idea as drei's <Html>, minus the nested
 * React root — the label is just a DOM node we position ourselves.
 */
export function ScreenLabel({ position, text, className }: ScreenLabelProps) {
  const host = useThree((s) => s.gl.domElement.parentElement);
  const el = useMemo(() => {
    const div = document.createElement("div");
    div.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;will-change:transform;";
    return div;
  }, []);
  const point = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (!host) return;
    host.appendChild(el);
    return () => el.remove();
  }, [host, el]);

  useEffect(() => {
    el.textContent = text;
    el.className = className;
  }, [el, text, className]);

  useFrame(({ camera, size }) => {
    point.set(position[0], position[1], position[2]).project(camera);
    const x = (point.x * 0.5 + 0.5) * size.width;
    const y = (-point.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    el.style.visibility = point.z > 1 ? "hidden" : "visible"; // behind the camera
  });

  return null;
}

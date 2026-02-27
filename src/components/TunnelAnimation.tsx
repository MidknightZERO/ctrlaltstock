import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const TunnelAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;

    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;

    const cameraTarget = new THREE.Vector3(0, 0, 100);
    const camera = new THREE.PerspectiveCamera(
      70,
      stageWidth / stageHeight,
      1,
      20000
    );
    camera.lookAt(cameraTarget);

    const scene = new THREE.Scene();

    // Lights: soft white fill, dominant green, no red
    const lightWhite = new THREE.PointLight(0xffffff, 0.4, 2000);
    scene.add(lightWhite);

    const lightGreen = new THREE.PointLight(0x00ff88, 2.2, 2200);
    scene.add(lightGreen);

    const group = new THREE.Object3D();
    scene.add(group);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(stageWidth, stageHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    function getSeed() {
      return 0.01 + Math.random() * 0.05;
    }
    const zGap = 30;
    const xMods = [getSeed(), getSeed(), getSeed()];
    const yMods = [getSeed(), getSeed(), getSeed()];
    const xCurve = 0;

    const positions: Array<{ x: number; y: number; z: number }> = [];

    let gap = false;
    let shape = 3;
    let rotation = 0;
    // Start with green/teal palette
    let red = 0x02,
      green = 0xb0,
      blue = 0x60;

    function addLine(index: number, lines: number) {
      const i0 = index,
        i1 = index + 1;

      function getOscillation(seed: number[], offset: number) {
        // stack sine waves for cool motion
        return (
          (Math.sin(seed[0] * offset) +
            Math.cos(seed[1] * offset) +
            Math.sin(seed[2] * offset)) *
          200
        ); // * amplitude
      }
      const x0 = getOscillation(xMods, i0);
      const x1 = getOscillation(xMods, i1);
      const y0 = getOscillation(yMods, i0);
      const y1 = getOscillation(yMods, i1);
      const z0 = i0 * zGap;
      const z1 = i1 * zGap;

      // Rarely create a gap... then on doing so fluctuate the shape sides and colours,
      // but keep the palette strictly in green/teal wedge.
      if (gap === false && Math.random() > 0.99) {
        gap = 1 + ~~(Math.random() * 5);
        shape = 3 + ~~(Math.random() * 5);
        rotation = Math.random() * 0.1;

        // Green/teal-only palette:
        // R very low (0–16), G high (144–240), B moderate (32–160)
        const g = 0x90 + ~~(Math.random() * 0x60); // 144–240
        const b = 0x20 + ~~(Math.random() * 0x80); // 32–160
        const r = 0x00 + ~~(Math.random() * 0x10); // 0–16

        red = r;
        green = g;
        blue = b;
      } else if (gap > 0) {
        gap--;
        if (gap === 0) gap = false;
      }

      if (gap === false) {
        // Slight variation along the tunnel but keep hues in green/teal range
        // and clamp red very low.
        const t = index / lines;
        const gVar = Math.max(
          0x60,
          Math.min(0xff, Math.round(green * (0.85 + 0.3 * Math.sin(t * Math.PI * 2))))
        );
        const bVar = Math.max(
          0x10,
          Math.min(0xc0, Math.round(blue * (0.8 + 0.4 * Math.cos(t * Math.PI * 2))))
        );
        const rVar = Math.min(0x10, red);
        const colour = (rVar << 16) | (gVar << 8) | bVar;

        function createHole(x: number, y: number, z: number) {
          const g = new THREE.TorusGeometry(20, 2, 4, shape);
          const m = new THREE.MeshPhongMaterial({
            color: colour,
            specular: 0x88ff88, // greener specular to avoid white-hot highlights
            shininess: 16
          });
          const torus = new THREE.Mesh(g, m);
          torus.position.x = x;
          torus.position.y = y;
          torus.position.z = z;
          torus.rotation.z = index * rotation;
          return torus;
        }

        group.add(createHole(x0, y0, z0));

        if (Math.random() > 0.9) {
          // occasional spacejunk in same palette
          const angle = Math.random() * Math.PI * 2;
          const distance = 40 + Math.random() * 300;
          const weirdo = createHole(
            x0 + Math.sin(angle) * distance,
            y0 + Math.cos(angle) * distance,
            z0
          );
          group.add(weirdo);
          weirdo.rotation.x = Math.random() * Math.PI * 2;
          weirdo.rotation.z = Math.random() * Math.PI * 2;
        }
      }

      positions[index] = { x: x0, y: y0, z: z0 };
    }

    // the tunnel is not infinite at this point in time. that's for another day.
    const lines = 1000;
    for (let i = 0; i < lines; i++) {
      addLine(i, lines);
    }

    // tracker used as a camera dolly
    const g = new THREE.TorusGeometry(15, 5, 5, 20);
    const m = new THREE.MeshPhongMaterial({ color: 0x309000 });
    const tracker = new THREE.Mesh(g, m);
    tracker.rotation.x = 0;
    tracker.rotation.y = Math.PI;
    // group.add(tracker);

    let zPos = 0;
    let dx1 = 0;
    let dy1 = 0;

    const mouse = { x: 0, y: 0 };
    const mouseActual = { x: 0, y: 0 };
    let interaction = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (interaction) {
        mouse.x = (e.x - stageWidth / 2) / 4;
        mouse.y = (e.y - stageHeight / 2) / 4;
      }
    };

    const handleMouseDown = () => {
      interaction = !interaction;
      if (interaction === false) {
        mouse.x = mouse.y = 0;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    function render(t: number) {
      animationFrameRef.current = requestAnimationFrame(render);

      mouseActual.x -= (mouseActual.x - mouse.x) * 0.1;
      mouseActual.y -= (mouseActual.y - mouse.y) * 0.1;

      let dx = 0; // dx and dy are x and y movement, used to calculate tangent of a curve for camera
      let dy = 0;
      const dz = 4; // dz is just constant movement on z axis.

      zPos += dz;

      const zFloat = zPos / zGap;
      const i0 = Math.floor(zFloat); // this position
      const i1 = i0 + 1; // next position
      const perc = zFloat - i0; // interpolation between this position and next position.

      const tPos = positions[i0],
        nPos = positions[i1];
      if (tPos != undefined && nPos != undefined) {
        // otherwise we have reached the end... of the tunnel.
        dx = nPos.x - tPos.x;
        dy = nPos.y - tPos.y;
        tracker.position.x = tPos.x + dx * perc;
        tracker.position.y = tPos.y + dy * perc;
      }

      tracker.position.z = zPos; // + Math.sin(zPos * 0.001) * 40;

      dx1 -= (dx1 - dx) * 0.1; // double damping on the camera rotation.
      dy1 -= (dy1 - dy) * 0.1;

      const angleX = -Math.atan(dy1 / dz) / 2;
      const angleY = Math.PI + Math.atan(dx1 / dz) / 2;

      tracker.rotation.x -= (tracker.rotation.x - angleX) * 0.05;
      tracker.rotation.y -= (tracker.rotation.y - angleY) * 0.05;

      camera.position.x = tracker.position.x + mouseActual.x;
      camera.position.y = tracker.position.y + mouseActual.y;
      camera.position.z = tracker.position.z;

      camera.rotation.x = tracker.rotation.x;
      camera.rotation.y = tracker.rotation.y;

      // Lights follow the tracker; green leads a bit for depth
      lightWhite.position.x = tracker.position.x;
      lightWhite.position.y = tracker.position.y;
      lightWhite.position.z = tracker.position.z - 120;

      lightGreen.position.x = tracker.position.x;
      lightGreen.position.y = tracker.position.y - 150;
      lightGreen.position.z = tracker.position.z + 50;

      renderer.render(scene, camera);
    }

    render(0);

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 0 }} />;
};

export default TunnelAnimation;

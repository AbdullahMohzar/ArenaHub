import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scene ──
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    // ── White dot sphere via Fibonacci distribution ──
    // Fibonacci gives perfectly even spacing across the sphere surface
    const DOT_COUNT = 800;
    const SPHERE_RADIUS = 90;

    const positions = new Float32Array(DOT_COUNT * 3);
    const sizes = new Float32Array(DOT_COUNT);

    for (let i = 0; i < DOT_COUNT; i++) {
      // Fibonacci lattice on a sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DOT_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      positions[i * 3]     = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = SPHERE_RADIUS * Math.cos(phi);
      positions[i * 3 + 2] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

      // Vary dot sizes slightly for depth feel
      sizes[i] = 1.2 + Math.random() * 1.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material so dots are round and depth-faded
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        varying float vDepth;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Depth: 0 = far, 1 = near
          vDepth = clamp((mvPosition.z + 200.0) / 300.0, 0.0, 1.0);
          gl_PointSize = size * (1.0 + vDepth * 1.6) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vDepth;

        void main() {
          // Round dots
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r = length(uv);
          if (r > 0.5) discard;

          // Soft edge + depth-based opacity
          float alpha = smoothstep(0.5, 0.2, r) * (0.12 + vDepth * 0.75);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Second thinner sphere ring for layered depth ──
    const RING_COUNT = 300;
    const ringPositions = new Float32Array(RING_COUNT * 3);
    const ringSizes = new Float32Array(RING_COUNT);

    for (let i = 0; i < RING_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / RING_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = SPHERE_RADIUS * 0.6;

      ringPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      ringPositions[i * 3 + 1] = r * Math.cos(phi);
      ringPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      ringSizes[i] = 0.6 + Math.random() * 0.8;
    }

    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    ringGeo.setAttribute('size', new THREE.BufferAttribute(ringSizes, 1));

    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        varying float vDepth;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = clamp((mvPosition.z + 200.0) / 300.0, 0.0, 1.0);
          gl_PointSize = size * (1.0 + vDepth * 1.2) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vDepth;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          if (length(uv) > 0.5) discard;
          float alpha = smoothstep(0.5, 0.15, length(uv)) * (0.06 + vDepth * 0.35);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const ringPoints = new THREE.Points(ringGeo, ringMat);
    scene.add(ringPoints);

    // ── Mouse tracking ──
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handleMouseMove = (e) => {
      targetRotX = ((e.clientY / window.innerHeight) - 0.5) * 0.6;
      targetRotY = ((e.clientX / window.innerWidth) - 0.5) * 0.8;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ── Animation loop ──
    const clock = new THREE.Clock();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      currentRotX += (targetRotX - currentRotX) * 0.04;
      currentRotY += (targetRotY - currentRotY) * 0.04;

      // Auto-rotation + mouse tilt
      points.rotation.y = elapsed * 0.18 + currentRotY;
      points.rotation.x = currentRotX;

      // Inner sphere counter-rotates slightly for parallax depth
      ringPoints.rotation.y = -elapsed * 0.10 + currentRotY * 0.5;
      ringPoints.rotation.x = currentRotX * 0.6;

      material.uniforms.uTime.value = elapsed;
      ringMat.uniforms.uTime.value = elapsed;

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize ──
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
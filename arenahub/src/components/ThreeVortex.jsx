import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeVortex = ({ className = '' }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Particle vortex
    const count = 3500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 18;        // spiral turns
      const radius = 0.1 + t * 1.4;          // growing radius
      const height = (t - 0.5) * 3.5;        // vertical spread

      positions[i * 3]     = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.15;
      positions[i * 3 + 1] = height            + (Math.random() - 0.5) * 0.18;
      positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.15;

      // Color gradient: blue-white → electric blue
      const factor = t;
      colors[i * 3]     = 0.55 + factor * 0.45;   // R
      colors[i * 3 + 1] = 0.75 + factor * 0.25;   // G
      colors[i * 3 + 2] = 1.0;                     // B

      sizes[i] = Math.random() * 2.5 + 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('particleColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 particleColor;
        varying vec3 vColor;
        uniform float uTime;
        uniform vec2 uMouse;

        void main() {
          vColor = particleColor;
          vec3 pos = position;

          // Gentle breathe / rotate
          float angle = uTime * 0.18;
          float c = cos(angle);
          float s = sin(angle);
          float nx = pos.x * c - pos.z * s;
          float nz = pos.x * s + pos.z * c;
          pos.x = nx;
          pos.z = nz;

          // Mouse parallax tilt
          pos.x += uMouse.x * 0.22;
          pos.y += uMouse.y * 0.14;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * clamp(4.0 / -mvPosition.z, 0.5, 4.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.25, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Second inner ring (brighter, smaller)
    const innerCount = 800;
    const innerPos = new Float32Array(innerCount * 3);
    const innerColors = new Float32Array(innerCount * 3);
    const innerSizes = new Float32Array(innerCount);

    for (let i = 0; i < innerCount; i++) {
      const t = i / innerCount;
      const angle = t * Math.PI * 10;
      const radius = 0.05 + t * 0.55;
      const height = (t - 0.5) * 1.8;

      innerPos[i * 3]     = Math.cos(angle) * radius;
      innerPos[i * 3 + 1] = height;
      innerPos[i * 3 + 2] = Math.sin(angle) * radius;

      innerColors[i * 3]     = 0.8;
      innerColors[i * 3 + 1] = 0.92;
      innerColors[i * 3 + 2] = 1.0;

      innerSizes[i] = Math.random() * 4 + 1.5;
    }

    const innerGeom = new THREE.BufferGeometry();
    innerGeom.setAttribute('position', new THREE.BufferAttribute(innerPos, 3));
    innerGeom.setAttribute('particleColor', new THREE.BufferAttribute(innerColors, 3));
    innerGeom.setAttribute('size', new THREE.BufferAttribute(innerSizes, 1));

    const innerMat = material.clone();
    innerMat.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    };

    const innerParticles = new THREE.Points(innerGeom, innerMat);
    scene.add(innerParticles);

    // Mouse tracking
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Scroll-based zoom
    let scrollY = 0;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Animation
    const clock = new THREE.Clock();
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      material.uniforms.uTime.value  = elapsed;
      innerMat.uniforms.uTime.value  = elapsed;

      // Smooth mouse
      material.uniforms.uMouse.value.x  += (mouseX - material.uniforms.uMouse.value.x)  * 0.05;
      material.uniforms.uMouse.value.y  += (mouseY - material.uniforms.uMouse.value.y)  * 0.05;
      innerMat.uniforms.uMouse.value.x  = material.uniforms.uMouse.value.x;
      innerMat.uniforms.uMouse.value.y  = material.uniforms.uMouse.value.y;

      // Scroll parallax
      camera.position.y = scrollY * -0.0015;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '480px' }}
      aria-hidden="true"
    />
  );
};

export default ThreeVortex;

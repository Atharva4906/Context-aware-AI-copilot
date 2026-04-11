import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeSimulation({ spec }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 760;
    const height = 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1220');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0x8b5cf6, 1.0);
    directional.position.set(3, 4, 2);
    scene.add(directional);

    const points = spec?.three?.points || [];
    const sampled = points.filter((_, idx) => idx % 4 === 0);
    const vertices = sampled.flat();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
      color: 0x22c55e,
      size: 0.08,
    });

    const cloud = new THREE.Points(geometry, material);
    scene.add(cloud);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.02, 12, 80),
      new THREE.MeshBasicMaterial({ color: 0x334155 })
    );
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    let frame = 0;
    let rafId;
    const animate = () => {
      frame += 0.01;
      cloud.rotation.y = frame * 0.7;
      cloud.rotation.x = frame * 0.25;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [spec]);

  return <div ref={mountRef} className="w-full overflow-hidden rounded-xl border border-white/10" />;
}

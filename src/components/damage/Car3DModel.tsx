import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import * as THREE from 'three';

interface DamageMarker {
  id: string;
  position: [number, number, number];
  severity: 'minor' | 'moderate' | 'severe';
}

interface Car3DModelProps {
  onDamageClick: (position: [number, number, number]) => void;
  damageMarkers: DamageMarker[];
}

function CarMesh({ onDamageClick, damageMarkers }: Car3DModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current && !hovered) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    const point = event.point;
    onDamageClick([point.x, point.y, point.z]);
  };

  const getMarkerColor = (severity: string) => {
    switch (severity) {
      case 'severe': return '#ef4444';
      case 'moderate': return '#f59e0b';
      default: return '#fbbf24';
    }
  };

  return (
    <group>
      {/* Car Body */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[4, 1.5, 2]} />
        <meshStandardMaterial color={hovered ? '#60a5fa' : '#3b82f6'} />
      </mesh>
      
      {/* Car Hood */}
      <mesh position={[1.5, 0.2, 0]} onClick={handleClick}>
        <boxGeometry args={[1, 0.3, 1.8]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
      
      {/* Car Roof */}
      <mesh position={[0, 1.2, 0]} onClick={handleClick}>
        <boxGeometry args={[2.5, 0.4, 1.6]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
      
      {/* Wheels */}
      <mesh position={[1.3, -0.7, 1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[1.3, -0.7, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[-1.3, -0.7, 1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[-1.3, -0.7, -1.2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* Damage Markers */}
      {damageMarkers.map((marker) => (
        <mesh key={marker.id} position={marker.position}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={getMarkerColor(marker.severity)} />
        </mesh>
      ))}
    </group>
  );
}

export function Car3DModel({ onDamageClick, damageMarkers }: Car3DModelProps) {
  return (
    <div className="h-64 w-full bg-gradient-to-b from-blue-50 to-white rounded-lg overflow-hidden">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <CarMesh onDamageClick={onDamageClick} damageMarkers={damageMarkers} />
        <OrbitControls enablePan={false} maxDistance={15} minDistance={3} />
      </Canvas>
    </div>
  );
}
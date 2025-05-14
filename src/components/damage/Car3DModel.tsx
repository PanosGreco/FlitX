
import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

// Generic car model URL - in production we would have different models per car make/model
const DEFAULT_CAR_MODEL = 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/car-muscle/model.gltf';

interface DamageMarker {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

interface ModelProps {
  modelUrl?: string;
  damageMarkers?: DamageMarker[];
  onAddDamageMarker?: (position: THREE.Vector3, normal: THREE.Vector3) => void;
  isSelectingDamageLocation: boolean;
}

function Model({ 
  modelUrl = DEFAULT_CAR_MODEL, 
  damageMarkers = [], 
  onAddDamageMarker,
  isSelectingDamageLocation 
}: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const { camera } = useThree();
  const clonedScene = useRef<THREE.Group>();

  useEffect(() => {
    if (!clonedScene.current) {
      // Clone the scene to avoid issues with the original
      clonedScene.current = scene.clone();
      if (group.current) {
        group.current.add(clonedScene.current);

        // Ensure the model is centered
        const box = new THREE.Box3().setFromObject(clonedScene.current);
        const center = box.getCenter(new THREE.Vector3());
        clonedScene.current.position.x = -center.x;
        clonedScene.current.position.y = -center.y;
        clonedScene.current.position.z = -center.z;

        // Set initial scale
        const scale = 1.5;
        clonedScene.current.scale.set(scale, scale, scale);
      }
    }
  }, [scene]);

  // Rotate slowly when not interacting
  useFrame((state) => {
    if (group.current && !isSelectingDamageLocation) {
      group.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={group} 
      onClick={(event) => {
        if (isSelectingDamageLocation && onAddDamageMarker) {
          event.stopPropagation();
          onAddDamageMarker(event.point || event.pointer, new THREE.Vector3(0, 1, 0));
        }
      }}
    >
      {damageMarkers.map(marker => (
        <group key={marker.id} position={marker.position}>
          <mesh>
            <sphereGeometry args={[0.07, 32, 32]} />
            <meshStandardMaterial color="red" emissive="#ff0000" emissiveIntensity={0.5} />
          </mesh>
          <Html distanceFactor={10}>
            <div className="bg-red-600 text-white text-xs px-1 py-0.5 rounded-full">
              Damage
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

interface Car3DModelProps {
  vehicleMake?: string;
  vehicleModel?: string;
  damageMarkers?: DamageMarker[];
  onAddDamageMarker?: (position: THREE.Vector3, normal: THREE.Vector3) => void;
  isSelectingDamageLocation: boolean;
}

export function Car3DModel({ 
  vehicleMake, 
  vehicleModel, 
  damageMarkers = [],
  onAddDamageMarker,
  isSelectingDamageLocation 
}: Car3DModelProps) {
  // TODO: In a real implementation, we would map the make and model to specific 3D models
  // For now, we'll use a generic model
  
  return (
    <div className="w-full h-[400px] bg-gray-900 rounded-lg">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[3, 2, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1} 
          castShadow 
        />
        <Model 
          damageMarkers={damageMarkers} 
          onAddDamageMarker={onAddDamageMarker}
          isSelectingDamageLocation={isSelectingDamageLocation} 
        />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

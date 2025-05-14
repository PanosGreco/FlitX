
import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

// Generic car model URL - in production we would have different models per car make/model
const DEFAULT_CAR_MODEL = 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/car-muscle/model.gltf';

// Car model mapping for common makes and models
const CAR_MODELS: Record<string, string> = {
  // Luxury
  'BMW-3 Series': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/bmw/model.gltf',
  'BMW-5 Series': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/bmw/model.gltf',
  'Mercedes-E Class': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/mercedes-benz/model.gltf',
  'Mercedes-C Class': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/mercedes-benz/model.gltf',
  'Audi-A4': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/audi-r8/model.gltf',
  'Audi-A6': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/audi-r8/model.gltf',
  // Sedan
  'Toyota-Corolla': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/toyota-ae86/model.gltf',
  'Toyota-Camry': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/toyota-ae86/model.gltf',
  'Honda-Civic': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/honda-civic-gen-6/model.gltf',
  'Honda-Accord': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/honda-civic-gen-6/model.gltf',
  // SUV
  'Toyota-RAV4': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/toyota-land-cruiser/model.gltf',
  'Honda-CR-V': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/suv-jeep/model.gltf',
  'Jeep-Wrangler': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/jeep/model.gltf',
  // Truck
  'Ford-F-150': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/pickup/model.gltf',
  'Chevrolet-Silverado': 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/pickup/model.gltf',
  // Default fallback
  'default': DEFAULT_CAR_MODEL,
};

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
  const { camera, raycaster, mouse, gl } = useThree();
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
          // Use pointer instead of point
          const position = event.pointer || new THREE.Vector3();
          // Calculate normal from the clicked point to the center of the scene as a fallback
          const normal = new THREE.Vector3().copy(position).normalize();
          onAddDamageMarker(event.point, normal);
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
  // Determine which model to use based on make and model
  let modelUrl = DEFAULT_CAR_MODEL;
  
  if (vehicleMake && vehicleModel) {
    const key = `${vehicleMake}-${vehicleModel}`;
    modelUrl = CAR_MODELS[key] || CAR_MODELS['default'];
  }
  
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
          modelUrl={modelUrl}
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

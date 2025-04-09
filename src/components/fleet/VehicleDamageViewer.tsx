
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Trash, Edit, Check, X } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";

interface VehicleDamageViewerProps {
  vehicleType?: string;
  onAddPhoto: (area: string) => void;
}

interface DamageArea {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  photos: string[];
  notes?: string;
}

// Simple car model with selectable regions
const CarModel = ({ 
  damageAreas, 
  isEditMode, 
  onSelectArea, 
  selectedArea 
}: { 
  damageAreas: DamageArea[]; 
  isEditMode: boolean; 
  onSelectArea: (area: DamageArea) => void;
  selectedArea: string | null;
}) => {
  return (
    <group>
      {/* Basic car body */}
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[4, 1, 2]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 1.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.8, 1.8]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      
      {/* Wheels */}
      <mesh position={[-1.5, 0, -1]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-1.5, 0, 1]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1.5, 0, -1]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1.5, 0, 1]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Damage areas */}
      {damageAreas.map((area) => (
        <mesh 
          key={area.id}
          position={area.position}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditMode) {
              onSelectArea(area);
            }
          }}
          receiveShadow
          castShadow
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={area.id === selectedArea ? "#ff3333" : area.color} 
            transparent 
            opacity={0.8} 
          />
        </mesh>
      ))}
    </group>
  );
};

export function VehicleDamageViewer({ vehicleType = "sedan", onAddPhoto }: VehicleDamageViewerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [damageAreas, setDamageAreas] = useState<DamageArea[]>([
    {
      id: "front-bumper",
      name: "Front Bumper",
      position: [2, 0.5, 0],
      color: "#1EAEDB",
      photos: [],
    },
    {
      id: "rear-bumper",
      name: "Rear Bumper",
      position: [-2, 0.5, 0],
      color: "#1EAEDB",
      photos: [],
    },
    {
      id: "front-right-fender",
      name: "Front Right Fender",
      position: [1.5, 0.5, 1],
      color: "#1EAEDB",
      photos: [],
      notes: "Scratch - small (20-30cm)"
    },
    {
      id: "front-left-fender",
      name: "Front Left Fender",
      position: [1.5, 0.5, -1],
      color: "#1EAEDB",
      photos: [],
    },
  ]);

  const [damagePhotos, setDamagePhotos] = useState<Array<{id: string, url: string, area: string}>>([
    {
      id: "photo-1",
      url: "/lovable-uploads/050cd30e-5c41-42fd-a25e-009bf7cfb75c.png", 
      area: "front-right-fender"
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectArea = (area: DamageArea) => {
    setSelectedAreaId(area.id === selectedAreaId ? null : area.id);
  };

  const handleAddDamagePoint = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const handleAddPhoto = (areaId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && selectedAreaId) {
      // In a real app, you would upload this file to your server
      // For this demo, we'll just create a local URL
      const newPhotoId = `photo-${Date.now()}`;
      
      setDamagePhotos([
        ...damagePhotos, 
        {
          id: newPhotoId, 
          url: URL.createObjectURL(files[0]),
          area: selectedAreaId
        }
      ]);
      
      // Also add the photo reference to the damage area
      setDamageAreas(damageAreas.map(area => 
        area.id === selectedAreaId 
          ? {...area, photos: [...area.photos, newPhotoId]} 
          : area
      ));
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    // Remove photo from the list
    setDamagePhotos(damagePhotos.filter(photo => photo.id !== photoId));
    
    // Remove reference from damage areas
    setDamageAreas(damageAreas.map(area => ({
      ...area,
      photos: area.photos.filter(id => id !== photoId)
    })));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative bg-gray-100 rounded-lg overflow-hidden h-60">
        <Canvas shadows>
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[10, 10, 10]} 
            intensity={1} 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024}
          />
          <PerspectiveCamera makeDefault position={[0, 3, 7]} />
          <CarModel 
            damageAreas={damageAreas} 
            isEditMode={isEditMode} 
            onSelectArea={handleSelectArea}
            selectedArea={selectedAreaId}
          />
          <OrbitControls enablePan={false} />
        </Canvas>
        
        <div className="absolute top-2 right-2 flex gap-2">
          <Button 
            size="sm" 
            variant={isEditMode ? "default" : "outline"} 
            onClick={handleAddDamagePoint}
            className={isEditMode ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Done
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </>
            )}
          </Button>
        </div>
        
        {isEditMode && (
          <div className="absolute bottom-2 left-2 text-sm bg-black/50 text-white px-3 py-1 rounded-full">
            Tap on vehicle areas to mark damage
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Damage Photos</h3>
        <Button 
          onClick={() => selectedAreaId ? handleAddPhoto(selectedAreaId) : null} 
          variant="outline" 
          size="sm" 
          disabled={!selectedAreaId}
        >
          <Camera className="h-4 w-4 mr-1" /> Add Photo
        </Button>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
      
      {selectedAreaId && (
        <div className="mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-medium mb-1">{damageAreas.find(a => a.id === selectedAreaId)?.name}</h4>
            {damageAreas.find(a => a.id === selectedAreaId)?.notes && (
              <p className="text-sm text-gray-600 mb-2">
                {damageAreas.find(a => a.id === selectedAreaId)?.notes}
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 mt-2">
        {damagePhotos
          .filter(photo => !selectedAreaId || photo.area === selectedAreaId)
          .map((photo) => (
            <div key={photo.id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
              <img src={photo.url} alt="Damage" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => handleDeletePhoto(photo.id)}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                {damageAreas.find(a => a.id === photo.area)?.name}
              </div>
            </div>
          ))}
      </div>
      
      {(!selectedAreaId || damagePhotos.filter(p => p.area === selectedAreaId).length === 0) && (
        <div className="text-center py-8 text-gray-400 border border-dashed rounded-md">
          {selectedAreaId ? (
            <>
              <Camera className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No photos for this damage area yet.<br />Add your first photo.</p>
            </>
          ) : (
            <p className="text-sm">Select a damage area to view and add photos</p>
          )}
        </div>
      )}
    </div>
  );
}

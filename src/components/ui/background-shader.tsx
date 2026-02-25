import { MeshGradient } from "@paper-design/shaders-react";

export function BackgroundShader() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <MeshGradient
        colors={["#c3e8ff", "#e8d5f5", "#ffecd2", "#d4f0e7"]}
        distortion={0.4}
        swirl={0.3}
        speed={0.1}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default BackgroundShader;

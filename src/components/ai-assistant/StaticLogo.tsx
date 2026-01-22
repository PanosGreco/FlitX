export function StaticLogo() {
  return (
    <div className="w-16 h-16 flex items-center justify-center">
      {/* Static blue gradient circle - NO animation */}
      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-lg shadow-blue-500/30" />
    </div>
  );
}

/**
 * AuroraBackground — drifting cyan/magenta/violet orbs + faint starfield.
 * Pure CSS, pointer-events:none, fixed behind everything.
 */
const AuroraBackground = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* drifting orbs */}
      <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full bg-[hsl(186_100%_50%/0.10)] blur-[140px] animate-aurora-drift-a" />
      <div className="absolute top-1/3 -right-48 h-[38rem] w-[38rem] rounded-full bg-[hsl(320_100%_55%/0.10)] blur-[140px] animate-aurora-drift-b" />
      <div className="absolute -bottom-48 left-1/4 h-[44rem] w-[44rem] rounded-full bg-[hsl(278_100%_55%/0.10)] blur-[160px] animate-aurora-drift-c" />

      {/* fine star grain */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 22%, hsl(186 100% 80% / 0.9), transparent 60%)," +
            "radial-gradient(1px 1px at 78% 14%, hsl(320 100% 80% / 0.9), transparent 60%)," +
            "radial-gradient(1px 1px at 42% 64%, hsl(278 100% 85% / 0.9), transparent 60%)," +
            "radial-gradient(1px 1px at 88% 78%, hsl(186 100% 85% / 0.9), transparent 60%)," +
            "radial-gradient(1px 1px at 24% 88%, hsl(320 100% 85% / 0.9), transparent 60%)," +
            "radial-gradient(1px 1px at 64% 38%, hsl(186 100% 85% / 0.9), transparent 60%)," +
            "radial-gradient(0.5px 0.5px at 8% 58%, hsl(0 0% 100% / 0.7), transparent 60%)," +
            "radial-gradient(0.5px 0.5px at 92% 48%, hsl(0 0% 100% / 0.7), transparent 60%)",
        }}
      />
    </div>
  );
};

export default AuroraBackground;

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ background: "linear-gradient(160deg, #ffffff 0%, #eff6ff 20%, #dbeafe 45%, #e0f2fe 65%, #eff6ff 85%, #ffffff 100%)" }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 animate-grid-shimmer pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Large morphing gradient orbs */}
      <div
        className="absolute animate-morph-blob animate-drift pointer-events-none"
        style={{
          width: "700px",
          height: "700px",
          top: "-20%",
          right: "-15%",
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(37,99,235,0.15) 40%, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute animate-morph-blob animate-drift pointer-events-none"
        style={{
          width: "650px",
          height: "650px",
          bottom: "-20%",
          left: "-12%",
          background: "radial-gradient(circle, rgba(14,165,233,0.28) 0%, rgba(59,130,246,0.12) 40%, transparent 70%)",
          animationDelay: "4s",
          animationDirection: "reverse",
        }}
      />
      <div
        className="absolute animate-morph-blob pointer-events-none"
        style={{
          width: "500px",
          height: "500px",
          top: "40%",
          left: "2%",
          transform: "translateY(-50%)",
          background: "radial-gradient(circle, rgba(191,219,254,0.35) 0%, rgba(59,130,246,0.1) 50%, transparent 70%)",
          animationDelay: "2s",
        }}
      />
      <div
        className="absolute animate-morph-blob pointer-events-none"
        style={{
          width: "400px",
          height: "400px",
          top: "10%",
          right: "10%",
          background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(96,165,250,0.08) 50%, transparent 70%)",
          animationDelay: "6s",
        }}
      />



      {/* Decorative plus/cross markers */}
      {[
        { left: "6%",   top: "32%", size: 20, delay: "0s"   },
        { left: "94%",  top: "42%", size: 16, delay: "3s"   },
        { left: "12%",  top: "82%", size: 18, delay: "1.5s" },
        { left: "82%",  top: "10%", size: 22, delay: "4.5s" },
        { left: "42%",  top: "94%", size: 14, delay: "2s"   },
        { left: "70%",  top: "90%", size: 16, delay: "3.5s" },
        { left: "25%",  top: "5%",  size: 18, delay: "1s"   },
        { left: "50%",  top: "45%", size: 24, delay: "2.5s" },
        { left: "85%",  top: "65%", size: 18, delay: "5s"   },
        { left: "15%",  top: "20%", size: 16, delay: "0.5s" },
        { left: "60%",  top: "25%", size: 20, delay: "4s"   },
        { left: "35%",  top: "70%", size: 22, delay: "2s"   },
        { left: "5%",   top: "60%", size: 14, delay: "1.2s" },
        { left: "75%",  top: "40%", size: 20, delay: "3.8s" },
        { left: "90%",  top: "85%", size: 16, delay: "2.2s" },
      ].map((m, i) => (
        <div
          key={`cross-${i}`}
          className="absolute animate-float-slow pointer-events-none"
          style={{
            left: m.left,
            top: m.top,
            width: `${m.size}px`,
            height: `${m.size}px`,
            animationDelay: m.delay,
            animationDuration: `${5 + i * 1.2}s`,
          }}
        >
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{ width: "2px", height: `${m.size}px`, background: "rgba(59,130,246,0.35)", borderRadius: "1px" }}
          />
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2"
            style={{ width: `${m.size}px`, height: "2px", background: "rgba(59,130,246,0.35)", borderRadius: "1px" }}
          />
        </div>
      ))}

      {/* Small diamond shapes */}
      {[
        { left: "15%", top: "40%", delay: "0.5s" },
        { left: "85%", top: "68%", delay: "2.5s" },
        { left: "50%", top: "3%",  delay: "4s"   },
      ].map((d, i) => (
        <div
          key={`diamond-${i}`}
          className="absolute animate-float-slow pointer-events-none"
          style={{
            left: d.left,
            top: d.top,
            width: "10px",
            height: "10px",
            background: "rgba(59,130,246,0.25)",
            transform: "rotate(45deg)",
            borderRadius: "2px",
            animationDelay: d.delay,
            animationDuration: `${6 + i * 1.5}s`,
          }}
        />
      ))}

      {/* Strong radial glow */}
      <div
        className="absolute animate-pulse-glow pointer-events-none"
        style={{
          width: "900px",
          height: "600px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, rgba(191,219,254,0.1) 35%, rgba(14,165,233,0.04) 55%, transparent 70%)",
        }}
      />
    </div>
  )
}

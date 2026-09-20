export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ background: "linear-gradient(160deg, #ffffff 0%, #f0fdfa 20%, #ccfbf1 45%, #e0f2fe 65%, #f0fdfa 85%, #ffffff 100%)" }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 animate-grid-shimmer pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(20,184,166,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.5) 1px, transparent 1px)
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
          background: "radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(13,148,136,0.15) 40%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(14,165,233,0.28) 0%, rgba(20,184,166,0.12) 40%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(153,246,228,0.35) 0%, rgba(20,184,166,0.1) 50%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(20,184,166,0.22) 0%, rgba(45,212,191,0.08) 50%, transparent 70%)",
          animationDelay: "6s",
        }}
      />

      {/* Decorative rings (spinning) */}
      <svg
        className="absolute animate-ring-spin pointer-events-none"
        style={{ top: "-5%", right: "5%", width: "300px", height: "300px" }}
        viewBox="0 0 300 300"
      >
        <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(20,184,166,0.15)" strokeWidth="1.5" strokeDasharray="8 12" className="animate-dash-orbit" />
        <circle cx="150" cy="150" r="90" fill="none" stroke="rgba(20,184,166,0.1)" strokeWidth="1" strokeDasharray="4 16" />
      </svg>
      <svg
        className="absolute animate-ring-spin pointer-events-none"
        style={{ bottom: "0%", left: "3%", width: "250px", height: "250px", animationDirection: "reverse", animationDuration: "30s" }}
        viewBox="0 0 250 250"
      >
        <circle cx="125" cy="125" r="100" fill="none" stroke="rgba(14,165,233,0.12)" strokeWidth="1.5" strokeDasharray="6 14" className="animate-dash-orbit" />
        <circle cx="125" cy="125" r="70" fill="none" stroke="rgba(20,184,166,0.08)" strokeWidth="1" strokeDasharray="3 12" />
      </svg>

      {/* Prominent bordered circles */}
      <div
        className="absolute rounded-full animate-drift pointer-events-none"
        style={{
          width: "180px",
          height: "180px",
          top: "8%",
          left: "8%",
          border: "2px solid rgba(20,184,166,0.18)",
          background: "rgba(20,184,166,0.04)",
          animationDuration: "18s",
        }}
      />
      <div
        className="absolute rounded-full animate-drift pointer-events-none"
        style={{
          width: "120px",
          height: "120px",
          bottom: "12%",
          right: "8%",
          border: "2px solid rgba(153,246,228,0.25)",
          background: "rgba(153,246,228,0.06)",
          animationDuration: "22s",
          animationDirection: "reverse",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "60px",
          height: "60px",
          top: "55%",
          right: "20%",
          border: "1.5px solid rgba(20,184,166,0.15)",
          background: "rgba(20,184,166,0.03)",
        }}
      />

      {/* Floating teal particles */}
      {[
        { size: 18, left: "8%",  top: "18%", delay: "0s",   duration: "7s"  },
        { size: 22, left: "88%", top: "22%", delay: "1s",   duration: "9s"  },
        { size: 14, left: "18%", top: "72%", delay: "2.5s", duration: "8s"  },
        { size: 26, left: "78%", top: "78%", delay: "0.5s", duration: "11s" },
        { size: 12, left: "48%", top: "8%",  delay: "3s",   duration: "6s"  },
        { size: 20, left: "92%", top: "55%", delay: "1.5s", duration: "10s" },
        { size: 16, left: "32%", top: "88%", delay: "4s",   duration: "7.5s"},
        { size: 14, left: "62%", top: "5%",  delay: "2s",   duration: "8.5s"},
        { size: 10, left: "5%",  top: "50%", delay: "3.5s", duration: "9.5s"},
        { size: 24, left: "55%", top: "92%", delay: "0.8s", duration: "10.5s"},
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float pointer-events-none"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: p.left,
            top: p.top,
            background: `radial-gradient(circle, rgba(20,184,166,${0.6 - i * 0.03}) 0%, rgba(20,184,166,0.1) 50%, transparent 70%)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(20,184,166,${0.15 - i * 0.01})`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* Decorative plus/cross markers */}
      {[
        { left: "6%",  top: "32%", size: 20, delay: "0s"   },
        { left: "94%", top: "42%", size: 16, delay: "3s"   },
        { left: "12%", top: "82%", size: 18, delay: "1.5s" },
        { left: "82%", top: "10%", size: 22, delay: "4.5s" },
        { left: "42%", top: "94%", size: 14, delay: "2s"   },
        { left: "70%", top: "90%", size: 16, delay: "3.5s" },
        { left: "25%", top: "5%",  size: 18, delay: "1s"   },
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
            style={{ width: "2px", height: `${m.size}px`, background: "rgba(20,184,166,0.35)", borderRadius: "1px" }}
          />
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2"
            style={{ width: `${m.size}px`, height: "2px", background: "rgba(20,184,166,0.35)", borderRadius: "1px" }}
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
            background: "rgba(20,184,166,0.25)",
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
          background: "radial-gradient(ellipse, rgba(20,184,166,0.18) 0%, rgba(153,246,228,0.1) 35%, rgba(14,165,233,0.04) 55%, transparent 70%)",
        }}
      />
    </div>
  )
}

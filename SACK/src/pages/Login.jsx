import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import supabase from "./supabaseClient"; // 👈 import your supabase client
import { apiFetch } from "./api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // 👈 new: for showing login errors
  const mountRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Particles — pure white
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];
    const phases = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      speeds.push(Math.random() * 0.003 + 0.0008);
      phases.push(Math.random() * Math.PI * 2);
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Rings — white/silver
    const rings = [];
    const ringData = [
      { radius: 12, tube: 0.035, color: 0xffffff, opacity: 0.1,  rotSpeed:  0.003  },
      { radius: 19, tube: 0.025, color: 0xcccccc, opacity: 0.07, rotSpeed: -0.002  },
      { radius: 26, tube: 0.015, color: 0xaaaaaa, opacity: 0.05, rotSpeed:  0.0012 },
    ];
    ringData.forEach(({ radius, tube, color, opacity, rotSpeed }) => {
      const geo = new THREE.TorusGeometry(radius, tube, 16, 120);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ring.userData.rotSpeed = rotSpeed;
      scene.add(ring);
      rings.push(ring);
    });

    // Floating wireframe icosahedra — white
    const floaters = [];
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.IcosahedronGeometry(Math.random() * 0.9 + 0.3, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.08,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 15
      );
      mesh.userData = {
        vy: (Math.random() - 0.5) * 0.018,
        vx: (Math.random() - 0.5) * 0.009,
        rotX: Math.random() * 0.007,
        rotY: Math.random() * 0.007,
      };
      scene.add(mesh);
      floaters.push(mesh);
    }

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      const pos = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += speeds[i];
        pos[i * 3]     += Math.sin(t * 0.25 + phases[i]) * 0.008;
        if (pos[i * 3 + 1] > 40) pos[i * 3 + 1] = -40;
      }
      particleGeo.attributes.position.needsUpdate = true;

      rings.forEach((r) => {
        r.rotation.z += r.userData.rotSpeed;
        r.rotation.x += r.userData.rotSpeed * 0.4;
      });

      floaters.forEach((f) => {
        f.position.y  += f.userData.vy;
        f.position.x  += f.userData.vx;
        f.rotation.x  += f.userData.rotX;
        f.rotation.y  += f.userData.rotY;
        if (Math.abs(f.position.y) > 26) f.userData.vy *= -1;
        if (Math.abs(f.position.x) > 32) f.userData.vx *= -1;
      });

      camera.position.x += (mouseX * 4 - camera.position.x) * 0.04;
      camera.position.y += (mouseY * 3 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // 👇 Replaced fake setTimeout with real Supabase login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // clear any previous error

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      // Show error on the card instead of just console
      setError(error.message);
      return;
    }

    console.log("Logged in! Access Token:", data.session.access_token);

    // Keep your existing routing logic
    try {
      const res = await apiFetch("/me");

      if (res.role === "teamlead") {
        navigate("/teamlead");
      } else if (res.role === "member") {
        navigate("/teammember");
      } else {
        setError("Unauthorized user role.");
      }
    } catch (err) {
      setError("Failed to fetch user role.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080808]">
      {/* Three.js canvas */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Subtle white radial glow in center */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)"
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)"
      }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4"
        style={{ animation: "cardIn 0.85s cubic-bezier(0.22,1,0.36,1) both" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600&family=Nunito+Sans:wght@300;400;500&display=swap');

          @keyframes cardIn {
            from { opacity: 0; transform: translateY(32px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.0); }
            50%       { box-shadow: 0 0 18px 3px rgba(255,255,255,0.12); }
          }
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          .card-glass {
            background: rgba(12, 12, 12, 0.82);
            backdrop-filter: blur(32px);
            -webkit-backdrop-filter: blur(32px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            box-shadow:
              0 0 0 1px rgba(255,255,255,0.03),
              0 40px 90px rgba(0,0,0,0.7),
              inset 0 1px 0 rgba(255,255,255,0.06);
          }

          .field {
            font-family: 'Nunito Sans', sans-serif;
            font-weight: 400;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 13px 16px;
            color: #ffffff;
            width: 100%;
            outline: none;
            transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            font-size: 14px;
          }
          .field:focus {
            border-color: rgba(255,255,255,0.35);
            background: rgba(255,255,255,0.07);
            box-shadow: 0 0 0 3px rgba(255,255,255,0.05);
          }
          .field::placeholder { color: rgba(255,255,255,0.2); font-size: 13px; }

          .submit-btn {
            width: 100%;
            padding: 14px;
            border-radius: 14px;
            font-family: 'Nunito', sans-serif;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.04em;
            color: #0a0a0a;
            border: none;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            background: #ffffff;
            transition: transform 0.18s, opacity 0.18s, box-shadow 0.18s;
            box-shadow: 0 4px 24px rgba(255,255,255,0.15);
          }
          .submit-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 32px rgba(255,255,255,0.2);
          }
          .submit-btn:active { transform: scale(0.98); }
          .submit-btn:disabled { opacity: 0.6; cursor: default; transform: none; }
          .submit-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            background-size: 200% 100%;
            animation: shimmer 2.6s infinite;
          }

          .lbl {
            font-family: 'Nunito Sans', sans-serif;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.3);
            margin-bottom: 7px;
            display: block;
          }

          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            margin: 26px 0;
          }

          .spinner {
            width: 15px; height: 15px;
            border: 2px solid rgba(0,0,0,0.2);
            border-top-color: #0a0a0a;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
          }

          .forgot-btn {
            font-family: 'Nunito Sans', sans-serif;
            font-size: 12px;
            font-weight: 400;
            color: rgba(255,255,255,0.3);
            background: none;
            border: none;
            cursor: pointer;
            transition: color 0.2s;
          }
          .forgot-btn:hover { color: rgba(255,255,255,0.75); }

          .logo-dot {
            width: 7px; height: 7px;
            background: #fff;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            animation: pulse-ring 3s ease-in-out infinite;
          }

          .heading {
            font-family: 'Nunito', sans-serif;
            font-weight: 300;
            letter-spacing: -0.01em;
          }

          .error-msg {
            font-family: 'Nunito Sans', sans-serif;
            font-size: 13px;
            color: rgba(255, 100, 100, 0.9);
            background: rgba(255, 60, 60, 0.08);
            border: 1px solid rgba(255, 60, 60, 0.2);
            border-radius: 10px;
            padding: 10px 14px;
            text-align: center;
          }
        `}</style>

        <div className="card-glass p-8">

          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
            <span className="logo-dot" />
            <span style={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase"
            }}>
              SACK
            </span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 className="heading" style={{ fontSize: 38, color: "#ffffff", lineHeight: 1.1, margin: 0 }}>
              Welcome back
            </h1>
            <p style={{
              fontFamily: "'Nunito Sans', sans-serif",
              color: "rgba(255,255,255,0.28)",
              fontSize: 15,
              marginTop: 10,
              fontWeight: 400
            }}>
              Sign in to your dashboard
            </p>
          </div>

          <div className="divider" />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Email */}
            <div>
              <label className="lbl" style={{ fontSize: 14 }}>Email Address</label>
              <input
                type="email"
                required
                className="field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label className="lbl" style={{ fontSize: 14 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.25)", transition: "color 0.2s",
                    display: "flex", alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" style={{ accentColor: "#ffffff", width: 13, height: 13 }} />
                <span style={{
                  fontFamily: "'Nunito Sans', sans-serif",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.25)",
                  fontWeight: 400
                }}>
                  Remember me
                </span>
              </label>
              <button type="button" className="forgot-btn" style={{ fontSize: 14 }}>Forgot password?</button>
            </div>

            {/* 👇 Error message — only shows if login fails */}
            {error && (
              <div className="error-msg">{error}</div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="submit-btn" style={{ marginTop: 4, fontSize: 17 }}>
              {loading && <span className="spinner" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <div className="divider" />

          <p style={{
            fontFamily: "'Nunito Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.12)",
            textAlign: "center",
            letterSpacing: "0.08em",
            fontWeight: 400
          }}>
            SECURE · ENCRYPTED · PRIVATE
          </p>

        </div>
      </div>
    </div>
  );
}
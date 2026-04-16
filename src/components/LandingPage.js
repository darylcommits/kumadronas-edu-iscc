import React from 'react';
import { LogIn, UserPlus } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Full-screen background image */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* Title */}
        <h1 className="landing-title text-4xl md:text-6xl font-extrabold text-white mb-3 tracking-tight">
          Kumadronas Clinical On-call <br />Duty System
        </h1>
        <p className="landing-subtitle text-white/90 text-xl md:text-2xl font-semibold mb-10">
          of Ilocos Sur Community College
        </p>

        {/* Buttons */}
        <div className="landing-buttons flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-sm">
          <button
            onClick={() => onGetStarted('login')}
            className="flex-1 flex items-center justify-center space-x-2 bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-2 border-white"
          >
            <LogIn className="w-5 h-5" />
            <span>Login</span>
          </button>

          <button
            onClick={() => onGetStarted('signup')}
            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>Sign Up</span>
          </button>
        </div>

      </div>

      {/* Footer */}
      <p className="landing-footer absolute bottom-4 left-0 right-0 text-center text-white/40 text-xs z-10">
        © 2025 Ilocos Sur Community College. All rights reserved.
      </p>

      <style>{`
        /* Fade + slide up */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Fade in only */
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Shimmer sweep across text */
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* Subtle glow pulse */
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.3), 0 4px 20px rgba(0,0,0,0.8); }
          50%       { text-shadow: 0 0 40px rgba(255,255,255,0.6), 0 4px 20px rgba(0,0,0,0.8); }
        }

        .landing-title {
          animation: fadeSlideUp 0.9s cubic-bezier(0.22,1,0.36,1) both;
          animation-delay: 0.1s;
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #ffffff 40%,
            #d4f5e2 50%,
            #ffffff 60%,
            #ffffff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: fadeSlideUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both,
                     shimmer 4s linear 1.2s infinite;
          drop-shadow: 0 4px 24px rgba(0,0,0,0.9);
        }

        .landing-subtitle {
          animation: fadeSlideUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s both;
          letter-spacing: 0.04em;
        }

        .landing-tagline {
          animation: fadeSlideUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s both;
          letter-spacing: 0.06em;
        }

        .landing-buttons {
          animation: fadeSlideUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.75s both;
        }

        .landing-footer {
          animation: fadeIn 1s ease 1.2s both;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;

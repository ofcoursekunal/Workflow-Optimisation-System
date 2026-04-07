import React from 'react';

const FactoryAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#475569', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#1e293b', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Conveyor Belt */}
        <rect x="0" y="450" width="800" height="40" fill="#334155" />
        <g className="conveyor-circles">
          {[...Array(20)].map((_, i) => (
            <circle key={i} cx={40 * i} cy="470" r="15" fill="#1e293b" />
          ))}
        </g>

        {/* Moving Boxes on Conveyor */}
        <g className="moving-boxes">
          {[...Array(5)].map((_, i) => (
            <rect key={i} width="40" height="30" fill="#3b82f6" x="-100" y="420" rx="4">
              <animate attributeName="x" from="-50" to="850" dur={`${5 + i}s`} repeatCount="indefinite" begin={`${i * 2}s`} />
            </rect>
          ))}
        </g>

        {/* Worker Silhouettes */}
        <g className="workers">
          <path d="M150 450 L150 400 L170 400 L170 450 M160 395 Q160 380 150 380 L170 380 Q160 380 160 395" fill="#94a3b8">
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M450 450 L450 400 L470 400 L470 450 M460 395 Q460 380 450 380 L470 380 Q460 380 460 395" fill="#94a3b8">
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path d="M650 450 L650 400 L670 400 L670 450 M660 395 Q660 380 650 380 L670 380 Q660 380 660 395" fill="#94a3b8">
            <animateTransform attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="1.8s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Gears */}
        <g className="gears" style={{ transformOrigin: 'center' }}>
          <circle cx="100" cy="100" r="40" fill="url(#gearGradient)" className="animate-spin-slow" style={{ transformOrigin: '100px 100px' }} />
          <circle cx="160" cy="140" r="30" fill="url(#gearGradient)" className="animate-reverse-spin" style={{ transformOrigin: '160px 140px' }} />
        </g>

        {/* Industrial Pipes */}
        <path d="M0 50 L200 50 L200 0" stroke="#475569" strokeWidth="15" fill="none" />
        <path d="M800 100 L600 100 L600 0" stroke="#475569" strokeWidth="20" fill="none" />
      </svg>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animate-reverse-spin {
          animation: reverse-spin 8s linear infinite;
        }
        .conveyor-circles {
          animation: slide 2s linear infinite;
        }
        @keyframes slide {
          from { transform: translateX(0); }
          to { transform: translateX(40px); }
        }
      `}} />
    </div>
  );
};

export default FactoryAnimation;

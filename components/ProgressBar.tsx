import React from 'react';

interface ProgressBarProps {
  progress: number; // value between 0 and 1
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 z-20">
      <div 
        className="h-full bg-neon-accent transition-all duration-300 ease-linear" 
        style={{ 
          width: `${progress * 100}%`,
          boxShadow: '0 0 8px #00FF88, 0 0 12px #00FF88'
        }}
      ></div>
    </div>
  );
};

export default ProgressBar;

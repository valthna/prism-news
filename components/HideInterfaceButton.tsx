import React from 'react';

interface HideInterfaceButtonProps {
    isHidden: boolean;
    onPress: () => void;
    onRelease: () => void;
}

const HideInterfaceButton: React.FC<HideInterfaceButtonProps> = ({ isHidden, onPress, onRelease }) => {
    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        onPress();
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        onRelease();
    };

    return (
        <button
            onMouseDown={onPress}
            onMouseUp={onRelease}
            onMouseLeave={onRelease}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={`
        relative z-[60] 
        w-9 h-9
        rounded-full
        flex items-center justify-center
        bg-black/60
        backdrop-blur-md 
        border ${isHidden ? 'border-white/40' : 'border-white/20'}
        shadow-lg
        active:scale-90
        transition-all duration-150
        ${isHidden ? 'bg-black/80' : ''}
      `}
            aria-label={isHidden ? "Relâcher pour afficher l'interface" : "Maintenir pour masquer l'interface"}
            style={{
                touchAction: 'manipulation',
                WebkitUserSelect: 'none',
                userSelect: 'none',
            }}
        >
            {/* Eye Icon - Simple and minimal */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-white/70 transition-all duration-150"
            >
                {isHidden ? (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                ) : (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                )}
            </svg>
        </button>
    );
};

export default HideInterfaceButton;

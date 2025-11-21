import React from 'react';
import './HideInterfaceButton.css';

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
            data-state={isHidden ? 'hidden' : 'visible'}
            onMouseDown={onPress}
            onMouseUp={onRelease}
            onMouseLeave={onRelease}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={`
            hide-interface-button group
            relative z-[60]
            w-10 h-10
            rounded-full
            flex items-center justify-center
            bg-white/10
            backdrop-blur-md
            border border-white/10
            text-gray-300
            shadow-lg
            active:scale-95
            transition-all duration-200 ease-out
            lg:hidden
            ${isHidden ? 'ring-1 ring-white/40 bg-white/20 text-white' : 'hover:bg-white/20 hover:text-white'}
      `}
            aria-label={isHidden ? "Relâcher pour afficher l'interface" : "Maintenir pour masquer l'interface"}
            style={{
                touchAction: 'manipulation',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                minWidth: '2.5rem',
                minHeight: '2.5rem'
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`eye-icon ${isHidden ? 'eye-icon--hidden' : 'eye-icon--visible'} text-gray-300 group-hover:text-white transition-colors duration-150`}
                aria-hidden="true"
            >
                {isHidden ? (
                    <path
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ) : (
                    <>
                        <path
                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        />
                    </>
                )}
            </svg>
        </button>
    );
};

export default HideInterfaceButton;

import React from 'react';

interface PrismLogoProps {
    variant?: 'full' | 'square' | 'favicon';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showText?: boolean;
}

const PrismLogo: React.FC<PrismLogoProps> = ({
    variant = 'full',
    size = 'md',
    className = '',
    showText = true
}) => {
    const sizeClasses = {
        sm: 'h-8',
        md: 'h-12',
        lg: 'h-16',
        xl: 'h-24'
    };

    const logoSrc = {
        full: '/logo-square.svg',
        square: '/logo-square.svg',
        favicon: '/favicon.svg'
    };

    if (variant === 'full' && showText) {
        return (
            <div className={`inline-flex items-center gap-3 ${className}`}>
                <span
                    className={`${sizeClasses[size]} flex items-center font-black italic tracking-tight chromatic-aberration`}
                    data-text="PRISM"
                >
                    PRISM
                </span>
            </div>
        );
    }

    return (
        <img
            src={logoSrc[variant]}
            alt="PRISM Logo"
            className={`${sizeClasses[size]} w-auto object-contain ${className}`}
        />
    );
};

export default PrismLogo;

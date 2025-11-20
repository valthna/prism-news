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
        full: '/logo.png',
        square: '/logo-square.png',
        favicon: '/favicon.png'
    };

    // Pour le variant 'full' avec l'effet chromatic aberration en CSS si pas d'image
    if (variant === 'full' && showText) {
        return (
            <div className={`inline-flex items-center gap-3 ${className}`}>
                <img
                    src={logoSrc[variant]}
                    alt="PRISM Logo"
                    className={`${sizeClasses[size]} w-auto object-contain`}
                />
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

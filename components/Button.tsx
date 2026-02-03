import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  
  const baseStyles = "px-8 py-3 rounded-sm font-semibold transition-all duration-500 tracking-[0.2em] uppercase text-[10px] disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-white text-black hover:bg-stone-200 border border-white shadow-xl shadow-white/5",
    secondary: "bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800",
    outline: "bg-transparent text-stone-300 border border-stone-800 hover:border-stone-500 hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} flex items-center justify-center gap-3`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
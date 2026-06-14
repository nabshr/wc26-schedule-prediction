import type { ReactNode } from 'react';

interface RoundedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export default function RoundedCard({ children, className = '', hover = true, glass = false, onClick }: RoundedCardProps) {
  const base = glass ? 'card-glass' : 'card';
  return (
    <div onClick={onClick} className={`${base} p-5 ${hover ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

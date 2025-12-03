import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2 className={`animate-spin text-primary-400 ${sizes[size]} ${className}`} />
  );
};

export const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-dark-950 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="relative">
          <div className="w-16 h-16 border-4 border-dark-700 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-dark-300 animate-pulse">{message}</p>
      </motion.div>
    </div>
  );
};

export const Skeleton = ({ className = '', variant = 'text' }) => {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    avatar: 'w-10 h-10 rounded-full',
    card: 'h-32 rounded-xl',
    button: 'h-10 w-24 rounded-xl',
  };

  return (
    <div className={`skeleton ${variants[variant]} ${className}`} />
  );
};

export const CardSkeleton = () => (
  <div className="bg-dark-900/80 rounded-2xl border border-dark-700/50 p-6">
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="avatar" />
      <div className="flex-1">
        <Skeleton variant="title" className="w-1/3 mb-2" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <Skeleton variant="text" className="mb-2" />
    <Skeleton variant="text" className="w-4/5 mb-2" />
    <Skeleton variant="text" className="w-2/3" />
  </div>
);

export default Spinner;

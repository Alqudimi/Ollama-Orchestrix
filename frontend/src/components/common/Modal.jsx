import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`
              relative w-full ${sizes[size]} bg-dark-900 rounded-2xl border border-dark-700
              shadow-2xl max-h-[90vh] overflow-hidden
            `}
          >
            {(title || showClose) && (
              <div className="flex items-center justify-between p-6 border-b border-dark-700">
                {title && (
                  <h2 className="text-xl font-semibold text-dark-100">{title}</h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-dark-800 transition-colors text-dark-400 hover:text-dark-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-5rem)] scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

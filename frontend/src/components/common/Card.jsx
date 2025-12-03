import { motion } from 'framer-motion';

const Card = ({
  children,
  className = '',
  hover = true,
  gradient = false,
  padding = true,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-dark-900/80 backdrop-blur-xl rounded-2xl border border-dark-700/50
        ${hover ? 'transition-all duration-300 hover:shadow-glow hover:border-primary-500/30' : ''}
        ${gradient ? 'gradient-border' : ''}
        ${padding ? 'p-6' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, icon: Icon, className = '' }) => (
  <h3 className={`text-lg font-semibold text-dark-100 flex items-center gap-3 ${className}`}>
    {Icon && <Icon className="w-5 h-5 text-primary-400" />}
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export default Card;

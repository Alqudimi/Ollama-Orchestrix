import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-dark-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="w-5 h-5 text-dark-400" />
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 bg-dark-800/50 border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
            transition-all duration-300 text-dark-100 placeholder-dark-400
            ${Icon ? 'pl-12' : ''}
            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-dark-600'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  error,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-dark-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full px-4 py-3 bg-dark-800/50 border rounded-xl
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
          transition-all duration-300 text-dark-100 placeholder-dark-400 resize-none
          ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-dark-600'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;

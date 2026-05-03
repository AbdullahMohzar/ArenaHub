import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: {
    x: -88,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 460,
      damping: 28,
      mass: 0.8
    }
  }
};

export const BroadcastItem = ({ children, className = '' }) => (
  <motion.div variants={itemVariants} className={className}>
    {children}
  </motion.div>
);

const BroadcastLayout = ({ children, className = '' }) => {
  const wrappedChildren = React.Children.map(children, (child, index) => {
    if (!child) return child;
    return (
      <motion.div key={child.key || index} variants={itemVariants}>
        {child}
      </motion.div>
    );
  });

  return (
    <motion.section
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {wrappedChildren}
    </motion.section>
  );
};

export default BroadcastLayout;

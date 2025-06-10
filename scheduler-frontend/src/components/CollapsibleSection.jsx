import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex justify-between items-center mb-2"
      >
        <h3 className="text-lg font-semibold text-black dark:text-white">
          <span className="inline-flex items-center">
            <span className="mr-2 text-gray-500 dark:text-gray-400">
              {open ? '▾' : '▸'}
            </span>
            {title}
          </span>
        </h3>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// components/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="px-4 py-2 rounded bg-primary text-primary-foreground dark:bg-secondary dark:text-secondary-foreground"
    >
      Toggle Theme
    </button>
  );
}

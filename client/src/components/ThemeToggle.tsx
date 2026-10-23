import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({
  className = '',
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? <Sun size={17} strokeWidth={2.3} className="sun-icon" /> : <Moon size={17} strokeWidth={2.3} className="moon-icon" />}
      </span>
      {showLabel && (
        <span className="theme-toggle-text">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}

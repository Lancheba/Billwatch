import { HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2'
import { useTheme } from './ThemeContext'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className={`theme-toggle-thumb ${isLight ? 'is-light' : ''}`}>
        {isLight ? <HiOutlineSun /> : <HiOutlineMoon />}
      </span>
    </button>
  )
}

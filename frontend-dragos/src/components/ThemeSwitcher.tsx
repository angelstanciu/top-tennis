import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../ThemeContext'

export default function ThemeSwitcher({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const { theme, toggleTheme } = useTheme()
  const circle = size === 'sm' ? 'w-[22px] h-[22px]' : size === 'lg' ? 'w-7 h-7' : size === 'xl' ? 'w-[30px] h-[30px]' : 'w-[26px] h-[26px]'
  const icon = size === 'sm' ? 12 : size === 'lg' ? 15 : size === 'xl' ? 16 : 14

  const activeBg = theme === 'dark' ? '#a3e635' : '#84cc16'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Comută tema"
      className="inline-flex items-center gap-0.5 rounded-full p-[3px] border transition-colors"
      style={{
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
      }}
    >
      <span
        className={`${circle} rounded-full flex items-center justify-center transition-colors`}
        style={{
          backgroundColor: theme === 'light' ? activeBg : 'transparent',
          color: theme === 'light' ? '#020617' : '#64748b',
        }}
      >
        <Sun size={icon} />
      </span>
      <span
        className={`${circle} rounded-full flex items-center justify-center transition-colors`}
        style={{
          backgroundColor: theme === 'dark' ? activeBg : 'transparent',
          color: theme === 'dark' ? '#020617' : '#64748b',
        }}
      >
        <Moon size={icon} />
      </span>
    </button>
  )
}

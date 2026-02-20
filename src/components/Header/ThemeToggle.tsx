import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../../context/ThemeContext'
import Button from '../UI/Button'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="icon" onClick={toggleTheme} title="Toggle Theme">
      {theme === 'dark' ? <FiMoon /> : <FiSun />}
    </Button>
  )
}

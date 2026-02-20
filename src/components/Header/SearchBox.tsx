import { useBoard } from '../../context/BoardContext'
import { FiSearch } from 'react-icons/fi'
import styles from './Header.module.css'

export default function SearchBox() {
  const { state, setSearchQuery } = useBoard()

  return (
    <div className={styles.searchBox}>
      <FiSearch />
      <input
        type="text"
        placeholder="Search tasks..."
        value={state.searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  )
}

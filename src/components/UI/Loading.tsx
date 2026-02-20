import { FiLoader } from 'react-icons/fi'
import styles from './Loading.module.css'

export default function Loading() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loader}>
        <FiLoader className={styles.spinner} />
        <p className={styles.text}>Loading...</p>
      </div>
    </div>
  )
}

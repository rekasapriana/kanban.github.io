import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi'
import { useToast } from '../../hooks/useToast'
import type { ToastType } from '../../types'
import styles from './Toast.module.css'

const icons: Record<ToastType, React.ReactNode> = {
  success: <FiCheckCircle className={styles.icon} />,
  error: <FiXCircle className={styles.icon} />,
  info: <FiInfo className={styles.icon} />,
  warning: <FiAlertTriangle className={styles.icon} />
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          onClick={() => removeToast(toast.id)}
        >
          {icons[toast.type]}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}

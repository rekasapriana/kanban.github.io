import { useState, FormEvent } from 'react'
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../../context/AuthContext'
import Button from '../UI/Button'
import styles from './AuthContainer.module.css'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, signInGoogle, loading } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await signIn(email, password)
  }

  const handleGoogleSignIn = async () => {
    await signInGoogle()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label>
          <FiMail />
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>
          <FiLock />
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>

      <Button type="submit" variant="primary" size="full" disabled={loading}>
        <FiLogIn />
        Login
      </Button>

      <Button type="button" variant="google" size="full" onClick={handleGoogleSignIn} disabled={loading}>
        <FcGoogle />
        Continue with Google
      </Button>
    </form>
  )
}

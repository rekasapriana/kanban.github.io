import { useState, FormEvent } from 'react'
import { FiUser, FiMail, FiLock, FiUserPlus } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { useAuth } from '../../context/AuthContext'
import Button from '../UI/Button'
import styles from './AuthContainer.module.css'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signUp, signInGoogle, loading } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await signUp(email, password, name)
  }

  const handleGoogleSignIn = async () => {
    await signInGoogle()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label>
          <FiUser />
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>

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
          placeholder="Min 6 characters"
          required
          minLength={6}
        />
      </div>

      <Button type="submit" variant="primary" size="full" disabled={loading}>
        <FiUserPlus />
        Create Account
      </Button>

      <Button type="button" variant="google" size="full" onClick={handleGoogleSignIn} disabled={loading}>
        <FcGoogle />
        Continue with Google
      </Button>
    </form>
  )
}

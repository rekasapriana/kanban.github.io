import { useState } from 'react'
import {
  FiLink,
  FiCheck,
  FiX,
  FiSettings,
  FiRefreshCw,
  FiExternalLink,
  FiZap
} from 'react-icons/fi'
import { useToast } from '../../hooks/useToast'
import styles from './Views.module.css'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: 'communication' | 'development' | 'productivity'
  connected: boolean
  features: string[]
}

export default function IntegrationsView() {
  const { showToast } = useToast()
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and updates in Slack channels',
      icon: '💬',
      category: 'communication',
      connected: false,
      features: ['Task notifications', 'Daily digest', 'Comments sync']
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Link commits, PRs, and issues to your tasks',
      icon: '🐙',
      category: 'development',
      connected: false,
      features: ['Commit links', 'PR tracking', 'Issue sync', 'Branch creation']
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync due dates with Google Calendar',
      icon: '📅',
      category: 'productivity',
      connected: false,
      features: ['Due date sync', 'Reminders', 'Time blocking']
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      description: 'Get updates in Microsoft Teams channels',
      icon: '👥',
      category: 'communication',
      connected: false,
      features: ['Notifications', 'Task cards', 'Weekly summary']
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sync issues and projects with Jira',
      icon: '📋',
      category: 'development',
      connected: false,
      features: ['Issue sync', 'Sprint import', 'Status mapping']
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Attach Figma designs to your tasks',
      icon: '🎨',
      category: 'productivity',
      connected: false,
      features: ['Design links', 'Preview embeds', 'Comment sync']
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Sync tasks with Notion databases',
      icon: '📝',
      category: 'productivity',
      connected: false,
      features: ['Two-way sync', 'Database import', 'Page linking']
    },
    {
      id: 'webhook',
      name: 'Webhooks',
      description: 'Send events to any URL',
      icon: '🔗',
      category: 'development',
      connected: false,
      features: ['Custom endpoints', 'Event triggers', 'Payload customization']
    }
  ])

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = async (integration: Integration) => {
    setConnecting(integration.id)
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIntegrations(prev =>
      prev.map(i => i.id === integration.id ? { ...i, connected: true } : i)
    )
    setConnecting(null)
    showToast(`${integration.name} connected successfully`, 'success')
  }

  const handleDisconnect = (integration: Integration) => {
    setIntegrations(prev =>
      prev.map(i => i.id === integration.id ? { ...i, connected: false } : i)
    )
    setSelectedIntegration(null)
    showToast(`${integration.name} disconnected`, 'info')
  }

  const getCategoryLabel = (category: Integration['category']) => {
    switch (category) {
      case 'communication': return 'Communication'
      case 'development': return 'Development'
      case 'productivity': return 'Productivity'
    }
  }

  const groupedIntegrations = {
    communication: integrations.filter(i => i.category === 'communication'),
    development: integrations.filter(i => i.category === 'development'),
    productivity: integrations.filter(i => i.category === 'productivity')
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1><FiLink /> Integrations</h1>
          <p>Connect your favorite tools to enhance your workflow</p>
        </div>
      </div>

      {/* Connected Count */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}><FiLink /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{integrations.filter(i => i.connected).length}</span>
            <span className={styles.statLabel}>Connected</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiZap /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{integrations.length}</span>
            <span className={styles.statLabel}>Available</span>
          </div>
        </div>
      </div>

      {/* Integrations by Category */}
      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <div key={category} className={styles.section}>
          <h2 className={styles.sectionTitle}>{getCategoryLabel(category as Integration['category'])}</h2>
          <div className={styles.integrationsGrid}>
            {items.map(integration => (
              <div
                key={integration.id}
                className={`${styles.integrationCard} ${integration.connected ? styles.connected : ''}`}
                onClick={() => setSelectedIntegration(integration)}
              >
                <div className={styles.integrationHeader}>
                  <span className={styles.integrationIcon}>{integration.icon}</span>
                  <div className={styles.integrationInfo}>
                    <h3>{integration.name}</h3>
                    <p>{integration.description}</p>
                  </div>
                </div>
                <div className={styles.integrationStatus}>
                  {integration.connected ? (
                    <span className={styles.connectedBadge}>
                      <FiCheck /> Connected
                    </span>
                  ) : (
                    <button
                      className={styles.connectBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnect(integration)
                      }}
                      disabled={connecting === integration.id}
                    >
                      {connecting === integration.id ? (
                        <><FiRefreshCw className={styles.spinning} /> Connecting...</>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Integration Detail Modal */}
      {selectedIntegration && (
        <div className={styles.integrationModal}>
          <div className={styles.modalOverlay} onClick={() => setSelectedIntegration(null)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span className={styles.modalIcon}>{selectedIntegration.icon}</span>
                <h3>{selectedIntegration.name}</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedIntegration(null)}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>{selectedIntegration.description}</p>

              <h4>Features</h4>
              <ul className={styles.featuresList}>
                {selectedIntegration.features.map((feature, i) => (
                  <li key={i}>
                    <FiCheck /> {feature}
                  </li>
                ))}
              </ul>

              {selectedIntegration.connected && (
                <div className={styles.connectionSettings}>
                  <h4>Settings</h4>
                  <div className={styles.settingRow}>
                    <label>Sync frequency</label>
                    <select>
                      <option>Real-time</option>
                      <option>Every 5 minutes</option>
                      <option>Every hour</option>
                    </select>
                  </div>
                  <div className={styles.settingRow}>
                    <label>Notifications</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {selectedIntegration.connected ? (
                <>
                  <button
                    className={styles.disconnectBtn}
                    onClick={() => handleDisconnect(selectedIntegration)}
                  >
                    Disconnect
                  </button>
                  <button className={styles.primaryBtn}>
                    <FiSettings /> Configure
                  </button>
                </>
              ) : (
                <button
                  className={styles.primaryBtn}
                  onClick={() => {
                    handleConnect(selectedIntegration)
                  }}
                  disabled={connecting === selectedIntegration.id}
                >
                  {connecting === selectedIntegration.id ? (
                    <><FiRefreshCw className={styles.spinning} /> Connecting...</>
                  ) : (
                    <>
                      <FiExternalLink /> Connect {selectedIntegration.name}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

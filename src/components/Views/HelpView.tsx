import { useState } from 'react'
import { FiHelpCircle, FiBook, FiMessageCircle, FiMail, FiExternalLink, FiChevronDown } from 'react-icons/fi'
import styles from './Views.module.css'

interface FAQ {
  question: string
  answer: string
}

export default function HelpView() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const faqs: FAQ[] = [
    {
      question: 'How do I create a new task?',
      answer: 'Click the "New Task" button in the header, or press the "N" key on your keyboard. Fill in the task details and click "Create Task".'
    },
    {
      question: 'How do I move tasks between columns?',
      answer: 'Simply drag and drop a task card from one column to another. The task will automatically be moved to the new status.'
    },
    {
      question: 'Can I set due dates for tasks?',
      answer: 'Yes! When creating or editing a task, you can set a due date. Tasks with due dates will show the date at the bottom of the card.'
    },
    {
      question: 'How do I search for tasks?',
      answer: 'Use the search box in the header. Type any keyword to filter tasks by title. The search works across all columns.'
    },
    {
      question: 'What are keyboard shortcuts?',
      answer: 'Press "?" to see all available shortcuts. Common ones include: N (new task), S (toggle stats), T (toggle theme).'
    },
    {
      question: 'How do I archive completed tasks?',
      answer: 'Drag a task to the Archive column, or use the archive button on the task card. Archived tasks can be restored from the Archive view.'
    },
  ]

  const resources = [
    { title: 'Getting Started Guide', icon: FiBook, description: 'Learn the basics of Kanban Pro', link: '#' },
    { title: 'Keyboard Shortcuts', icon: FiHelpCircle, description: 'Master productivity shortcuts', link: '#' },
    { title: 'Video Tutorials', icon: FiExternalLink, description: 'Watch step-by-step guides', link: '#' },
    { title: 'Community Forum', icon: FiMessageCircle, description: 'Join discussions with other users', link: '#' },
  ]

  const toggleFaq = (index: string) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <h1>Help & Support</h1>
        <p>Find answers and get support</p>
      </div>

      {/* Quick Links */}
      <div className={styles.helpGrid}>
        {resources.map((resource, index) => (
          <a key={index} href={resource.link} className={styles.helpCard}>
            <resource.icon className={styles.helpIcon} />
            <div>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
            </div>
            <FiExternalLink className={styles.externalIcon} />
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className={styles.section}>
        <h2>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${expandedFaq === String(index) ? styles.expanded : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFaq(String(index))}
              >
                <span>{faq.question}</span>
                <FiChevronDown className={styles.faqIcon} />
              </button>
              {expandedFaq === String(index) && (
                <div className={styles.faqAnswer}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className={styles.section}>
        <h2>Still need help?</h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactCard}>
            <FiMail className={styles.contactIcon} />
            <h3>Email Support</h3>
            <p>Get help from our support team</p>
            <a href="mailto:support@kanbanpro.com" className={styles.contactLink}>
              support@kanbanpro.com
            </a>
          </div>
          <div className={styles.contactCard}>
            <FiMessageCircle className={styles.contactIcon} />
            <h3>Live Chat</h3>
            <p>Chat with us in real-time</p>
            <button className={styles.primaryBtn}>Start Chat</button>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className={styles.versionInfo}>
        <p>Kanban Pro v2.0.0</p>
        <p>Made with ❤️ for productivity enthusiasts</p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Mail, Server, Lock, Send, Key, ExternalLink } from 'lucide-react'
import { adminAPI, emailAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const EmailSettings = () => {
  const { user } = useAuth()
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    encryption: 'TLS',
    authMethod: 'password', // 'password' or 'oauth2'
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Ticketing Tool',
    // OAuth2 fields
    oauth2Provider: 'microsoft', // 'microsoft' or 'google'
    oauth2ClientId: '',
    oauth2ClientSecret: '',
    oauth2TenantId: '',
    oauth2Authorized: false,
  })

  const [imapSettings, setImapSettings] = useState({
    host: '',
    port: '993',
    encryption: 'SSL',
    authMethod: 'password', // 'password' or 'oauth2'
    username: '',
    password: '',
    folder: 'INBOX',
    // OAuth2 fields
    oauth2Provider: 'microsoft',
    oauth2ClientId: '',
    oauth2ClientSecret: '',
    oauth2TenantId: '',
    oauth2Authorized: false,
  })

  const [testEmail, setTestEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [testingSMTP, setTestingSMTP] = useState(false)
  const [testingIMAP, setTestingIMAP] = useState(false)
  const [authorizingOAuth2, setAuthorizingOAuth2] = useState({ smtp: false, imap: false })
  const [settingsSaved, setSettingsSaved] = useState({ smtp: false, imap: false })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await adminAPI.getEmailSettings()
      
      if (settings.smtp) {
        const authMethod = settings.smtp.authMethod || 'password'
        const oauth2 = settings.smtp.auth?.oauth2 || {}
        
        // Determine encryption
        let encryption = settings.smtp.encryption || 'TLS'
        if (!encryption && settings.smtp.secure !== undefined) {
          encryption = settings.smtp.secure ? (settings.smtp.port === 465 ? 'SSL' : 'TLS') : 'None'
        }
        
        setSmtpSettings({
          host: settings.smtp.host || '',
          port: settings.smtp.port?.toString() || '587',
          encryption: encryption,
          authMethod: authMethod,
          username: settings.smtp.auth?.user || '',
          password: '', // Don't load password
          fromEmail: settings.smtp.fromEmail || settings.smtp.auth?.user || '',
          fromName: settings.smtp.fromName || 'Ticketing Tool',
          oauth2Provider: oauth2.provider || 'microsoft',
          oauth2ClientId: oauth2.clientId || '',
          oauth2ClientSecret: oauth2.clientSecret || '',
          oauth2TenantId: oauth2.tenantId || '',
          oauth2Authorized: !!(oauth2.accessToken && oauth2.refreshToken),
        })
        setSettingsSaved(prev => ({ ...prev, smtp: true }))
      }

      if (settings.imap) {
        const authMethod = settings.imap.authMethod || 'password'
        const oauth2 = settings.imap.auth?.oauth2 || {}
        
        // Determine encryption
        let encryption = settings.imap.encryption || 'SSL'
        if (!encryption && settings.imap.secure !== undefined) {
          encryption = settings.imap.secure ? 'SSL' : 'None'
        }
        
        setImapSettings({
          host: settings.imap.host || '',
          port: settings.imap.port?.toString() || '993',
          encryption: encryption,
          authMethod: authMethod,
          username: settings.imap.auth?.user || '',
          password: '', // Don't load password
          folder: settings.imap.folder || 'INBOX',
          oauth2Provider: oauth2.provider || 'microsoft',
          oauth2ClientId: oauth2.clientId || '',
          oauth2ClientSecret: oauth2.clientSecret || '',
          oauth2TenantId: oauth2.tenantId || '',
          oauth2Authorized: !!(oauth2.accessToken && oauth2.refreshToken),
        })
        setSettingsSaved(prev => ({ ...prev, imap: true }))
      }
    } catch (error) {
      console.error('Failed to load email settings:', error)
    }
  }

  const handleSMTPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const smtpData = {
        enabled: true,
        host: smtpSettings.host,
        port: parseInt(smtpSettings.port),
        encryption: smtpSettings.encryption,
        authMethod: smtpSettings.authMethod,
        auth: smtpSettings.authMethod === 'oauth2' ? {
          oauth2: {
            provider: smtpSettings.oauth2Provider,
            clientId: smtpSettings.oauth2ClientId,
            clientSecret: smtpSettings.oauth2ClientSecret,
            tenantId: smtpSettings.oauth2TenantId,
          }
        } : {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        },
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
      }
      
      await adminAPI.updateEmailSettings({ smtp: smtpData })
      toast.success('SMTP settings saved successfully!')
      setSettingsSaved(prev => ({ ...prev, smtp: true }))
      await loadSettings() // Reload to get updated OAuth2 status
    } catch (error) {
      toast.error(error.message || 'Failed to save SMTP settings')
    } finally {
      setLoading(false)
    }
  }

  const handleIMAPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const imapData = {
        enabled: true,
        host: imapSettings.host,
        port: parseInt(imapSettings.port),
        encryption: imapSettings.encryption,
        authMethod: imapSettings.authMethod,
        auth: imapSettings.authMethod === 'oauth2' ? {
          oauth2: {
            provider: imapSettings.oauth2Provider,
            clientId: imapSettings.oauth2ClientId,
            clientSecret: imapSettings.oauth2ClientSecret,
            tenantId: imapSettings.oauth2TenantId,
          }
        } : {
          user: imapSettings.username,
          pass: imapSettings.password,
        },
        folder: imapSettings.folder,
      }
      
      await adminAPI.updateEmailSettings({ imap: imapData })
      toast.success('IMAP settings saved successfully!')
      setSettingsSaved(prev => ({ ...prev, imap: true }))
      await loadSettings() // Reload to get updated OAuth2 status
    } catch (error) {
      toast.error(error.message || 'Failed to save IMAP settings')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth2Authorize = async (type) => {
    const settings = type === 'smtp' ? smtpSettings : imapSettings
    const provider = settings.oauth2Provider
    
    if (!settings.oauth2ClientId || (provider === 'microsoft' && !settings.oauth2TenantId)) {
      toast.error(`Please configure ${provider === 'microsoft' ? 'Client ID and Tenant ID' : 'Client ID'} first`)
      return
    }

    setAuthorizingOAuth2({ ...authorizingOAuth2, [type]: true })
    try {
      const redirectUri = `${window.location.origin}/admin/email/oauth2/callback?type=${type}&provider=${provider}`
      const response = await emailAPI.getOAuth2AuthUrl({
        provider,
        type,
        redirectUri,
      })
      
      // Store OAuth2 state in localStorage for callback
      localStorage.setItem('oauth2_redirect', JSON.stringify({ type, provider, redirectUri }))
      
      // Redirect to OAuth2 authorization
      window.location.href = response.authUrl
      
    } catch (error) {
      toast.error(error.message || 'Failed to get OAuth2 authorization URL')
      setAuthorizingOAuth2({ ...authorizingOAuth2, [type]: false })
    }
  }

  const handleTestSMTP = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to send test email')
      return
    }

    // Check if SMTP settings are saved first
    if (!smtpSettings.host || !smtpSettings.port) {
      toast.error('Please configure SMTP Host and Port before testing')
      return
    }

    if (smtpSettings.authMethod === 'password') {
      // If settings are already saved, backend will use saved password
      // Only require password if settings haven't been saved yet
      if (!settingsSaved.smtp) {
        if (!smtpSettings.username || !smtpSettings.password) {
          toast.error('Please fill in Username and Password, then save settings before testing')
          return
        }
        // Save settings first if not saved
        try {
          const smtpData = {
            enabled: true,
            host: smtpSettings.host,
            port: parseInt(smtpSettings.port),
            encryption: smtpSettings.encryption,
            authMethod: 'password',
            auth: {
              user: smtpSettings.username,
              pass: smtpSettings.password,
            },
            fromEmail: smtpSettings.fromEmail,
            fromName: smtpSettings.fromName,
          }
          await adminAPI.updateEmailSettings({ smtp: smtpData })
          setSettingsSaved(prev => ({ ...prev, smtp: true }))
          toast.success('Settings saved. Testing connection...')
        } catch (error) {
          toast.error('Failed to save SMTP settings: ' + (error.message || 'Unknown error'))
          return
        }
      } else if (!smtpSettings.username) {
        toast.error('Please fill in Username before testing')
        return
      }
      // If settings are saved, backend will use saved password from database
    } else {
      if (!smtpSettings.oauth2Authorized) {
        toast.error('Please authorize OAuth2 first before testing')
        return
      }
    }

    setTestingSMTP(true)
    try {
      const result = await emailAPI.testSMTP({ to: testEmail })
      toast.success(result.message || 'Test email sent successfully! Please check your inbox (and spam folder).')
    } catch (error) {
      toast.error(error.message || 'Failed to send test email')
    } finally {
      setTestingSMTP(false)
    }
  }

  const handleTestIMAP = async () => {
    if (!imapSettings.host || !imapSettings.port) {
      toast.error('Please configure IMAP Host and Port before testing')
      return
    }

    if (imapSettings.authMethod === 'password') {
      // If settings are already saved, backend will use saved password
      // Only require password if settings haven't been saved yet
      if (!settingsSaved.imap) {
        if (!imapSettings.username || !imapSettings.password) {
          toast.error('Please fill in Username and Password, then save settings before testing')
          return
        }
        // Save settings first if not saved
        try {
          const imapData = {
            enabled: true,
            host: imapSettings.host,
            port: parseInt(imapSettings.port),
            encryption: imapSettings.encryption,
            authMethod: 'password',
            auth: {
              user: imapSettings.username,
              pass: imapSettings.password,
            },
            folder: imapSettings.folder || 'INBOX',
          }
          await adminAPI.updateEmailSettings({ imap: imapData })
          setSettingsSaved(prev => ({ ...prev, imap: true }))
          toast.success('Settings saved. Testing connection...')
        } catch (error) {
          toast.error('Failed to save IMAP settings: ' + (error.message || 'Unknown error'))
          return
        }
      } else if (!imapSettings.username) {
        toast.error('Please fill in Username before testing')
        return
      }
      // If settings are saved, backend will use saved password from database
    } else {
      if (!imapSettings.oauth2Authorized) {
        toast.error('Please authorize OAuth2 first before testing')
        return
      }
    }

    setTestingIMAP(true)
    try {
      await emailAPI.testIMAP({})
      toast.success('IMAP connection successful!')
    } catch (error) {
      toast.error(error.message || 'Failed to connect to IMAP server')
    } finally {
      setTestingIMAP(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-gray-600 mt-1">Configure SMTP and IMAP settings for email notifications and ticket creation</p>
        </div>

        {/* SMTP Settings */}
        <Card title="SMTP Settings (Outgoing Email)">
          <form onSubmit={handleSMTPSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SMTP Host *"
                value={smtpSettings.host}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                required
                icon={<Server size={20} />}
                placeholder="smtp.office365.com"
              />

              <Input
                label="SMTP Port *"
                type="number"
                value={smtpSettings.port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                required
                placeholder="587"
              />
            </div>

            <Select
              label="Encryption *"
              value={smtpSettings.encryption}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, encryption: e.target.value })}
              options={[
                { value: 'None', label: 'None' },
                { value: 'TLS', label: 'TLS (Required for Office365)' },
                { value: 'SSL', label: 'SSL' },
              ]}
              required
            />

            <Select
              label="Authentication Method *"
              value={smtpSettings.authMethod}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, authMethod: e.target.value })}
              options={[
                { value: 'password', label: 'Password / App Password' },
                { value: 'oauth2', label: 'OAuth2 (Recommended for Shared Mailboxes)' },
              ]}
              required
            />

            {smtpSettings.authMethod === 'password' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username *"
                    value={smtpSettings.username}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
                    required
                    icon={<Mail size={20} />}
                    placeholder="your-email@example.com"
                  />

                  <Input
                    type="password"
                    label="Password / App Password *"
                    value={smtpSettings.password}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                    required
                    icon={<Lock size={20} />}
                    placeholder={smtpSettings.host?.includes('office365.com') ? 'Use App Password for Office365' : ''}
                  />
                </div>
                {(smtpSettings.host?.includes('gmail.com') || smtpSettings.username?.includes('@gmail.com')) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ Gmail requires App Password:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Enable 2-Step Verification in your Google Account</li>
                      <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">Google App Passwords</a></li>
                      <li>Generate an App Password for "Mail"</li>
                      <li>Use the 16-character App Password (not your regular password)</li>
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">OAuth2 Configuration</p>
                      <p className="text-sm text-blue-700">Perfect for shared mailboxes - no password needed!</p>
                    </div>
                    {smtpSettings.oauth2Authorized && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        ✓ Authorized
                      </span>
                    )}
                  </div>

                  <Select
                    label="OAuth2 Provider *"
                    value={smtpSettings.oauth2Provider}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, oauth2Provider: e.target.value })}
                    options={[
                      { value: 'microsoft', label: 'Microsoft 365' },
                      { value: 'google', label: 'Google Workspace' },
                    ]}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Client ID *"
                      value={smtpSettings.oauth2ClientId}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, oauth2ClientId: e.target.value })}
                      required
                      icon={<Key size={20} />}
                      placeholder="Your OAuth2 Client ID"
                    />

                    <Input
                      type="password"
                      label="Client Secret *"
                      value={smtpSettings.oauth2ClientSecret}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, oauth2ClientSecret: e.target.value })}
                      required
                      icon={<Lock size={20} />}
                      placeholder="Your OAuth2 Client Secret"
                    />
                  </div>

                  {smtpSettings.oauth2Provider === 'microsoft' && (
                    <Input
                      label="Tenant ID *"
                      value={smtpSettings.oauth2TenantId}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, oauth2TenantId: e.target.value })}
                      required
                      icon={<Key size={20} />}
                      placeholder="Your Azure AD Tenant ID"
                    />
                  )}

                  <div className="flex items-center space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuth2Authorize('smtp')}
                      disabled={authorizingOAuth2.smtp || !smtpSettings.oauth2ClientId}
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {authorizingOAuth2.smtp ? 'Authorizing...' : smtpSettings.oauth2Authorized ? 'Re-authorize' : 'Authorize OAuth2'}
                    </Button>
                    {smtpSettings.oauth2Authorized && (
                      <span className="text-sm text-green-600">✓ OAuth2 tokens configured</span>
                    )}
                  </div>

                  <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded">
                    <p className="font-medium mb-1">OAuth2 Setup Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {smtpSettings.oauth2Provider === 'microsoft' ? (
                        <>
                          <li>Register app in <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline">Azure AD</a></li>
                          <li>Add redirect URI: <code className="bg-blue-200 px-1 rounded">{window.location.origin}/admin/email/oauth2/callback</code></li>
                          <li>Copy Client ID, Client Secret, and Tenant ID</li>
                          <li>Click "Authorize OAuth2" to complete setup</li>
                        </>
                      ) : (
                        <>
                          <li>Create OAuth2 credentials in <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                          <li>Add redirect URI: <code className="bg-blue-200 px-1 rounded">{window.location.origin}/admin/email/oauth2/callback</code></li>
                          <li>Copy Client ID and Client Secret</li>
                          <li>Click "Authorize OAuth2" to complete setup</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                label="From Email *"
                value={smtpSettings.fromEmail}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                required
                placeholder="noreply@example.com"
              />

              <Input
                label="From Name *"
                value={smtpSettings.fromName}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                required
                placeholder="Ticketing Tool"
              />
            </div>

            {/* Test Email Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Test Email
              </label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter email address to receive test email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestSMTP}
                  disabled={testingSMTP || !testEmail}
                >
                  <Send size={16} className="mr-2" />
                  {testingSMTP ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Enter your email address and click "Send Test Email" to verify your SMTP configuration.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save SMTP Settings'}
              </Button>
            </div>
          </form>
        </Card>

        {/* IMAP Settings */}
        <Card title="IMAP Settings (Incoming Email)">
          <form onSubmit={handleIMAPSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IMAP Host *"
                value={imapSettings.host}
                onChange={(e) => setImapSettings({ ...imapSettings, host: e.target.value })}
                required
                icon={<Server size={20} />}
                placeholder="imap.office365.com"
              />

              <Input
                label="IMAP Port *"
                type="number"
                value={imapSettings.port}
                onChange={(e) => setImapSettings({ ...imapSettings, port: e.target.value })}
                required
                placeholder="993"
              />
            </div>

            <Select
              label="Encryption *"
              value={imapSettings.encryption}
              onChange={(e) => setImapSettings({ ...imapSettings, encryption: e.target.value })}
              options={[
                { value: 'None', label: 'None' },
                { value: 'SSL', label: 'SSL' },
                { value: 'TLS', label: 'TLS' },
              ]}
              required
            />

            <Select
              label="Authentication Method *"
              value={imapSettings.authMethod}
              onChange={(e) => setImapSettings({ ...imapSettings, authMethod: e.target.value })}
              options={[
                { value: 'password', label: 'Password / App Password' },
                { value: 'oauth2', label: 'OAuth2 (Recommended for Shared Mailboxes)' },
              ]}
              required
            />

            {imapSettings.authMethod === 'password' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username *"
                    value={imapSettings.username}
                    onChange={(e) => setImapSettings({ ...imapSettings, username: e.target.value })}
                    required
                    icon={<Mail size={20} />}
                    placeholder="your-email@example.com"
                  />

                  <Input
                    type="password"
                    label="Password *"
                    value={imapSettings.password}
                    onChange={(e) => setImapSettings({ ...imapSettings, password: e.target.value })}
                    required
                    icon={<Lock size={20} />}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">OAuth2 Configuration</p>
                      <p className="text-sm text-blue-700">Perfect for shared mailboxes - no password needed!</p>
                    </div>
                    {imapSettings.oauth2Authorized && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        ✓ Authorized
                      </span>
                    )}
                  </div>

                  <Select
                    label="OAuth2 Provider *"
                    value={imapSettings.oauth2Provider}
                    onChange={(e) => setImapSettings({ ...imapSettings, oauth2Provider: e.target.value })}
                    options={[
                      { value: 'microsoft', label: 'Microsoft 365' },
                      { value: 'google', label: 'Google Workspace' },
                    ]}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Client ID *"
                      value={imapSettings.oauth2ClientId}
                      onChange={(e) => setImapSettings({ ...imapSettings, oauth2ClientId: e.target.value })}
                      required
                      icon={<Key size={20} />}
                      placeholder="Your OAuth2 Client ID"
                    />

                    <Input
                      type="password"
                      label="Client Secret *"
                      value={imapSettings.oauth2ClientSecret}
                      onChange={(e) => setImapSettings({ ...imapSettings, oauth2ClientSecret: e.target.value })}
                      required
                      icon={<Lock size={20} />}
                      placeholder="Your OAuth2 Client Secret"
                    />
                  </div>

                  {imapSettings.oauth2Provider === 'microsoft' && (
                    <Input
                      label="Tenant ID *"
                      value={imapSettings.oauth2TenantId}
                      onChange={(e) => setImapSettings({ ...imapSettings, oauth2TenantId: e.target.value })}
                      required
                      icon={<Key size={20} />}
                      placeholder="Your Azure AD Tenant ID"
                    />
                  )}

                  <div className="flex items-center space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOAuth2Authorize('imap')}
                      disabled={authorizingOAuth2.imap || !imapSettings.oauth2ClientId}
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {authorizingOAuth2.imap ? 'Authorizing...' : imapSettings.oauth2Authorized ? 'Re-authorize' : 'Authorize OAuth2'}
                    </Button>
                    {imapSettings.oauth2Authorized && (
                      <span className="text-sm text-green-600">✓ OAuth2 tokens configured</span>
                    )}
                  </div>

                  <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded">
                    <p className="font-medium mb-1">OAuth2 Setup Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {imapSettings.oauth2Provider === 'microsoft' ? (
                        <>
                          <li>Register app in <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline">Azure AD</a></li>
                          <li>Add redirect URI: <code className="bg-blue-200 px-1 rounded">{window.location.origin}/admin/email/oauth2/callback</code></li>
                          <li>Copy Client ID, Client Secret, and Tenant ID</li>
                          <li>Click "Authorize OAuth2" to complete setup</li>
                        </>
                      ) : (
                        <>
                          <li>Create OAuth2 credentials in <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                          <li>Add redirect URI: <code className="bg-blue-200 px-1 rounded">{window.location.origin}/admin/email/oauth2/callback</code></li>
                          <li>Copy Client ID and Client Secret</li>
                          <li>Click "Authorize OAuth2" to complete setup</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            )}

            <Input
              label="Folder"
              value={imapSettings.folder}
              onChange={(e) => setImapSettings({ ...imapSettings, folder: e.target.value })}
              placeholder="INBOX"
            />

            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">IMAP Configuration Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Emails sent to the configured address will automatically create tickets</li>
                <li>Email subject becomes ticket title</li>
                <li>Email body becomes ticket description</li>
                <li>Replies to ticket emails will be added as comments</li>
              </ul>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleTestIMAP}
                disabled={testingIMAP}
              >
                {testingIMAP ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save IMAP Settings'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  )
}

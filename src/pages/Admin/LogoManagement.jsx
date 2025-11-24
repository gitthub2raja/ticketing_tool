import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Upload, Image as ImageIcon, X, Save } from 'lucide-react'
import { adminAPI } from '../../services/api'
import { useLogo } from '../../contexts/LogoContext'
import toast from 'react-hot-toast'

export const LogoManagement = () => {
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('/logo.svg')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const { updateLogo, reloadLogo } = useLogo()

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const response = await adminAPI.getLogo()
      if (response.logo) {
        setLogoPreview(response.logo)
      }
    } catch (error) {
      console.error('Failed to load logo:', error)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB')
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlChange = (e) => {
    setLogoUrl(e.target.value)
  }

  const handleLoadFromUrl = () => {
    if (!logoUrl) {
      toast.error('Please enter a valid URL')
      return
    }
    setLogoPreview(logoUrl)
    toast.success('Logo loaded from URL')
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await adminAPI.updateLogo(logoPreview, logoFile?.name || 'logo')
      // Update logo in context to reflect changes immediately
      updateLogo(logoPreview)
      // Reload logo from server to ensure consistency
      await reloadLogo()
      toast.success('Logo saved successfully!')
      setLogoFile(null)
    } catch (error) {
      toast.error(error.message || 'Failed to save logo')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    try {
    setLogoPreview('/logo.svg')
    setLogoFile(null)
    setLogoUrl('')
      // Optionally delete from backend
    toast.success('Logo reset to default')
    } catch (error) {
      toast.error('Failed to reset logo')
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logo Management</h1>
          <p className="text-gray-600 mt-1">Upload and manage your organization's logo</p>
        </div>

        <Card title="Current Logo">
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg mb-6">
            <img 
              src={logoPreview} 
              alt="Logo Preview" 
              className="max-h-32 max-w-full object-contain"
              onError={() => {
                setLogoPreview('/logo.svg')
                toast.error('Failed to load logo, using default')
              }}
            />
          </div>
        </Card>

        <Card title="Upload Logo">
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Logo File
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {logoFile ? logoFile.name : 'Click to upload or drag and drop'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 2MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Logo URL
              </label>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={handleUrlChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadFromUrl}
                >
                  <ImageIcon size={20} className="mr-2" />
                  Load
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <X size={20} className="mr-2" />
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                <Save size={20} className="mr-2" />
                {loading ? 'Saving...' : 'Save Logo'}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The logo will be displayed on the login page and in the sidebar. 
                Recommended size: 200x60px or similar aspect ratio. Supported formats: PNG, JPG, SVG.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}


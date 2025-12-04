import mongoose from 'mongoose'

const emailSettingsSchema = new mongoose.Schema({
  smtp: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String,
    },
    fromEmail: String,
    fromName: String,
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  imap: {
    host: String,
    port: Number,
    secure: Boolean,
    auth: {
      user: String,
      pass: String,
    },
    folder: {
      type: String,
      default: 'INBOX',
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
})

// Only one email settings document
emailSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

export default mongoose.model('EmailSettings', emailSettingsSchema)


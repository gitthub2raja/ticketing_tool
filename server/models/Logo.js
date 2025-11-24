import mongoose from 'mongoose'

const logoSchema = new mongoose.Schema({
  logo: {
    type: String, // Base64 or file path
    required: true,
  },
  filename: {
    type: String,
    default: 'logo',
  },
}, {
  timestamps: true,
})

// Only one logo document
logoSchema.statics.getLogo = async function() {
  return await this.findOne().sort({ createdAt: -1 })
}

export default mongoose.model('Logo', logoSchema)


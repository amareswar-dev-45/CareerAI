const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => 'uid_' + new mongoose.Types.ObjectId() 
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['student', 'college_admin'], default: 'student' },
  institutionId: { type: String, default: 'GCEK-MAIN' },
  collegeName: { type: String, default: 'Government College of Engineering Kalahandi' },
  department: { type: String, default: 'Computer Science & Engineering' },
  degree: { type: String, default: 'B.Tech' },
  dreamCompany: { type: String, default: '' },
  targetRole: { type: String, default: '' },
  graduationYear: { type: String, default: '2026' },
  onboardingCompleted: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hook to hash password if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);


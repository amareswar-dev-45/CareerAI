const Application = require('../models/Application');

exports.getApplications = async (req, res) => {
  try {
    let apps = await Application.find({ userId: req.user.firebaseUid }).sort({ createdAt: -1 });
    
    // Seed default sample applications matching mockup if empty
    if (apps.length === 0) {
      const defaultApps = [
        {
          userId: req.user.firebaseUid,
          company: 'Google',
          role: 'SDE Intern',
          location: 'Bengaluru',
          status: 'Interview',
          appliedDate: new Date('2026-09-20'),
          interviewDate: 'Oct 2, 2026',
          source: 'Company Site'
        },
        {
          userId: req.user.firebaseUid,
          company: 'Microsoft',
          role: 'Software Intern',
          location: 'Bengaluru',
          status: 'Applied',
          appliedDate: new Date('2026-09-18'),
          source: 'Company Site'
        },
        {
          userId: req.user.firebaseUid,
          company: 'Startup XYZ',
          role: 'MERN Intern',
          location: 'Bhubaneswar',
          status: 'Applied',
          appliedDate: new Date('2026-09-15'),
          source: 'Platform'
        },
        {
          userId: req.user.firebaseUid,
          company: 'Amazon',
          role: 'SDE Intern',
          location: 'Bengaluru',
          status: 'Saved',
          source: 'Company Site'
        },
        {
          userId: req.user.firebaseUid,
          company: 'TCS',
          role: 'Frontend Dev Intern',
          location: 'Remote',
          status: 'Saved',
          source: 'Indian Jobs'
        },
        {
          userId: req.user.firebaseUid,
          company: 'Deloitte',
          role: 'SDE Intern',
          location: 'Bengaluru',
          status: 'Interview',
          appliedDate: new Date('2026-09-10'),
          interviewDate: 'Oct 5, 2026',
          source: 'LinkedIn'
        },
        {
          userId: req.user.firebaseUid,
          company: 'XYZ Corp',
          role: 'Software Engineer',
          location: 'Bengaluru',
          status: 'Offer',
          appliedDate: new Date('2026-08-28'),
          source: 'Company Site'
        }
      ];

      apps = await Application.insertMany(defaultApps);
    }

    return res.json({ success: true, data: apps });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.createApplication = async (req, res) => {
  try {
    const appData = {
      userId: req.user.firebaseUid,
      ...req.body
    };
    const app = await Application.create(appData);
    return res.json({ success: true, data: app });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.updateApplication = async (req, res) => {
  try {
    const { status, notes, interviewDate } = req.body;
    const app = await Application.findOne({ _id: req.params.id, userId: req.user.firebaseUid });

    if (!app) {
      return res.status(404).json({ success: false, error: { message: 'Application not found' } });
    }

    if (status && status !== app.status) {
      app.status = status;
      app.statusHistory.push({ status, updatedAt: new Date() });
    }

    if (notes !== undefined) app.notes = notes;
    if (interviewDate !== undefined) app.interviewDate = interviewDate;

    await app.save();
    return res.json({ success: true, data: app });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    await Application.deleteOne({ _id: req.params.id, userId: req.user.firebaseUid });
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const FAQ = require('../models/FAQ');
const SupportSetting = require('../models/SupportSetting');

// Escape user search text before using it in $regex (avoids regex injection / ReDoS)
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to get or initialize support settings
const getOrInitSupportSettings = async () => {
  let settings = await SupportSetting.findOne();
  if (!settings) {
    settings = await SupportSetting.create({});
  }
  return settings;
};

// @desc    Get public help and support data (FAQs & Contact Info)
// @route   GET /api/help-support
// @access  Public
const getHelpData = async (req, res) => {
  try {
    const supportSettings = await getOrInitSupportSettings();

    const faqs = await FAQ.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        faqs,
        supportSettings
      }
    });
  } catch (error) {
    console.error('Error fetching help data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch help and support data',
      error: error.message
    });
  }
};

// @desc    Get Admin FAQ stats
// @route   GET /api/help-support/admin/stats
// @access  Admin
const getAdminStats = async (req, res) => {
  try {
    const totalFaqs = await FAQ.countDocuments();
    const activeFaqs = await FAQ.countDocuments({ isActive: true });
    const inactiveFaqs = await FAQ.countDocuments({ isActive: false });

    res.status(200).json({
      success: true,
      data: {
        totalFaqs,
        activeFaqs,
        inactiveFaqs
      }
    });
  } catch (error) {
    console.error('Error fetching FAQ stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ statistics',
      error: error.message
    });
  }
};

// @desc    Get all FAQs for admin (with search and status filter)
// @route   GET /api/help-support/admin/faqs
// @access  Admin
const getAdminFaqs = async (req, res) => {
  try {
    const { search, status } = req.query;

    const query = {};
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: escapeRegex(search.trim()), $options: 'i' } },
        { description: { $regex: escapeRegex(search.trim()), $options: 'i' } },
        { content: { $regex: escapeRegex(search.trim()), $options: 'i' } }
      ];
    }

    const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: faqs
    });
  } catch (error) {
    console.error('Error fetching admin FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      error: error.message
    });
  }
};

// @desc    Create new FAQ
// @route   POST /api/help-support/admin/faqs
// @access  Admin
const createFaq = async (req, res) => {
  try {
    const { title, description, content, order, isActive } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const faq = await FAQ.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      content: content.trim(),
      order: typeof order === 'number' ? order : 0,
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      error: error.message
    });
  }
};

// @desc    Update FAQ
// @route   PUT /api/help-support/admin/faqs/:id
// @access  Admin
const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, order, isActive } = req.body;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    if (title !== undefined) faq.title = title.trim();
    if (description !== undefined) faq.description = description.trim();
    if (content !== undefined) faq.content = content.trim();
    if (order !== undefined) faq.order = order;
    if (isActive !== undefined) faq.isActive = isActive;

    await faq.save();

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ',
      error: error.message
    });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/help-support/admin/faqs/:id
// @access  Admin
const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ',
      error: error.message
    });
  }
};

// @desc    Toggle FAQ status
// @route   PATCH /api/help-support/admin/faqs/:id/status
// @access  Admin
const toggleFaqStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    faq.isActive = !faq.isActive;
    await faq.save();

    res.status(200).json({
      success: true,
      message: `FAQ ${faq.isActive ? 'activated' : 'deactivated'} successfully`,
      data: faq
    });
  } catch (error) {
    console.error('Error toggling FAQ status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ status',
      error: error.message
    });
  }
};

// @desc    Get support settings
// @route   GET /api/help-support/admin/settings
// @access  Admin
const getSupportSettings = async (req, res) => {
  try {
    const settings = await getOrInitSupportSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting support settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support settings',
      error: error.message
    });
  }
};

// @desc    Update support settings
// @route   PUT /api/help-support/admin/settings
// @access  Admin
const updateSupportSettings = async (req, res) => {
  try {
    const {
      phone,
      email,
      whatsapp,
      workingHours,
      callSupportTitle,
      callSupportDescription,
      emailSupportTitle,
      emailSupportDescription
    } = req.body;

    let settings = await getOrInitSupportSettings();

    if (phone !== undefined) settings.phone = phone.trim();
    if (email !== undefined) settings.email = email.trim();
    if (whatsapp !== undefined) settings.whatsapp = whatsapp.trim();
    if (workingHours !== undefined) settings.workingHours = workingHours.trim();
    if (callSupportTitle !== undefined) settings.callSupportTitle = callSupportTitle.trim();
    if (callSupportDescription !== undefined) settings.callSupportDescription = callSupportDescription.trim();
    if (emailSupportTitle !== undefined) settings.emailSupportTitle = emailSupportTitle.trim();
    if (emailSupportDescription !== undefined) settings.emailSupportDescription = emailSupportDescription.trim();

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Support settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating support settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support settings',
      error: error.message
    });
  }
};

module.exports = {
  getHelpData,
  getAdminStats,
  getAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqStatus,
  getSupportSettings,
  updateSupportSettings
};

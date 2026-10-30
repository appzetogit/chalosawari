const Policy = require('../models/Policy');

const POLICY_TITLES = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  refund: 'Refund Policy',
  cancellation: 'Cancellation Policy',
  'driver-terms': 'Driver Terms & Conditions',
  'driver-privacy': 'Driver Privacy Policy'
};

const DEFAULT_SECTIONS = {
  'driver-terms': [
    {
      title: 'Driver Partner Eligibility & Registration',
      content: 'Drivers must be at least 18 years of age, hold a valid Driving License suitable for the vehicle category, and submit verified documentation (Aadhaar, PAN, Police Verification) during onboarding.',
      order: 1
    },
    {
      title: 'Vehicle Condition & Legal Compliance',
      content: 'The Driver/Owner is solely responsible for maintaining valid Registration Certificate (RC), Insurance, Fitness Certificate, Road Tax, and Permits. Vehicles must remain clean, roadworthy, and compliant with state motor vehicle rules.',
      order: 2
    },
    {
      title: 'Ride Acceptance, Fares & Payouts',
      content: 'Drivers agree to fulfill accepted bookings responsibly. Fare rates, platform service fees, and scheduled bank payouts are processed as per the platform tariff rules and payment cycles.',
      order: 3
    },
    {
      title: 'Code of Conduct & Passenger Safety',
      content: 'Drivers must maintain professional conduct, follow traffic regulations, avoid rash driving, and maintain zero tolerance for alcohol, substance abuse, harassment, or verbal misconduct. Violations will result in immediate suspension.',
      order: 4
    },
    {
      title: 'Platform Liability & Dispute Resolution',
      content: 'Chalo Sawari operates as a digital technology intermediary. Drivers and vehicle owners are solely responsible for traffic penalties, accident liabilities, and vehicle maintenance disputes.',
      order: 5
    }
  ],
  'driver-privacy': [
    {
      title: 'Information Collected from Driver Partners',
      content: 'We collect your profile details (name, contact number, email, address, photo), identity proof (Aadhaar, PAN), driving credentials (license, badges), vehicle documentation (RC, insurance, permits), and bank account details for payout processing.',
      order: 1
    },
    {
      title: 'Real-Time Location & Telemetry Tracking',
      content: 'When active on duty or fulfilling trips, the Driver App continuously tracks real-time GPS location and trip route data to match nearby booking requests, calculate trip distances, optimize navigation, and ensure safety.',
      order: 2
    },
    {
      title: 'KYC Verification & Background Screening',
      content: 'Driver information and credentials may be verified against government databases, RTO portals, and authorized background screening agencies to verify legitimacy and comply with transport safety regulations.',
      order: 3
    },
    {
      title: 'Information Shared with Passengers',
      content: 'To facilitate seamless pickups, passengers are provided your first name, overall driver rating, vehicle model, color, and registration plate number. Financial information is never exposed to passengers.',
      order: 4
    },
    {
      title: 'Financial & Bank Data Security',
      content: 'Bank account and IFSC details provided for earnings payouts are securely stored and encrypted, and only shared with RBI-authorized payment processors for direct deposit settlements.',
      order: 5
    }
  ]
};

// Helper to get or create policy from database
const getOrCreatePolicy = async (type) => {
  let policy = await Policy.findOne({ type });
  if (!policy) {
    const defaultSections = DEFAULT_SECTIONS[type] || [];
    policy = await Policy.create({
      type,
      title: POLICY_TITLES[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Policy`,
      sections: defaultSections
    });
  }
  // Sort sections by order
  if (policy.sections && policy.sections.length > 0) {
    policy.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return policy;
};

// @desc    Get public policy by type
// @route   GET /api/policies/:type
// @access  Public
const getPolicyByType = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['terms', 'privacy', 'refund', 'cancellation', 'driver-terms', 'driver-privacy'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid policy type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const policy = await getOrCreatePolicy(type);

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} policy:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy data',
      error: error.message
    });
  }
};

// @desc    Get policy for admin
// @route   GET /api/policies/admin/:type
// @access  Admin
const getAdminPolicy = async (req, res) => {
  try {
    const { type } = req.params;
    const policy = await getOrCreatePolicy(type);

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error(`Error fetching admin policy for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin policy',
      error: error.message
    });
  }
};

// @desc    Update entire policy (title, sections)
// @route   PUT /api/policies/admin/:type
// @access  Admin
const updatePolicy = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, sections, isActive } = req.body;

    let policy = await getOrCreatePolicy(type);

    if (title !== undefined) policy.title = title.trim();
    if (sections !== undefined && Array.isArray(sections)) {
      policy.sections = sections.map((sec, idx) => ({
        title: sec.title ? sec.title.trim() : '',
        content: sec.content ? sec.content.trim() : '',
        order: typeof sec.order === 'number' ? sec.order : idx + 1
      }));
    }
    if (isActive !== undefined) policy.isActive = isActive;
    policy.lastUpdated = new Date();

    await policy.save();

    res.status(200).json({
      success: true,
      message: `${policy.title} updated successfully`,
      data: policy
    });
  } catch (error) {
    console.error(`Error updating policy ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update policy',
      error: error.message
    });
  }
};

// @desc    Add single section to policy
// @route   POST /api/policies/admin/:type/section
// @access  Admin
const addPolicySection = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content, order } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Section title and content are required'
      });
    }

    const policy = await getOrCreatePolicy(type);

    const newSection = {
      title: title.trim(),
      content: content.trim(),
      order: typeof order === 'number' ? order : policy.sections.length + 1
    };

    policy.sections.push(newSection);
    policy.lastUpdated = new Date();
    await policy.save();

    res.status(201).json({
      success: true,
      message: 'Section added successfully',
      data: policy
    });
  } catch (error) {
    console.error(`Error adding section to ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to add section',
      error: error.message
    });
  }
};

// @desc    Update single section in policy
// @route   PUT /api/policies/admin/:type/section/:sectionId
// @access  Admin
const updatePolicySection = async (req, res) => {
  try {
    const { type, sectionId } = req.params;
    const { title, content, order } = req.body;

    const policy = await getOrCreatePolicy(type);
    const section = policy.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    if (title !== undefined) section.title = title.trim();
    if (content !== undefined) section.content = content.trim();
    if (order !== undefined) section.order = order;

    policy.lastUpdated = new Date();
    await policy.save();

    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data: policy
    });
  } catch (error) {
    console.error(`Error updating section in ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section',
      error: error.message
    });
  }
};

// @desc    Delete single section from policy
// @route   DELETE /api/policies/admin/:type/section/:sectionId
// @access  Admin
const deletePolicySection = async (req, res) => {
  try {
    const { type, sectionId } = req.params;

    const policy = await getOrCreatePolicy(type);
    const section = policy.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    section.deleteOne();
    policy.lastUpdated = new Date();
    await policy.save();

    res.status(200).json({
      success: true,
      message: 'Section deleted successfully',
      data: policy
    });
  } catch (error) {
    console.error(`Error deleting section in ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete section',
      error: error.message
    });
  }
};

module.exports = {
  getPolicyByType,
  getAdminPolicy,
  updatePolicy,
  addPolicySection,
  updatePolicySection,
  deletePolicySection
};

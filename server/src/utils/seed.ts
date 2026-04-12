/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { User }           from '../models/User';
import { Department }     from '../models/Department';
import { Vendor }         from '../models/Vendor';
import { VendorDocument } from '../models/VendorDocument';
import { Contract }       from '../models/Contract';
import { ContractItem }   from '../models/ContractItem';
import { Payment }        from '../models/Payment';
import { Audit }          from '../models/Audit';
import { AuditFinding }   from '../models/AuditFinding';
import { PublicRecord }   from '../models/PublicRecord';
import { PublicComment }  from '../models/PublicComment';
import { SpendingSummary } from '../models/SpendingSummary';
import { connectDB }      from '../config/db';

// ─────────────────────────────────────────────────────────────────────────────

export const seedData = async () => {
  try {
    console.log('🌱  Seeding database...');

    // ── 0. CLEAR ALL COLLECTIONS & SYNC INDEXES ───────────────────────────────
    console.log('🗑️   Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Vendor.deleteMany({}),
      VendorDocument.deleteMany({}),
      Contract.deleteMany({}),
      ContractItem.deleteMany({}),
      Payment.deleteMany({}),
      Audit.deleteMany({}),
      AuditFinding.deleteMany({}),
      PublicRecord.deleteMany({}),
      PublicComment.deleteMany({}),
      SpendingSummary.deleteMany({}),
    ]);
    console.log('✅  All collections cleared.');

    // Drop all indexes (except _id) and recreate from current schema.
    // This removes stale indexes left over from renamed fields.
    console.log('🔧  Rebuilding indexes...');
    await Promise.all([
      Vendor.collection.dropIndexes(),
      Contract.collection.dropIndexes(),
      Payment.collection.dropIndexes(),
      Audit.collection.dropIndexes(),
    ]);
    await Promise.all([
      Vendor.syncIndexes(),
      Contract.syncIndexes(),
      Payment.syncIndexes(),
      Audit.syncIndexes(),
    ]);
    console.log('✅  Indexes rebuilt.\n');

    // ── 1. DEPARTMENTS ────────────────────────────────────────────────────────
    const [transport, health, education] = await Department.insertMany([
      {
        name: 'Ministry of Transport',  code: 'MOT',
        description: 'Transport infrastructure and road maintenance',
        budget: 50_000_000, fiscalYear: 2024, headOfDepartment: 'Rohan Jayawardena',
      },
      {
        name: 'Ministry of Health',     code: 'MOH',
        description: 'Public health services and facilities',
        budget: 80_000_000, fiscalYear: 2024, headOfDepartment: 'Dr. Priya Senanayake',
      },
      {
        name: 'Ministry of Education',  code: 'MOE',
        description: 'Education services and school infrastructure',
        budget: 60_000_000, fiscalYear: 2024, headOfDepartment: 'Amara Silva',
      },
    ]);

    // ── 2. USERS ──────────────────────────────────────────────────────────────
    // Use create() individually so the pre-save password-hashing hook fires
    const admin = await User.create({
      name: 'Admin User',      email: 'admin@civic.gov',   password: 'admin123',   role: 'admin',
    } as any);

    const officer = await User.create({
      name: 'Jane Procurement', email: 'officer@civic.gov', password: 'officer123',
      role: 'procurement_officer', department: transport._id,
    } as any);

    const auditor = await User.create({
      name: 'John Auditor',    email: 'auditor@civic.gov', password: 'auditor123', role: 'auditor',
    } as any);


    // ── 3. VENDORS ────────────────────────────────────────────────────────────
    const [abc, techpro, healthcare, corrupt, media] = await Vendor.insertMany([
      {
        name: 'ABC Construction Co.', registrationNumber: 'REG-001', status: 'active',
        email: 'contact@abcconstruction.com', phone: '+94-11-234-5678',
        address: '12 Builder Lane, Colombo 3', category: 'Construction',
        performanceScore: 85, totalContractsValue: 25_000_000,
      },
      {
        name: 'TechPro Solutions Ltd.', registrationNumber: 'REG-002', status: 'active',
        email: 'info@techpro.lk', phone: '+94-11-345-6789',
        address: '45 Tech Park, Colombo 7', category: 'Technology',
        performanceScore: 90, totalContractsValue: 6_150_000,
      },
      {
        name: 'HealthCare Partners LLC', registrationNumber: 'REG-003', status: 'active',
        email: 'contracts@healthcarepartners.lk', phone: '+94-11-456-7890',
        address: '78 Medical Road, Colombo 8', category: 'Healthcare',
        performanceScore: 78, totalContractsValue: 5_000_000,
      },
      {
        // Blacklisted — previous fraud detected in an earlier contract
        name: 'Corrupt Builders Ltd.', registrationNumber: 'REG-004', status: 'blacklisted',
        email: 'info@corruptbuilders.lk', phone: '+94-11-567-8901',
        address: '99 Shady Street, Colombo 15', category: 'Construction',
        isBlacklisted: true,
        blacklistReason: 'Fraud in CON-2022-009: inflated invoices totalling LKR 4.2 M confirmed by forensic audit',
        blacklistedAt: new Date('2023-03-15'),
        blacklistedBy: admin._id,
        performanceScore: 12,
        isActive: false,
        totalContractsValue: 0,
      },
      {
        // Active vendor but holds an EXPIRED tax clearance certificate
        name: 'Media & Print Agency', registrationNumber: 'REG-005', status: 'active',
        email: 'hello@mediaprint.lk', phone: '+94-11-678-9012',
        address: '22 Press Lane, Colombo 2', category: 'Media',
        performanceScore: 72, totalContractsValue: 200_000,
      },
    ]);

    // ── 4. VENDOR DOCUMENTS ────────────────────────────────────────────────────
    const validExpiry   = new Date('2026-12-31');
    const expiredExpiry = new Date('2023-06-30');

    await VendorDocument.insertMany([
      // ABC Construction — two valid docs
      { vendor: abc._id, documentType: 'business_license',          documentNumber: 'BR-ABC-001',   issueDate: new Date('2020-01-15'), expiryDate: validExpiry,            isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/abc-reg.pdf' },
      { vendor: abc._id, documentType: 'tax_clearance',             documentNumber: 'TC-ABC-2024',  issueDate: new Date('2024-01-01'), expiryDate: validExpiry,            isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/abc-tax.pdf' },

      // TechPro — valid registration + ISO cert
      { vendor: techpro._id, documentType: 'registration_certificate', documentNumber: 'BR-TP-001',   issueDate: new Date('2018-05-10'), expiryDate: validExpiry,            isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/techpro-reg.pdf' },
      { vendor: techpro._id, documentType: 'other',                    documentNumber: 'ISO-9001-TP', issueDate: new Date('2023-03-01'), expiryDate: new Date('2026-03-01'), isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/techpro-iso.pdf' },

      // HealthCare Partners — registration + health service licence
      { vendor: healthcare._id, documentType: 'registration_certificate', documentNumber: 'BR-HC-001',  issueDate: new Date('2019-07-20'), expiryDate: validExpiry,            isVerified: true, verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/hc-reg.pdf' },
      { vendor: healthcare._id, documentType: 'insurance',                documentNumber: 'HSL-HC-001', issueDate: new Date('2023-01-01'), expiryDate: new Date('2026-01-01'), isVerified: true, verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/hc-licence.pdf' },

      // Corrupt Builders — unverified registration (expired; contributed to blacklist)
      { vendor: corrupt._id, documentType: 'registration_certificate', documentNumber: 'BR-CB-001', issueDate: new Date('2018-01-01'), expiryDate: expiredExpiry, isVerified: false, fileUrl: '/uploads/vendors/corrupt-reg.pdf' },

      // Media & Print — valid registration but EXPIRED tax clearance
      { vendor: media._id, documentType: 'registration_certificate', documentNumber: 'BR-MP-001',   issueDate: new Date('2021-04-10'), expiryDate: validExpiry,   isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/media-reg.pdf' },
      { vendor: media._id, documentType: 'tax_clearance',            documentNumber: 'TC-MP-2022',  issueDate: new Date('2022-01-01'), expiryDate: expiredExpiry, isVerified: true,  verifiedBy: admin._id, verifiedAt: new Date(), fileUrl: '/uploads/vendors/media-tax.pdf' },
    ]);

    // ── 5. CONTRACTS (10) ─────────────────────────────────────────────────────
    const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = await Contract.insertMany([
      // 1 — active, open tender, public
      {
        contractNumber: 'CON-2024-001', title: 'Highway Maintenance Contract 2024',
        description: 'Annual highway maintenance and repair for District 5 motorways',
        vendor: abc._id, department: transport._id, createdBy: officer._id,
        contractValue: 5_000_000, totalPaid: 2_500_000, currency: 'USD',
        startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
        procurementMethod: 'open_tender', status: 'active', isPublic: true,
        category: 'Infrastructure', tags: ['highway', 'maintenance'],
      },
      // 2 — active, restricted tender
      {
        contractNumber: 'CON-2024-002', title: 'IT Infrastructure Upgrade — 50 Schools',
        description: 'Server, network, and cybersecurity upgrade for 50 public schools',
        vendor: techpro._id, department: education._id, createdBy: officer._id,
        contractValue: 2_500_000, totalPaid: 0, currency: 'USD',
        startDate: new Date('2024-03-01'), endDate: new Date('2025-02-28'),
        procurementMethod: 'restricted_tender', status: 'active',
        category: 'Technology',
      },
      // 3 — completed, direct award, public
      {
        contractNumber: 'CON-2023-003', title: 'National Vaccination Drive Phase 2',
        description: 'Community health screening and vaccination programme across 8 districts',
        vendor: healthcare._id, department: health._id, createdBy: officer._id,
        contractValue: 1_800_000, totalPaid: 1_800_000, currency: 'USD',
        startDate: new Date('2023-06-01'), endDate: new Date('2024-05-31'),
        procurementMethod: 'direct_award', status: 'completed', isPublic: true,
        category: 'Healthcare', tags: ['vaccination', 'health'],
      },
      // 4 — draft, open tender, large build
      {
        contractNumber: 'CON-2025-004', title: 'Rural School Construction Phase 1',
        description: 'Construction of 12 new primary school buildings in rural districts',
        vendor: abc._id, department: education._id, createdBy: officer._id,
        contractValue: 8_000_000, totalPaid: 0, currency: 'USD',
        startDate: new Date('2025-03-01'), endDate: new Date('2026-12-31'),
        procurementMethod: 'open_tender', status: 'draft',
        category: 'Construction',
      },
      // 5 — active, restricted tender, public
      {
        contractNumber: 'CON-2025-005', title: 'Medical Equipment Supply to Regional Hospitals',
        description: 'Supply of MRI, ultrasound, and surgical equipment to 6 regional hospitals',
        vendor: healthcare._id, department: health._id, createdBy: officer._id,
        contractValue: 3_200_000, totalPaid: 800_000, currency: 'USD',
        startDate: new Date('2025-01-15'), endDate: new Date('2025-12-31'),
        procurementMethod: 'restricted_tender', status: 'active', isPublic: true,
        category: 'Healthcare', tags: ['medical', 'equipment'],
      },
      // 6 — active, direct_award HIGH VALUE (>500K threshold — transparency red flag)
      {
        contractNumber: 'CON-2024-006', title: 'Road Traffic Monitoring System',
        description: 'Smart traffic monitoring and management platform for national highway network',
        vendor: techpro._id, department: transport._id, createdBy: officer._id,
        contractValue: 750_000, totalPaid: 400_000, currency: 'USD',
        startDate: new Date('2024-06-01'), endDate: new Date('2025-05-31'),
        procurementMethod: 'direct_award', status: 'active',
        category: 'Technology', tags: ['traffic', 'smart-city'],
      },
      // 7 — completed, framework_agreement, OVERPAYMENT (totalPaid > contractValue)
      {
        contractNumber: 'CON-2024-007', title: 'Annual Software Licence Renewal',
        description: 'Enterprise software licences for Ministry administrative and financial systems',
        vendor: techpro._id, department: education._id, createdBy: officer._id,
        contractValue: 400_000, totalPaid: 520_000, currency: 'USD',  // LKR 120,000 overpayment
        startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
        procurementMethod: 'framework_agreement', status: 'completed',
        category: 'Technology',
      },
      // 8 — under_review, open tender, major hospital works
      {
        contractNumber: 'CON-2024-008', title: 'National Hospital Renovation Programme',
        description: 'Full structural and interior renovation of 3 national hospitals',
        vendor: abc._id, department: health._id, createdBy: officer._id,
        contractValue: 12_000_000, totalPaid: 0, currency: 'USD',
        startDate: new Date('2024-09-01'), endDate: new Date('2027-08-31'),
        procurementMethod: 'open_tender', status: 'under_review',
        category: 'Construction',
      },
      // 9 — active, direct_award, transport platform
      {
        contractNumber: 'CON-2024-009', title: 'Transport Management Software Platform',
        description: 'Fleet tracking, route optimisation, and maintenance scheduling system',
        vendor: techpro._id, department: transport._id, createdBy: officer._id,
        contractValue: 1_500_000, totalPaid: 0, currency: 'USD',
        startDate: new Date('2024-11-01'), endDate: new Date('2025-10-31'),
        procurementMethod: 'direct_award', status: 'active',
        category: 'Technology',
      },
      // 10 — completed, framework_agreement, media vendor
      {
        contractNumber: 'CON-2023-010', title: 'Public Awareness Print Campaign',
        description: 'Design and print of public education materials for school safety programme',
        vendor: media._id, department: education._id, createdBy: officer._id,
        contractValue: 200_000, totalPaid: 200_000, currency: 'USD',
        startDate: new Date('2023-09-01'), endDate: new Date('2024-02-28'),
        procurementMethod: 'framework_agreement', status: 'completed',
        category: 'Media',
      },
    ]);

    // ── 6. CONTRACT ITEMS ─────────────────────────────────────────────────────
    // totalPrice is set manually because insertMany bypasses the pre('save') hook
    await ContractItem.insertMany([
      // CON-2024-001 Highway Maintenance
      { contract: c1._id, description: 'Asphalt resurfacing (per km)',     quantity: 180,    unitPrice:  15_000, totalPrice: 2_700_000, unit: 'km',      marketPrice:  14_000 },
      { contract: c1._id, description: 'Bridge structural inspection',     quantity:   8,    unitPrice:  75_000, totalPrice:   600_000, unit: 'bridge' },
      { contract: c1._id, description: 'Road safety signage installation', quantity: 400,    unitPrice:     500, totalPrice:   200_000, unit: 'unit',    marketPrice:     450 },

      // CON-2024-002 IT Infrastructure
      { contract: c2._id, description: 'Server rack units (42U)',          quantity:   5,    unitPrice: 250_000, totalPrice: 1_250_000, unit: 'unit',    marketPrice: 240_000 },
      { contract: c2._id, description: 'Network switches (48-port)',       quantity:  50,    unitPrice:  12_000, totalPrice:   600_000, unit: 'unit',    marketPrice:  11_500 },
      { contract: c2._id, description: 'Cybersecurity software licences',  quantity: 500,    unitPrice:   1_000, totalPrice:   500_000, unit: 'licence' },

      // CON-2023-003 Vaccination Drive
      { contract: c3._id, description: 'Vaccine doses (COVID-19 booster)', quantity: 50_000, unitPrice:      20, totalPrice: 1_000_000, unit: 'dose',    marketPrice:      18 },
      { contract: c3._id, description: 'Mobile vaccination unit rental',   quantity:   8,    unitPrice:  50_000, totalPrice:   400_000, unit: 'unit' },
      { contract: c3._id, description: 'Healthcare staff training (days)', quantity:  20,    unitPrice:  20_000, totalPrice:   400_000, unit: 'day' },

      // CON-2025-004 School Construction
      { contract: c4._id, description: 'Primary school building (2-floor)', quantity:  12, unitPrice: 500_000, totalPrice: 6_000_000, unit: 'building' },
      { contract: c4._id, description: 'Furniture & fittings per school',   quantity:  12, unitPrice: 100_000, totalPrice: 1_200_000, unit: 'set' },
      { contract: c4._id, description: 'ICT lab equipment per school',      quantity:  12, unitPrice:  66_666, totalPrice:   799_992, unit: 'set' },

      // CON-2025-005 Medical Equipment
      { contract: c5._id, description: 'MRI scanner (1.5T)',               quantity:   2, unitPrice: 800_000, totalPrice: 1_600_000, unit: 'unit', marketPrice: 780_000 },
      { contract: c5._id, description: 'Ultrasound machine (diagnostic)',  quantity:   8, unitPrice: 120_000, totalPrice:   960_000, unit: 'unit', marketPrice: 115_000 },
      { contract: c5._id, description: 'Surgical instrument sets',         quantity:  40, unitPrice:  16_000, totalPrice:   640_000, unit: 'set' },

      // CON-2024-006 Traffic System — cameras are OVERPRICED vs market
      { contract: c6._id, description: 'Smart traffic cameras (4K)',       quantity:  30, unitPrice:  12_000, totalPrice:   360_000, unit: 'unit',    marketPrice:   7_000 },
      { contract: c6._id, description: 'Central management software',      quantity:   1, unitPrice: 250_000, totalPrice:   250_000, unit: 'licence', marketPrice: 200_000 },
      { contract: c6._id, description: 'Installation & commissioning',     quantity:  30, unitPrice:   4_666, totalPrice:   139_980, unit: 'unit' },

      // CON-2024-007 Software Licences
      { contract: c7._id, description: 'ERP system annual licence',              quantity:   1, unitPrice: 300_000, totalPrice: 300_000, unit: 'licence' },
      { contract: c7._id, description: 'Email & collaboration suite (per user)', quantity: 200, unitPrice:     500, totalPrice: 100_000, unit: 'user/yr' },

      // CON-2024-008 Hospital Renovation
      { contract: c8._id, description: 'Structural renovation (per floor)',  quantity: 24, unitPrice: 400_000, totalPrice: 9_600_000, unit: 'floor' },
      { contract: c8._id, description: 'Medical gas & electrical systems',   quantity:  3, unitPrice: 600_000, totalPrice: 1_800_000, unit: 'hospital' },
      { contract: c8._id, description: 'Interior finishing & fixtures',      quantity:  3, unitPrice: 200_000, totalPrice:   600_000, unit: 'hospital' },

      // CON-2024-009 Transport Platform
      { contract: c9._id, description: 'Fleet management platform licence', quantity:  1, unitPrice: 800_000, totalPrice:   800_000, unit: 'platform' },
      { contract: c9._id, description: 'Implementation & training (days)',  quantity: 50, unitPrice:  14_000, totalPrice:   700_000, unit: 'day' },

      // CON-2023-010 Print Campaign
      { contract: c10._id, description: 'Brochure printing (A4, full colour)', quantity: 50_000, unitPrice:  2, totalPrice: 100_000, unit: 'copy' },
      { contract: c10._id, description: 'Poster printing (A1, full colour)',   quantity: 10_000, unitPrice: 10, totalPrice: 100_000, unit: 'poster' },
    ]);

    // ── 7. PAYMENTS ───────────────────────────────────────────────────────────
    await Payment.insertMany([
      // CON-2024-001 — two milestone payments totalling 2.5 M
      { contract: c1._id, vendor: abc._id,        amount: 1_250_000, currency: 'USD', paymentDate: new Date('2024-04-15'), paymentType: 'milestone',    referenceNumber: 'BT-2024-0415-001', status: 'completed', processedBy: officer._id, isOverpayment: false, notes: 'Milestone 1: 50% road works complete' },
      { contract: c1._id, vendor: abc._id,        amount: 1_250_000, currency: 'USD', paymentDate: new Date('2024-08-20'), paymentType: 'milestone',    referenceNumber: 'BT-2024-0820-001', status: 'completed', processedBy: officer._id, isOverpayment: false, notes: 'Milestone 2: 100% complete pending final inspection' },

      // CON-2023-003 — single final payment
      { contract: c3._id, vendor: healthcare._id, amount: 1_800_000, currency: 'USD', paymentDate: new Date('2024-05-20'), paymentType: 'final',        referenceNumber: 'BT-2024-0520-003', status: 'completed', processedBy: officer._id, isOverpayment: false },

      // CON-2025-005 — first equipment delivery instalment
      { contract: c5._id, vendor: healthcare._id, amount:   800_000, currency: 'USD', paymentDate: new Date('2025-03-01'), paymentType: 'installment',  referenceNumber: 'BT-2025-0301-005', status: 'completed', processedBy: officer._id, isOverpayment: false, notes: 'First instalment on delivery of 4 ultrasound units' },

      // CON-2024-006 — partial payment for traffic cameras
      { contract: c6._id, vendor: techpro._id,    amount:   400_000, currency: 'USD', paymentDate: new Date('2024-09-30'), paymentType: 'milestone',    referenceNumber: 'BT-2024-0930-006', status: 'completed', processedBy: officer._id, isOverpayment: false },

      // CON-2024-007 — full contract payment + OVERPAYMENT (2nd payment has no basis)
      { contract: c7._id, vendor: techpro._id,    amount:   400_000, currency: 'USD', paymentDate: new Date('2024-02-01'), paymentType: 'final',        referenceNumber: 'BT-2024-0201-007', status: 'completed', processedBy: officer._id, isOverpayment: false, notes: 'Full annual licence fee' },
      { contract: c7._id, vendor: techpro._id,    amount:   120_000, currency: 'USD', paymentDate: new Date('2024-11-15'), paymentType: 'installment',  referenceNumber: 'BT-2024-1115-007', status: 'completed', processedBy: officer._id, isOverpayment: true,  notes: 'OVERPAYMENT — additional invoice with no contractual basis, under investigation' },

      // CON-2024-008 — advance payment pending board approval
      { contract: c8._id, vendor: abc._id,        amount: 2_000_000, currency: 'USD', paymentDate: new Date('2025-01-10'), paymentType: 'advance',      referenceNumber: 'BT-2025-0110-008', status: 'pending',   processedBy: officer._id, isOverpayment: false, notes: 'Mobilisation advance pending Procurement Board approval' },

      // CON-2024-009 — first instalment pending
      { contract: c9._id, vendor: techpro._id,    amount:   750_000, currency: 'USD', paymentDate: new Date('2025-02-01'), paymentType: 'advance',      referenceNumber: 'BT-2025-0201-009', status: 'pending',   processedBy: officer._id, isOverpayment: false },

      // CON-2023-010 — full payment final
      { contract: c10._id, vendor: media._id,     amount:   200_000, currency: 'USD', paymentDate: new Date('2024-03-01'), paymentType: 'final',        referenceNumber: 'CHQ-2024-0301-010', status: 'completed', processedBy: officer._id, isOverpayment: false },
    ]);

    // ── 8. AUDITS ─────────────────────────────────────────────────────────────
    const [audit1, audit2, audit3] = await Audit.insertMany([
      // Routine — clean
      {
        auditNumber: 'AUD-2024-001',
        title: 'Routine Compliance Review — National Vaccination Drive Phase 2',
        contract: c3._id, vendor: healthcare._id, auditor: auditor._id,
        auditType: 'routine', status: 'completed',
        startDate: new Date('2024-06-01'), endDate: new Date('2024-06-15'),
        riskRating: 'low', complianceOutcome: 'compliant',
        summary: 'Contract executed as per terms. All deliverables met within budget and timeline. Cold-chain documentation complete.',
        recommendations: 'No action required. Recommend vendor for future healthcare contracts based on performance.',
      },
      // Forensic — high risk, in progress (direct-award + overpriced cameras)
      {
        auditNumber: 'AUD-2024-002',
        title: 'Forensic Audit — Road Traffic Monitoring System Direct Award',
        contract: c6._id, vendor: techpro._id, auditor: auditor._id,
        auditType: 'forensic', status: 'in_progress',
        startDate: new Date('2024-12-01'),
        riskRating: 'high', complianceOutcome: 'non_compliant',
        summary: 'Direct award of high-value contract above the LKR 500,000 threshold without proper exemption. Camera units appear significantly overpriced versus market.',
        recommendations: 'Suspend further payments. Obtain independent market valuation. Refer to Procurement Oversight Board.',
      },
      // Compliance — critical risk, completed (overpayment + fraud signals)
      {
        auditNumber: 'AUD-2024-003',
        title: 'Compliance Audit — Annual Software Licence Overpayment Investigation',
        contract: c7._id, vendor: techpro._id, auditor: auditor._id,
        auditType: 'compliance', status: 'completed',
        startDate: new Date('2024-12-10'), endDate: new Date('2025-01-10'),
        riskRating: 'critical', complianceOutcome: 'non_compliant',
        summary: 'Payments exceed contract value by LKR 120,000 via a post-contract invoice with no legal basis. Possible collusion between vendor and processing officer.',
        recommendations: 'Initiate disciplinary proceedings. Recover overpaid amount. Report to Anti-Corruption Commission within 14 days.',
      },
    ]);

    // ── 9. AUDIT FINDINGS ─────────────────────────────────────────────────────
    // audit1 is compliant — no findings

    // Audit 2 findings (forensic, high risk)
    await AuditFinding.insertMany([
      {
        audit: audit2._id,
        title: 'Traffic Camera Overpricing — 71% Above Market Rate',
        findingType: 'overpricing', severity: 'high', status: 'open',
        description: 'Smart traffic cameras procured at LKR 12,000/unit versus market rate of LKR 7,000/unit — 71% markup across 30 units resulting in LKR 150,000 excess expenditure.',
        evidence: '3 independent supplier quotes range LKR 6,800–7,200/unit. Vendor invoice: LKR 12,000/unit.',
        recommendation: 'Issue credit note for LKR 150,000. Mandate independent market survey before any direct-award technology procurement.',
      },
      {
        audit: audit2._id,
        title: 'Direct Award Above LKR 500,000 Threshold — No Exemption Waiver',
        findingType: 'non_compliance', severity: 'medium', status: 'open',
        description: 'Direct award of a contract valued at LKR 750,000 breaches Procurement Regulation 14(b) which mandates competitive tendering above LKR 500,000. No ministerial exemption waiver found on file.',
        evidence: 'Contract CON-2024-006 value: LKR 750,000. Threshold: LKR 500,000. Procurement file reference MOT-PROC-2024-006 — no exemption waiver.',
        recommendation: 'Future contracts above the threshold must use restricted or open tender. Require signed exemption approvals before direct awards.',
      },
    ]);

    // Audit 3 findings (compliance, critical risk)
    await AuditFinding.insertMany([
      {
        audit: audit3._id,
        title: 'Post-Contract Invoice Payment — Possible Fraud',
        findingType: 'fraud', severity: 'critical', status: 'open',
        description: 'Payment of LKR 120,000 made against invoice #INV-TP-2024-1112 which post-dates the contract and has no contractual basis. Full contract amount had already been paid on 1 Feb 2024. Indicates possible collusion.',
        evidence: 'Invoice #INV-TP-2024-1112 (dated 12 Nov 2024) references CON-2024-007. Contract expired 31 Dec 2024 but was fully paid 1 Feb 2024. No change-order or addendum on file.',
        recommendation: 'Freeze vendor account. Initiate disciplinary hearing for processing officer. File report with Anti-Corruption Commission within 14 days.',
      },
      {
        audit: audit3._id,
        title: 'ERP Licence Fee 40% Above Published Public-Sector Rate',
        findingType: 'overpricing', severity: 'high', status: 'resolved',
        description: 'ERP licence fee of LKR 300,000 is 40% above the published public-sector list price of LKR 215,000 for an equivalent 200-user licence.',
        evidence: "Vendor's public sector pricing sheet (downloaded Nov 2024): LKR 215,000 for 200-user licence. Contract price: LKR 300,000.",
        recommendation: 'Renegotiate future renewals at published pricing. Seek LKR 85,000 retrospective credit note.',
      },
      {
        audit: audit3._id,
        title: 'Three-Quote Comparison Sheet Missing from Procurement File',
        findingType: 'documentation', severity: 'medium', status: 'resolved',
        description: 'Mandatory three-quote comparison sheet absent from procurement file MOE-PROC-2024-007. Financial Regulations require three independent quotes for all framework-agreement procurements.',
        evidence: 'Procurement file reference: MOE-PROC-2024-007. Three-quote sheet absent. Only vendor invoice present.',
        recommendation: 'Implement mandatory procurement checklist with sign-off by Procurement Unit Head before processing payments.',
      },
    ]);

    // ── 10. PUBLIC RECORDS ────────────────────────────────────────────────────
    const [rec1, rec2, rec3] = await PublicRecord.insertMany([
      {
        contract: c1._id, publishedBy: admin._id, publishedAt: new Date('2024-01-15'),
        title:   'Highway Maintenance 2024 — District 5',
        summary: 'Annual maintenance of District 5 highway network. Open tender awarded to ABC Construction Co. as the lowest compliant bidder. 180 km of resurfacing and 8 bridge inspections.',
        tags: ['transport', 'infrastructure', 'highway'], viewCount: 142,
      },
      {
        contract: c3._id, publishedBy: admin._id, publishedAt: new Date('2023-06-10'),
        title:   'National Vaccination Drive Phase 2',
        summary: 'Community vaccination and health screening programme across 8 districts. 50,000 COVID-19 booster doses administered. Programme completed on schedule and within budget.',
        tags: ['health', 'vaccination', 'community'], viewCount: 389,
      },
      {
        contract: c5._id, publishedBy: admin._id, publishedAt: new Date('2025-01-20'),
        title:   'Medical Equipment Supply to Regional Hospitals 2025',
        summary: 'Supply of MRI scanners, ultrasound equipment, and surgical instrument sets to 6 regional hospitals. Restricted tender process. Contract in progress.',
        tags: ['health', 'medical-equipment', 'hospitals'], viewCount: 67,
      },
    ]);

    // ── 11. PUBLIC COMMENTS ────────────────────────────────────────────────────
    await PublicComment.insertMany([
      // Record 1 — Highway: 2 approved, 1 pending, 1 flagged+rejected
      { publicRecord: rec1._id, authorName: 'Chaminda Perera',   content: 'The road resurfacing near Kadawatha has been excellent. Much smoother surface and the new safety signs are clearly visible at night. Good job.',                                                      isAnonymous: false, isWhistleblower: false, isFlagged: false, status: 'approved' },
      { publicRecord: rec1._id, authorName: 'Nimal Fernando',    content: 'ABC Construction seem to win every highway contract in this district. Three years in a row. Is anyone checking whether the tender evaluations are fair? I would like to see the scoring sheets.', isAnonymous: false, isWhistleblower: false, isFlagged: false, status: 'approved' },
      { publicRecord: rec1._id, authorName: 'Concerned Driver',  content: 'The patching near Kiribathgoda has failed already — potholes returned within two months. Who carried out the quality inspection and signed off on completion?',                                    isAnonymous: true,  isWhistleblower: false, isFlagged: false, status: 'pending' },
      { publicRecord: rec1._id, authorName: 'Anonymous',         content: 'ADVERTISEMENT CLICK HERE BUY CHEAP PRODUCTS ONLINE',                                                                                                                                               isAnonymous: true,  isWhistleblower: false, isFlagged: true,  flagReason: 'Spam — commercial advertisement unrelated to contract', status: 'rejected' },

      // Record 2 — Vaccination: 2 approved (one whistleblower), 1 rejected
      { publicRecord: rec2._id, authorName: 'Dr. Sanka Weerasinghe',    content: 'As a GP who worked with the mobile units, logistics were well managed. The teams reached remote villages and the record-keeping was thorough. Commend the Ministry and HealthCare Partners.', isAnonymous: false, isWhistleblower: false, isFlagged: false, status: 'approved' },
      { publicRecord: rec2._id, authorName: 'Nurse — Gampaha District', content: 'I participated in the programme. At two sites, the vaccine storage units were not maintaining the required 2–8°C range. We flagged this but no corrective action was taken during the rollout. Cold-chain compliance should be independently verified.', isAnonymous: false, isWhistleblower: true, isFlagged: false, status: 'approved' },
      { publicRecord: rec2._id, authorName: 'Anonymous',                content: 'Direct award is obviously corrupt. HealthCare Partners donated to the party. The media should investigate.',                                                                                  isAnonymous: true,  isWhistleblower: false, isFlagged: true,  flagReason: 'Unsubstantiated political allegation — escalated for moderation review', status: 'rejected' },

      // Record 3 — Medical Equipment: 1 approved, 1 pending
      { publicRecord: rec3._id, authorName: 'Radiology Dept., Kandy Hospital',     content: 'Our hospital received one of the MRI units. Installation by the vendor team was professional and training was thorough. The machine has been in service for 6 weeks without issues.', isAnonymous: false, isWhistleblower: false, isFlagged: false, status: 'approved' },
      { publicRecord: rec3._id, authorName: 'Hospital Administrator, Kurunegala', content: 'We are 6 weeks past the agreed delivery date for our second MRI unit. Vendor cites supply chain delays but has not provided a revised delivery schedule. Can the Ministry provide an update?', isAnonymous: false, isWhistleblower: false, isFlagged: false, status: 'pending' },
    ]);

    // ── 12. SPENDING SUMMARIES (fiscal year 2024) ──────────────────────────────
    // Pre-computed approximations — run POST /api/spending/refresh-summary for live values
    await SpendingSummary.insertMany([
      {
        fiscalYear: 2024, department: transport._id,
        totalSpend: 2_900_000, totalContracts: 3, avgContractValue: 2_416_666,
        avgRiskScore: 68, directAwardCount: 2, overpaymentCount: 0,
        lastRefreshed: new Date(),
      },
      {
        fiscalYear: 2024, department: health._id,
        totalSpend: 1_800_000, totalContracts: 2, avgContractValue: 6_900_000,
        avgRiskScore: 25, directAwardCount: 1, overpaymentCount: 0,
        lastRefreshed: new Date(),
      },
      {
        fiscalYear: 2024, department: education._id,
        totalSpend: 520_000, totalContracts: 3, avgContractValue: 1_033_333,
        avgRiskScore: 100, directAwardCount: 0, overpaymentCount: 1,
        lastRefreshed: new Date(),
      },
    ]);

    console.log('\n✅  Database seeded successfully!\n');
    console.log('─── Login Credentials ───────────────────────────────────────');
    console.log('  admin@civic.gov    / admin123    (admin)');
    console.log('  officer@civic.gov  / officer123  (procurement_officer)');
    console.log('  auditor@civic.gov  / auditor123  (auditor)');
    console.log('─── Seed Counts ─────────────────────────────────────────────');
    console.log('  3  Departments   |  3 Users        |  5 Vendors');
    console.log('  9  VendorDocs    | 10 Contracts    | 27 ContractItems');
    console.log('  9  Payments      |  3 Audits       |  5 AuditFindings');
    console.log('  3  PublicRecords |  9 PublicComments | 3 SpendingSummaries');
    console.log('─── Edge Cases ──────────────────────────────────────────────');
    console.log('  🚫  Blacklisted vendor   : Corrupt Builders Ltd. (REG-004)');
    console.log('  ⚠️   Expired document    : Media & Print Agency — tax clearance');
    console.log('  💸  Overpayment          : CON-2024-007 (+LKR 120,000)');
    console.log('  🔴  Direct award >500K   : CON-2024-006 (LKR 750K), CON-2024-009 (LKR 1.5M)');
    console.log('  🔬  Forensic audit active: CON-2024-006 (high risk — overpricing)');
    console.log('  🚨  Critical finding     : CON-2024-007 (fraud — post-contract invoice)');
    console.log('  🗣️   Whistleblower comment: PublicRecord 2 (vaccination cold-chain)');
    console.log('─────────────────────────────────────────────────────────────\n');

  } catch (error) {
    console.error('❌  Error seeding database:', error);
    throw error;
  }
};

// ─── Standalone execution: ts-node src/utils/seed.ts ─────────────────────────
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
  connectDB()
    .then(() => seedData())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

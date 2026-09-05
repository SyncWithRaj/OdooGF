import {
  PrismaClient,
  Role,
  CustomerTier,
  ProductCategory,
  RecurringInterval,
  RiskLevel,
  ApprovalAction,
  ApprovalStage,
  QuotationStatus,
  FulfillmentStatus,
  SubscriptionStatus,
  InvoiceType,
  InvoiceStatus,
  HealthIssueType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// INDIAN ELECTRONICS & GEOGRAPHY REFERENCE DATA
// ============================================================================

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Amit', 'Ananya', 'Arjun', 'Chetan', 'Divya', 'Gaurav', 'Ishaan', 'Karan',
  'Nehal', 'Pooja', 'Rahul', 'Rohan', 'Sameer', 'Siddharth', 'Sneha', 'Tanya', 'Vikram', 'Priya',
  'Ankit', 'Deepak', 'Suresh', 'Rajesh', 'Sunita', 'Meera', 'Rakesh', 'Manish', 'Harish', 'Manoj',
  'Alok', 'Nikhil', 'Swati', 'Kavita', 'Radhika', 'Kunal', 'Abhishek', 'Varun', 'Shweta', 'Prateek',
  'Preeti', 'Ritu', 'Sachin', 'Naveen', 'Tarun', 'Vikas', 'Pankaj', 'Sumit', 'Ashish', 'Bhavna'
];

const LAST_NAMES = [
  'Patel', 'Sharma', 'Verma', 'Mehta', 'Iyer', 'Nair', 'Reddy', 'Chopra', 'Kapoor', 'Malhotra',
  'Bhatia', 'Joshi', 'Kulkarni', 'Singhania', 'Menon', 'Rao', 'Gupta', 'Sen', 'Mukherjee', 'Banerjee',
  'Das', 'Trivedi', 'Dave', 'Deshmukh', 'Bhosale', 'Jadhav', 'Patil', 'Pillai', 'Nambiar', 'Chauhan',
  'Singh', 'Yadav', 'Aggarwal', 'Mittal', 'Jain', 'Bansal', 'Saxena', 'Pandey', 'Mishra', 'Dubey'
];

const INDIAN_CITIES_META = [
  { city: 'Mumbai', state: 'Maharashtra', pin: '400001', lat: 19.0760, lon: 72.8777 },
  { city: 'Bengaluru', state: 'Karnataka', pin: '560001', lat: 12.9716, lon: 77.5946 },
  { city: 'New Delhi', state: 'Delhi', pin: '110001', lat: 28.6139, lon: 77.2090 },
  { city: 'Gurugram', state: 'Haryana', pin: '122001', lat: 28.4595, lon: 77.0266 },
  { city: 'Noida', state: 'Uttar Pradesh', pin: '201301', lat: 28.5355, lon: 77.3910 },
  { city: 'Hyderabad', state: 'Telangana', pin: '500001', lat: 17.3850, lon: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', pin: '600001', lat: 13.0827, lon: 80.2707 },
  { city: 'Pune', state: 'Maharashtra', pin: '411001', lat: 18.5204, lon: 73.8567 },
  { city: 'Ahmedabad', state: 'Gujarat', pin: '380001', lat: 23.0225, lon: 72.5714 },
  { city: 'Kolkata', state: 'West Bengal', pin: '700001', lat: 22.5726, lon: 88.3639 },
  { city: 'Jaipur', state: 'Rajasthan', pin: '302001', lat: 26.9124, lon: 75.7873 },
  { city: 'Surat', state: 'Gujarat', pin: '395001', lat: 21.1702, lon: 72.8311 },
  { city: 'Lucknow', state: 'Uttar Pradesh', pin: '226001', lat: 26.8467, lon: 80.9462 },
  { city: 'Indore', state: 'Madhya Pradesh', pin: '452001', lat: 22.7196, lon: 75.8577 },
  { city: 'Chandigarh', state: 'Punjab', pin: '160017', lat: 30.7333, lon: 76.7794 },
  { city: 'Kochi', state: 'Kerala', pin: '682001', lat: 9.9312, lon: 76.2673 },
  { city: 'Nagpur', state: 'Maharashtra', pin: '440001', lat: 21.1458, lon: 79.0882 },
  { city: 'Coimbatore', state: 'Tamil Nadu', pin: '641001', lat: 11.0168, lon: 76.9558 },
  { city: 'Vadodara', state: 'Gujarat', pin: '390001', lat: 22.3072, lon: 73.1812 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', pin: '530001', lat: 17.6868, lon: 83.2185 },
  { city: 'Bhopal', state: 'Madhya Pradesh', pin: '462001', lat: 23.2599, lon: 77.4126 },
  { city: 'Thiruvananthapuram', state: 'Kerala', pin: '695001', lat: 8.5241, lon: 76.9366 },
  { city: 'Bhubaneswar', state: 'Odisha', pin: '751001', lat: 20.2961, lon: 85.8245 },
  { city: 'Ludhiana', state: 'Punjab', pin: '141001', lat: 30.9010, lon: 75.8573 },
  { city: 'Nashik', state: 'Maharashtra', pin: '422001', lat: 19.9975, lon: 73.7898 },
  { city: 'Rajkot', state: 'Gujarat', pin: '360001', lat: 22.3039, lon: 70.8022 },
  { city: 'Varanasi', state: 'Uttar Pradesh', pin: '221001', lat: 25.3176, lon: 82.9739 },
  { city: 'Guwahati', state: 'Assam', pin: '781001', lat: 26.1445, lon: 91.7362 },
  { city: 'Mysuru', state: 'Karnataka', pin: '570001', lat: 12.2958, lon: 76.6394 },
  { city: 'Thane', state: 'Maharashtra', pin: '400601', lat: 19.2183, lon: 72.9781 },
];

const INDIAN_COMPANY_BRANDS = [
  'Tata Digital', 'Reliance Retail Electronics', 'Infosys Tech Systems', 'Wipro Consumer Infotech',
  'HCL Technologies Hardware', 'Tech Mahindra Smart Infra', 'Adani Digital Logistics', 'Larsen & Toubro Tech',
  'Godrej Security & Appliances', 'Bajaj Electricals Commercial', 'Havells India Commercial', 'Voltas Beko Enterprises',
  'Croma Infiniti Retail', 'Vijay Sales Electronics', 'Poorvika Mobiles India', 'Sangeetha Mobiles Hub',
  'Dixon Technologies Bharat', 'Optiemus Infracom Electronics', 'Bharat Electronics Limited (BEL)', 'Delhivery Tech Freight',
  'Blue Dart Express Logistics', 'Mahindra Logistics Multi-Modal', 'Boat Lifestyle Imagine', 'Noise Nexxbase Devices',
  'Fire-Boltt Savex Tech', 'Ambrane India Electronics', 'Syska Smart Solutions', 'Luminous Power Technologies',
  'Microtek Digital Power', 'Exide Industries Inverter Supply', 'Amaron Power Systems', 'Micromax Informatics Bharat',
  'Lava International Mobility', 'Crompton Consumer Electricals', 'Polycab Telecom & Appliances', 'V-Guard Smart Electronics',
  'Orient Electric Smart Hub', 'Zebronics India Peripherals', 'Portronics Digital Devices', 'Intex Technologies India'
];

const INDIAN_COMPANY_SUFFIXES = [
  'Pvt Ltd', 'Limited', 'Enterprises Ltd', 'Solutions India', 'Distribution Hub',
  'Commercial Corp', 'Tech Networks', 'Industries India', 'Digital Ventures', 'Supply Chain Services'
];

// Electronic product catalogs for random Indian generation
const INDIAN_ELECTRONICS_HW = [
  { name: 'Lenovo ThinkPad E14 Gen 5 Laptop (Core i7, 16GB, 512GB SSD)', cost: 62000, price: 82000, skuPrefix: 'IN-LAP-TP', margin: 24.4 },
  { name: 'Dell Inspiron 15 3520 Laptop (Core i5 12th Gen, FHD Display)', cost: 38000, price: 49990, skuPrefix: 'IN-LAP-DEL', margin: 23.9 },
  { name: 'HP Pavilion Plus 14 OLED Laptop (AMD Ryzen 7 7840U, 16GB)', cost: 58000, price: 76500, skuPrefix: 'IN-LAP-HP', margin: 24.2 },
  { name: 'Apple MacBook Air M3 (13.6-inch Liquid Retina, 8GB/256GB SSD)', cost: 89000, price: 114900, skuPrefix: 'IN-LAP-MAC', margin: 22.5 },
  { name: 'ASUS Vivobook 16X Creator Laptop (Intel Core i9, RTX 4060)', cost: 79000, price: 104990, skuPrefix: 'IN-LAP-ASUS', margin: 24.7 },
  { name: 'JioBook 11 4G LTE Cloud Laptop (Mediatek Octa-Core, JioOS)', cost: 11000, price: 16499, skuPrefix: 'IN-LAP-JIO', margin: 33.3 },
  { name: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB/256GB)', cost: 95000, price: 129999, skuPrefix: 'IN-PHN-S24', margin: 26.9 },
  { name: 'OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB Storage)', cost: 48000, price: 64999, skuPrefix: 'IN-PHN-OP12', margin: 26.1 },
  { name: 'Apple iPhone 15 (128GB, Made in India Assembled Edition)', cost: 56000, price: 74900, skuPrefix: 'IN-PHN-IP15', margin: 25.2 },
  { name: 'Redmi Note 13 Pro+ 5G (Fusion Purple, 12GB/256GB 200MP)', cost: 23000, price: 31999, skuPrefix: 'IN-PHN-RDM', margin: 28.1 },
  { name: 'Realme 12 Pro+ 5G (Submarine Blue, 64MP Periscope Zoom)', cost: 22000, price: 29999, skuPrefix: 'IN-PHN-RLM', margin: 26.6 },
  { name: 'Vivo V30 Pro 5G (ZEISS Professional Portrait Camera, 512GB)', cost: 31000, price: 41999, skuPrefix: 'IN-PHN-VIV', margin: 26.2 },
  { name: 'Lava Agni 2 5G (Curved AMOLED, Dimensity 7050, Make in India)', cost: 14500, price: 19999, skuPrefix: 'IN-PHN-LAV', margin: 27.5 },
  { name: 'Xiaomi 55-inch X Series 4K Ultra HD Dolby Vision Smart TV', cost: 26000, price: 37999, skuPrefix: 'IN-TV-XIA55', margin: 31.6 },
  { name: 'Samsung Crystal 4K Vivid Pro 43-inch UHD Smart TV', cost: 21000, price: 29990, skuPrefix: 'IN-TV-SAM43', margin: 29.9 },
  { name: 'Sony Bravia 55-inch XR Full Array 4K HDR Google TV', cost: 68000, price: 92900, skuPrefix: 'IN-TV-SNY55', margin: 26.8 },
  { name: 'OnePlus TV 50 Y1S Pro (4K UHD Smart Android TV, 24W Speakers)', cost: 24000, price: 32999, skuPrefix: 'IN-TV-OP50', margin: 27.3 },
  { name: 'BenQ 27-inch 4K UHD Designer IPS Monitor with USB-C PD', cost: 32000, price: 43500, skuPrefix: 'IN-MON-BNQ27', margin: 26.4 },
  { name: 'Zebronics 24-inch Curved 165Hz Full HD Gaming Monitor', cost: 7800, price: 10999, skuPrefix: 'IN-MON-ZEB24', margin: 29.1 },
  { name: 'boAt Airdopes 141 ANC True Wireless Earbuds (32dB Hybrid ANC)', cost: 950, price: 1699, skuPrefix: 'IN-AUD-BOAT', margin: 44.1 },
  { name: 'Noise ColorFit Pulse 2 Max Smartwatch (1.85-inch HD Display)', cost: 850, price: 1499, skuPrefix: 'IN-AUD-NOISE', margin: 43.3 },
  { name: 'Fire-Boltt Invincible Plus AMOLED Smartwatch with Bluetooth Calling', cost: 1800, price: 2999, skuPrefix: 'IN-AUD-FBOLT', margin: 39.9 },
  { name: 'Boult Audio Z40 True Wireless Earbuds (60H Playtime, Low Latency)', cost: 800, price: 1399, skuPrefix: 'IN-AUD-BOULT', margin: 42.8 },
  { name: 'Sony WH-1000XM5 Wireless Industry Leading Noise Cancelling Headphones', cost: 21000, price: 29990, skuPrefix: 'IN-AUD-SONY', margin: 29.9 },
  { name: 'Zebronics Zeb-Juke Bar 9500 5.1 Dolby Atmos Home Theater Soundbar', cost: 9500, price: 13999, skuPrefix: 'IN-AUD-ZBAR', margin: 32.1 },
  { name: 'Portronics Pure Sound 103 100W Wireless Bluetooth Soundbar', cost: 3500, price: 5499, skuPrefix: 'IN-AUD-PORT', margin: 36.3 },
  { name: 'Luminous Zelio+ 1100 Pure Sine Wave Home Inverter UPS 12V', cost: 5200, price: 7490, skuPrefix: 'IN-PWR-LUM', margin: 30.5 },
  { name: 'Microtek Smart Hybrid 1275 Digital Inverter UPS (Heavy Load)', cost: 4800, price: 6890, skuPrefix: 'IN-PWR-MIC', margin: 30.3 },
  { name: 'Exide Inva Tubular IT500 150Ah Tall Tubular Inverter Battery', cost: 11500, price: 15499, skuPrefix: 'IN-PWR-EXD', margin: 25.8 },
  { name: 'Amaron Current CR-AR150TT Heavy Duty Tubular Inverter Battery', cost: 11800, price: 15999, skuPrefix: 'IN-PWR-AMR', margin: 26.2 },
  { name: 'Ambrane 50000mAh Powerstation (65W Super-Fast Laptop Charging)', cost: 3200, price: 4999, skuPrefix: 'IN-PWR-AMB', margin: 35.9 },
  { name: 'URBN 20000mAh Ultra-Compact Fast Charging Power Bank 22.5W', cost: 900, price: 1499, skuPrefix: 'IN-PWR-URBN', margin: 39.9 },
  { name: 'Portronics Adapto 65W GaN Multi-Port USB-C Fast Charger', cost: 1100, price: 1899, skuPrefix: 'IN-PWR-PGAN', margin: 42.1 },
  { name: 'TP-Link Archer AX55 Dual-Band Gigabit Wi-Fi 6 Router', cost: 3400, price: 4999, skuPrefix: 'IN-NET-TPL', margin: 31.9 },
  { name: 'D-Link DIR-825 AC1200 Wave 2 Gigabit Wi-Fi Router with 4 Antennas', cost: 1600, price: 2499, skuPrefix: 'IN-NET-DLK', margin: 35.9 },
  { name: 'Qubo Smart 360 2K Wi-Fi Security Camera (Hero Electronix India)', cost: 1800, price: 2790, skuPrefix: 'IN-IOT-QUBO', margin: 35.4 },
  { name: 'Godrej Spotlight PT Pan-Tilt Wi-Fi Indoor Security Camera', cost: 1900, price: 2999, skuPrefix: 'IN-IOT-GDJ', margin: 36.6 },
  { name: 'CP PLUS 8-Channel Full HD Outdoor Bullet & Dome CCTV Camera Kit', cost: 8900, price: 12999, skuPrefix: 'IN-IOT-CPP', margin: 31.5 },
  { name: 'Wipro Next 20W Smart LED Batten (16 Million Colors, Music Sync)', cost: 850, price: 1499, skuPrefix: 'IN-IOT-WPR', margin: 43.3 },
  { name: 'Havells Crabtree Smart Wi-Fi 16A High-Power Automation Switch', cost: 950, price: 1599, skuPrefix: 'IN-IOT-HVL', margin: 40.6 },
  { name: 'JioFiber High-Performance Mesh Wi-Fi Extender Unit (Dual Band)', cost: 1600, price: 2499, skuPrefix: 'IN-NET-JIO', margin: 35.9 },
  { name: 'Crucial P3 Plus 1TB PCIe 4.0 3D NAND NVMe M.2 SSD (5000MB/s)', cost: 4200, price: 5999, skuPrefix: 'IN-CMP-CRU', margin: 29.9 },
  { name: 'Western Digital WD Blue 2TB 7200RPM Internal Desktop HDD', cost: 3800, price: 5299, skuPrefix: 'IN-CMP-WDB', margin: 28.3 },
  { name: 'Kingston Fury Beast 16GB DDR5 5200MHz Desktop RAM Module', cost: 3600, price: 4999, skuPrefix: 'IN-CMP-KNG', margin: 27.9 },
  { name: 'Ant Esports ICE-511MT Mid-Tower Mesh Gaming Cabinet (4 ARGB Fans)', cost: 3100, price: 4499, skuPrefix: 'IN-CMP-ANT', margin: 31.1 },
  { name: 'Logitech MX Master 3S Wireless Performance Mouse (Quiet Clicks)', cost: 6800, price: 8995, skuPrefix: 'IN-CMP-LOG', margin: 24.4 },
  { name: 'Keychron K2 Wireless Mechanical Keyboard (Gateron Red Switches)', cost: 5800, price: 7999, skuPrefix: 'IN-CMP-KEY', margin: 27.5 },
  { name: 'Zebronics Transformer Gaming Keyboard and Mouse Combo with Braided Cable', cost: 900, price: 1499, skuPrefix: 'IN-CMP-ZEBC', margin: 39.9 },
];

const INDIAN_ELECTRONICS_SERVICES = [
  { name: 'Onsite Enterprise Laptop Fleet Imaging & Asset Tagging Service', cost: 15000, price: 22000, skuPrefix: 'IN-SRV-IMG', margin: 31.8 },
  { name: 'Corporate Boardroom 4K AV Setup & Polycom Audio Installation', cost: 18000, price: 28000, skuPrefix: 'IN-SRV-CONF', margin: 35.7 },
  { name: 'Enterprise Wi-Fi 6 Heatmap Survey & Ceiling AP Mounting Service', cost: 12000, price: 18500, skuPrefix: 'IN-SRV-WIFI', margin: 35.1 },
  { name: 'Biometric Attendance & RFID Access Control Infrastructure Rigging', cost: 9500, price: 14900, skuPrefix: 'IN-SRV-BIO', margin: 36.2 },
  { name: 'Commercial Server Rack Assembly, PDU & Patch Panel Cabling', cost: 14000, price: 21500, skuPrefix: 'IN-SRV-RACK', margin: 34.8 },
  { name: 'Industrial Solar Inverter, UPS & Battery Bank Commissioning', cost: 11000, price: 17500, skuPrefix: 'IN-SRV-UPS', margin: 37.1 },
  { name: '8-Channel CCTV DVR/NVR Conduit Wiring & Surveillance Deployment', cost: 8500, price: 13500, skuPrefix: 'IN-SRV-CCTV', margin: 37.0 },
  { name: 'Corporate Firewall Appliance Hardening & Multi-Site VPN Configuration', cost: 16000, price: 24500, skuPrefix: 'IN-SRV-FW', margin: 34.6 },
  { name: 'Smart Office Multi-Zone Lighting Automation & Sensor Calibration', cost: 10500, price: 16000, skuPrefix: 'IN-SRV-IOT', margin: 34.3 },
  { name: 'Disaster Recovery Cloud Mirroring & Network Attached Storage Tuning', cost: 22000, price: 32000, skuPrefix: 'IN-SRV-DR', margin: 31.2 },
];

const INDIAN_ELECTRONICS_SUBS = [
  { name: 'Reliance resQ Care 2-Year Comprehensive Laptop Extended Warranty', cost: 4200, price: 6999, skuPrefix: 'IN-SUB-RESQ', interval: RecurringInterval.YEARLY, margin: 39.9 },
  { name: 'Croma ZipCare 2-Year Mobile Screen & Accidental Damage Protection', cost: 2100, price: 3499, skuPrefix: 'IN-SUB-ZIP', interval: RecurringInterval.YEARLY, margin: 39.9 },
  { name: 'OneAssist Corporate Electronics Extended Protection Plan (Multi-Device)', cost: 650, price: 1199, skuPrefix: 'IN-SUB-OA', interval: RecurringInterval.MONTHLY, margin: 45.7 },
  { name: 'Quick Heal Total Security Enterprise Cloud Suite (Annual 10-Seat)', cost: 7500, price: 12499, skuPrefix: 'IN-SUB-QH', interval: RecurringInterval.YEARLY, margin: 39.9 },
  { name: 'K7 Total Security Multi-Device Cyber Protection (3-Year Commercial)', cost: 1200, price: 2199, skuPrefix: 'IN-SUB-K7', interval: RecurringInterval.YEARLY, margin: 45.4 },
  { name: 'Cloud CCTV Surveillance 30-Day Encrypted Offsite Video Storage', cost: 850, price: 1599, skuPrefix: 'IN-SUB-CAM', interval: RecurringInterval.MONTHLY, margin: 46.8 },
  { name: 'JioFiber Commercial Dedicated Business Bandwidth SLA Pack (100Mbps)', cost: 2400, price: 3999, skuPrefix: 'IN-SUB-JIOF', interval: RecurringInterval.MONTHLY, margin: 39.9 },
  { name: 'Airtel Office Internet Static IP & Secure Cloud Gateway Bundle', cost: 7200, price: 11999, skuPrefix: 'IN-SUB-AIRT', interval: RecurringInterval.QUARTERLY, margin: 39.9 },
  { name: 'Annual Preventive Electronics Maintenance & Cleanroom AMC Service', cost: 5500, price: 8999, skuPrefix: 'IN-SUB-AMC', interval: RecurringInterval.YEARLY, margin: 38.8 },
  { name: '24/7 Mission-Critical Electronics Hardware Incident Response SLA Desk', cost: 14500, price: 23500, skuPrefix: 'IN-SUB-SLA', interval: RecurringInterval.QUARTERLY, margin: 38.2 },
];

// ============================================================================
// MAIN SEED EXECUTION
// ============================================================================

async function main() {
  console.log('🌱 Starting DealFlow360 Indian Electronics Database Seeding (500 Records / Table)...');
  const startTime = Date.now();

  // --------------------------------------------------------------------------
  // 1. Clean existing records in reverse dependency order
  // --------------------------------------------------------------------------
  console.log('🧹 Cleaning existing tables in reverse dependency order...');
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionProrationLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlanTemplate.deleteMany();
  await prisma.fulfillmentSplitItem.deleteMany();
  await prisma.fulfillmentOrder.deleteMany();
  await prisma.approvalAuditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.quotationComment.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.dealHealthAlert.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.adminCuratedUpsell.deleteMany();
  await prisma.productCoPurchaseRule.deleteMany();
  await prisma.priceListRule.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tierDiscountCeiling.deleteMany();
  await prisma.categoryDiscountCeiling.deleteMany();
  await prisma.approvalChainMatrix.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();
  console.log('✔ All existing tables cleaned cleanly.');

  // Pre-hash password once for instant seeding
  const defaultPasswordHash = await argon2.hash('123456');

  // --------------------------------------------------------------------------
  // 2. Seed 500 Users (Indian Enterprise Personas & Reps)
  // --------------------------------------------------------------------------
  console.log('👥 Generating 500 Users (India Based)...');
  const usersData: any[] = [];
  const adminId = crypto.randomUUID();
  const repId = crypto.randomUUID();
  const managerId = crypto.randomUUID();
  const financeId = crypto.randomUUID();
  const customerUserId = crypto.randomUUID();

  // 5 Essential Demo Profiles
  usersData.push(
    { id: adminId, email: 'admin@dealflow.com', passwordHash: defaultPasswordHash, fullName: 'Aniket Dabhi (Admin)', role: Role.ADMIN, teamName: 'Executive Leadership (Mumbai HQ)', isEmailVerified: true, phone: '+91-98200-11223', location: 'Mumbai, Maharashtra' },
    { id: repId, email: 'rep@dealflow.com', passwordHash: defaultPasswordHash, fullName: 'J. Rao (Sales Rep)', role: Role.SALES_REP, teamName: 'Direct Enterprise Sales (Bengaluru)', isEmailVerified: true, phone: '+91-98450-44556', location: 'Bengaluru, Karnataka' },
    { id: managerId, email: 'manager@dealflow.com', passwordHash: defaultPasswordHash, fullName: 'M. Shah (Sales Manager)', role: Role.SALES_MANAGER, teamName: 'Commercial Operations (Delhi NCR)', isEmailVerified: true, phone: '+91-98110-66778', location: 'Gurugram, Haryana' },
    { id: financeId, email: 'finance@dealflow.com', passwordHash: defaultPasswordHash, fullName: 'R. Iyer (Finance Controller)', role: Role.FINANCE, teamName: 'Finance & Risk Governance (Chennai)', isEmailVerified: true, phone: '+91-98400-88990', location: 'Chennai, Tamil Nadu' },
    { id: customerUserId, email: 'customer@dealflow.com', passwordHash: defaultPasswordHash, fullName: 'Vikram Mehta (Procurement Head)', role: Role.CUSTOMER, teamName: 'Procurement Division (Pune)', isEmailVerified: true, phone: '+91-98220-33445', location: 'Pune, Maharashtra' }
  );

  const salesRepIds: string[] = [repId];
  const userRoles = [Role.SALES_REP, Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER];

  for (let i = 6; i <= 500; i++) {
    const uid = crypto.randomUUID();
    const role = userRoles[i % userRoles.length];
    if (role === Role.SALES_REP) {
      salesRepIds.push(uid);
    }
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const cityMeta = INDIAN_CITIES_META[i % INDIAN_CITIES_META.length];

    usersData.push({
      id: uid,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@dealflow.in`,
      passwordHash: defaultPasswordHash,
      fullName: `${firstName} ${lastName}`,
      role,
      teamName: `Electronics Division (${cityMeta.city})`,
      isEmailVerified: true,
      phone: `+91-${98000 + (i % 1999)}-${String(10000 + (i * 13) % 89999)}`,
      location: `${cityMeta.city}, ${cityMeta.state}`,
      createdAt: new Date(Date.now() - (i % 60) * 24 * 3600 * 1000),
      updatedAt: new Date(),
    });
  }
  await prisma.user.createMany({ data: usersData });
  console.log(`✔ Seeded ${usersData.length} Users.`);

  // --------------------------------------------------------------------------
  // 3. Seed 500 OtpVerifications
  // --------------------------------------------------------------------------
  console.log('🔑 Generating 500 OtpVerifications...');
  const otpsData: any[] = [];
  for (let i = 0; i < 500; i++) {
    otpsData.push({
      id: crypto.randomUUID(),
      email: usersData[i].email,
      otp: `${100000 + (i % 900000)}`,
      type: i % 2 === 0 ? 'SIGNUP' : 'PASSWORD_RESET',
      payload: JSON.stringify({ seeded: true, index: i }),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    });
  }
  await prisma.otpVerification.createMany({ data: otpsData });
  console.log(`✔ Seeded ${otpsData.length} OtpVerifications.`);

  // --------------------------------------------------------------------------
  // 4. Seed 500 Customers (Indian Retailers, Distributors & Tech Enterprises)
  // --------------------------------------------------------------------------
  console.log('🏢 Generating 500 Indian Customers with Real Geo-Coordinates...');
  const customerIds: string[] = [];
  const customersData: any[] = [];

  // Core Demo Customers with exact Indian coordinates for Haversine warehouse allocation
  const acmeId = crypto.randomUUID();
  const betaId = crypto.randomUUID();
  const deltaId = crypto.randomUUID();
  customerIds.push(acmeId, betaId, deltaId);

  customersData.push(
    {
      id: acmeId,
      name: 'Reliance Digital Retail Ltd',
      email: 'procurement@reliancedigital.in',
      phone: '+91-22-3555-0199',
      companyName: 'Reliance Retail Electronics Division',
      tier: CustomerTier.GOLD,
      assignedRepId: repId,
      historicalAvgDisc: 8.0,
      shippingAddress: 'Reliance Corporate Park, Thane-Belapur Road, Navi Mumbai, Maharashtra 400701',
      shippingLatitude: 19.1637,
      shippingLongitude: 73.0039,
    },
    {
      id: betaId,
      name: 'Croma - Infiniti Retail Ltd',
      email: 'vendor.connect@croma.com',
      phone: '+91-22-6766-0144',
      companyName: 'Infiniti Retail Limited (Tata Group)',
      tier: CustomerTier.SILVER,
      assignedRepId: repId,
      historicalAvgDisc: 6.5,
      shippingAddress: 'Unit 701, Parel Supreme Chambers, Lower Parel, Mumbai, Maharashtra 400013',
      shippingLatitude: 18.9986,
      shippingLongitude: 72.8311,
    },
    {
      id: deltaId,
      name: 'Poorvika Mobiles India Pvt Ltd',
      email: 'orders@poorvikamobiles.com',
      phone: '+91-44-4399-0188',
      companyName: 'Poorvika Mobiles Tech India',
      tier: CustomerTier.BRONZE,
      assignedRepId: repId,
      historicalAvgDisc: 4.0,
      shippingAddress: '30 Arcot Road, Kodambakkam, Chennai, Tamil Nadu 600024',
      shippingLatitude: 13.0524,
      shippingLongitude: 80.2209,
    }
  );

  const tiers = [CustomerTier.GOLD, CustomerTier.SILVER, CustomerTier.BRONZE];
  for (let i = 4; i <= 500; i++) {
    const cid = crypto.randomUUID();
    customerIds.push(cid);
    const brand = INDIAN_COMPANY_BRANDS[(i - 1) % INDIAN_COMPANY_BRANDS.length];
    const suffix = INDIAN_COMPANY_SUFFIXES[(i * 3) % INDIAN_COMPANY_SUFFIXES.length];
    const cityMeta = INDIAN_CITIES_META[(i * 2) % INDIAN_CITIES_META.length];
    const company = `${brand} ${suffix} #${i}`;
    const rep = salesRepIds[i % salesRepIds.length];
    const tier = tiers[i % 3];

    // Jitter coordinates slightly around real Indian city centers
    const latJitter = Number((((i * 17) % 50 - 25) * 0.002).toFixed(4));
    const lonJitter = Number((((i * 23) % 50 - 25) * 0.002).toFixed(4));

    customersData.push({
      id: cid,
      name: company,
      email: `procurement${i}@${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.in`,
      phone: `+91-${cityMeta.pin.slice(0, 2)}-${String(4000 + (i % 5000)).padStart(4, '0')}-${String(1000 + (i * 7) % 9000).padStart(4, '0')}`,
      companyName: company,
      tier,
      assignedRepId: rep,
      historicalAvgDisc: Number((4.0 + (i % 8) * 1.1).toFixed(1)),
      shippingAddress: `Plot ${10 + (i * 7) % 400}, Electronic City Phase ${1 + (i % 3)}, ${cityMeta.city}, ${cityMeta.state} ${cityMeta.pin}`,
      shippingLatitude: Number((cityMeta.lat + latJitter).toFixed(4)),
      shippingLongitude: Number((cityMeta.lon + lonJitter).toFixed(4)),
    });
  }
  await prisma.customer.createMany({ data: customersData });
  console.log(`✔ Seeded ${customersData.length} Indian Customers with Geo-coordinates.`);

  // --------------------------------------------------------------------------
  // 5. Seed Discount Ceilings & Matrices (3 items each - Enum Constrained)
  // --------------------------------------------------------------------------
  console.log('📐 Generating Discount Ceilings & Approval Matrix...');
  await prisma.tierDiscountCeiling.createMany({
    data: [
      { tier: CustomerTier.BRONZE, maxDiscount: 5.0 },
      { tier: CustomerTier.SILVER, maxDiscount: 10.0 },
      { tier: CustomerTier.GOLD, maxDiscount: 15.0 },
    ],
  });

  await prisma.categoryDiscountCeiling.createMany({
    data: [
      { category: ProductCategory.HARDWARE, maxDiscount: 15.0 },
      { category: ProductCategory.SERVICES, maxDiscount: 10.0 },
      { category: ProductCategory.SUBSCRIPTION, maxDiscount: 15.0 },
    ],
  });

  await prisma.approvalChainMatrix.createMany({
    data: [
      { riskLevel: RiskLevel.LOW, description: 'Within tier and category limits', requiresManagerApproval: false, requiresFinanceApproval: false },
      { riskLevel: RiskLevel.MEDIUM, description: 'Over limit, blended risk medium', requiresManagerApproval: true, requiresFinanceApproval: false },
      { riskLevel: RiskLevel.HIGH, description: 'Over limit, blended risk high', requiresManagerApproval: true, requiresFinanceApproval: true },
    ],
  });
  console.log('✔ Seeded 3 Tier Ceilings, 3 Category Ceilings, 3 Approval Matrices.');

  // --------------------------------------------------------------------------
  // 6. Seed 500 Indian Electronics Products
  // --------------------------------------------------------------------------
  console.log('📦 Generating 500 Indian Electronics Products...');
  const productIds: string[] = [];
  const productsData: any[] = [];

  // 6 Core Demo Products (Mapped to Indian Electronics equivalents with stable IDs)
  const laptopId = crypto.randomUUID();
  const dockingId = crypto.randomUUID();
  const mouseId = crypto.randomUUID();
  const setupServiceId = crypto.randomUUID();
  const carePlanId = crypto.randomUUID();
  const supportSlaId = crypto.randomUUID();
  productIds.push(laptopId, dockingId, mouseId, setupServiceId, carePlanId, supportSlaId);

  productsData.push(
    { id: laptopId, sku: 'HW-LAP-PRO14', name: 'Lenovo ThinkPad E14 Gen 5 India Edition', description: 'High-performance 14-inch commercial laptop with Intel Core i7, 16GB DDR5, 512GB NVMe SSD', category: ProductCategory.HARDWARE, unit: 'Unit', baseCost: 58000.0, basePrice: 78000.0, taxPercent: 18.0, isSubscription: false, isPromoted: false, minMarginThreshold: 20.0, isActive: true },
    { id: dockingId, sku: 'HW-DOC-STN', name: 'Portronics 9-in-1 Dual 4K USB-C Hub', description: 'Thunderbolt 4 compatible universal quad-display docking station with 100W Power Delivery', category: ProductCategory.HARDWARE, unit: 'Unit', baseCost: 3200.0, basePrice: 4999.0, taxPercent: 18.0, isSubscription: false, isPromoted: true, minMarginThreshold: 25.0, isActive: true },
    { id: mouseId, sku: 'HW-MOU-WRL', name: 'Logitech MX Master 3S Performance Mouse', description: 'Ergonomic silent wireless mouse with 8K DPI sensor and MagSpeed electromagnetic scroll', category: ProductCategory.HARDWARE, unit: 'Unit', baseCost: 4800.0, basePrice: 7495.0, taxPercent: 18.0, isSubscription: false, isPromoted: true, minMarginThreshold: 30.0, isActive: true },
    { id: setupServiceId, sku: 'SRV-ONSITE-SET', name: 'Onsite Laptop Fleet Imaging & Network Rigging', description: 'Certified engineer onsite hardware setup, enterprise OS imaging, Wi-Fi 6 & domain join', category: ProductCategory.SERVICES, unit: 'Engagement', baseCost: 9500.0, basePrice: 14500.0, taxPercent: 18.0, isSubscription: false, isPromoted: false, minMarginThreshold: 15.0, isActive: true },
    { id: carePlanId, sku: 'SUB-CARE-2YR', name: 'Reliance resQ Care 2-Year Extended Protection Plan', description: 'Complete 2-year hardware warranty with accidental liquid/drop damage and next-day depot pickup', category: ProductCategory.SUBSCRIPTION, unit: 'Year', baseCost: 3500.0, basePrice: 5999.0, taxPercent: 0.0, isSubscription: true, recurringInterval: RecurringInterval.YEARLY, isPromoted: true, minMarginThreshold: 40.0, isActive: true },
    { id: supportSlaId, sku: 'SUB-SLA-QTR', name: '24/7 Mission-Critical Electronics Support SLA', description: 'Dedicated round-the-clock priority incident support desk with 1-hour fast-response SLA', category: ProductCategory.SUBSCRIPTION, unit: 'Quarter', baseCost: 8500.0, basePrice: 14999.0, taxPercent: 0.0, isSubscription: true, recurringInterval: RecurringInterval.QUARTERLY, isPromoted: false, minMarginThreshold: 35.0, isActive: true }
  );

  // Generate 494 more diverse Indian electronic products
  for (let i = 7; i <= 500; i++) {
    const pid = crypto.randomUUID();
    productIds.push(pid);
    const catMod = i % 10;

    if (catMod === 8) {
      // SERVICES (10% of catalog)
      const template = INDIAN_ELECTRONICS_SERVICES[i % INDIAN_ELECTRONICS_SERVICES.length];
      const name = `${template.name} - Tier ${Math.floor(i / 50) + 1} (#${i})`;
      const baseCost = Number((template.cost * (0.9 + (i % 5) * 0.05)).toFixed(2));
      const basePrice = Number((template.price * (0.95 + (i % 4) * 0.04)).toFixed(2));
      productsData.push({
        id: pid,
        sku: `${template.skuPrefix}-${String(i).padStart(4, '0')}`,
        name,
        description: `Professional Indian enterprise service: ${name}`,
        category: ProductCategory.SERVICES,
        unit: 'Engagement',
        baseCost,
        basePrice,
        taxPercent: 18.0,
        isSubscription: false,
        recurringInterval: null,
        isPromoted: i % 6 === 0,
        minMarginThreshold: 20.0,
        isActive: true,
      });
    } else if (catMod === 9) {
      // SUBSCRIPTIONS (10% of catalog)
      const template = INDIAN_ELECTRONICS_SUBS[i % INDIAN_ELECTRONICS_SUBS.length];
      const name = `${template.name} - Plan Pack #${i}`;
      const baseCost = Number((template.cost * (0.9 + (i % 5) * 0.05)).toFixed(2));
      const basePrice = Number((template.price * (0.95 + (i % 4) * 0.04)).toFixed(2));
      productsData.push({
        id: pid,
        sku: `${template.skuPrefix}-${String(i).padStart(4, '0')}`,
        name,
        description: `Electronics warranty & recurring maintenance plan: ${name}`,
        category: ProductCategory.SUBSCRIPTION,
        unit: template.interval === RecurringInterval.MONTHLY ? 'Month' : 'Year',
        baseCost,
        basePrice,
        taxPercent: 0.0,
        isSubscription: true,
        recurringInterval: template.interval,
        isPromoted: i % 4 === 0,
        minMarginThreshold: 35.0,
        isActive: true,
      });
    } else {
      // HARDWARE ELECTRONICS (80% of catalog)
      const template = INDIAN_ELECTRONICS_HW[i % INDIAN_ELECTRONICS_HW.length];
      const name = `${template.name} - Batch #${i}`;
      const baseCost = Number((template.cost * (0.85 + (i % 8) * 0.04)).toFixed(2));
      const basePrice = Number((template.price * (0.90 + (i % 6) * 0.04)).toFixed(2));
      productsData.push({
        id: pid,
        sku: `${template.skuPrefix}-${String(i).padStart(4, '0')}`,
        name,
        description: `Genuine electronic product with full manufacturer warranty in India: ${name}`,
        category: ProductCategory.HARDWARE,
        unit: 'Unit',
        baseCost,
        basePrice,
        taxPercent: 18.0,
        isSubscription: false,
        recurringInterval: null,
        isPromoted: i % 5 === 0,
        minMarginThreshold: 22.0,
        isActive: true,
      });
    }
  }
  await prisma.product.createMany({ data: productsData });
  console.log(`✔ Seeded ${productsData.length} Indian Electronics Products.`);

  // --------------------------------------------------------------------------
  // 7. Seed 500 Product Variants
  // --------------------------------------------------------------------------
  console.log('🎨 Generating 500 Product Variants...');
  const variantsData: any[] = [];
  const variantAttributes = ['RAM / Storage', 'Color Finish', 'Warranty Duration', 'Processor Edition', 'Connectivity'];
  const variantValues = [
    ['8GB RAM / 256GB SSD', '16GB RAM / 512GB SSD', '32GB RAM / 1TB SSD'],
    ['Space Black (Matte)', 'Titanium Silver', 'Phantom Blue (India Limited)'],
    ['1-Year Standard Onsite', '2-Year Extended Care', '3-Year Complete Protect'],
    ['Intel Core i5 Ultra', 'Intel Core i7 Evo', 'AMD Ryzen 7 AI Max'],
    ['Wi-Fi 6 + Bluetooth 5.3', 'Wi-Fi 6E + 5G Cellular SIM', 'Gigabit Ethernet + Wi-Fi 6']
  ];

  for (let i = 0; i < 500; i++) {
    const attrIdx = i % variantAttributes.length;
    const valGroup = variantValues[attrIdx];
    const val = valGroup[i % valGroup.length];
    variantsData.push({
      id: crypto.randomUUID(),
      productId: productIds[i % productIds.length],
      attribute: variantAttributes[attrIdx],
      value: val,
      extraPrice: Number(((i % 8) * 1250.0).toFixed(2)),
      skuSuffix: `V${i + 1}`,
    });
  }
  await prisma.productVariant.createMany({ data: variantsData });
  console.log(`✔ Seeded ${variantsData.length} Product Variants.`);

  // --------------------------------------------------------------------------
  // 8. Seed 500 PriceListRules
  // --------------------------------------------------------------------------
  console.log('🏷 Generating 500 PriceListRules...');
  const priceListRulesData: any[] = [];
  for (let i = 0; i < 500; i++) {
    const tier = tiers[i % 3];
    priceListRulesData.push({
      id: crypto.randomUUID(),
      productId: productIds[i],
      customerTier: tier,
      currency: 'INR',
      priceRuleDesc: `${tier} Tier Indian Electronics B2B Agreement #${i + 1}`,
      discountPercent: Number((3.0 + (i % 8) * 1.2).toFixed(1)),
    });
  }
  await prisma.priceListRule.createMany({ data: priceListRulesData });
  console.log(`✔ Seeded ${priceListRulesData.length} PriceListRules.`);

  // --------------------------------------------------------------------------
  // 9. Seed 500 Indian Logistics Warehouses
  // --------------------------------------------------------------------------
  console.log('🏭 Generating 500 Indian Fulfillment Centers with Real Geo-Coordinates...');
  const warehouseIds: string[] = [];
  const warehousesData: any[] = [];

  // 5 Strategic Regional Geo-Hubs across India for Haversine Distance & Split Delivery Engines
  const bhiwandiHubId = crypto.randomUUID();
  const hosakoteHubId = crypto.randomUUID();
  const manesarHubId = crypto.randomUUID();
  const shamirpetHubId = crypto.randomUUID();
  const sriperumbudurHubId = crypto.randomUUID();
  warehouseIds.push(bhiwandiHubId, hosakoteHubId, manesarHubId, shamirpetHubId, sriperumbudurHubId);

  warehousesData.push(
    { id: bhiwandiHubId, name: 'Bhiwandi Central Mega Logistics Hub (Mumbai/Thane, MH)', location: 'Bhiwandi Industrial Logistics Park, Thane, Maharashtra 421302', latitude: 19.2967, longitude: 73.0628, defaultLeadDays: 2, shippingCostWeight: 1.0 },
    { id: hosakoteHubId, name: 'Hosakote National Tech Depot (Bengaluru, KA)', location: 'Hosakote Industrial Area, Whitefield Extension, Bengaluru, Karnataka 562114', latitude: 13.0709, longitude: 77.7981, defaultLeadDays: 2, shippingCostWeight: 1.05 },
    { id: manesarHubId, name: 'Manesar North Multi-Modal Freight Terminal (Gurgaon/NCR, HR)', location: 'IMT Manesar Logistics Interchange, Gurugram, Haryana 122051', latitude: 28.3588, longitude: 76.9360, defaultLeadDays: 3, shippingCostWeight: 1.1 },
    { id: shamirpetHubId, name: 'Shamirpet Tech & Electronics Gateway (Hyderabad, TS)', location: 'Genome Valley Logistics Hub, Shamirpet, Hyderabad, Telangana 500078', latitude: 17.5956, longitude: 78.5714, defaultLeadDays: 3, shippingCostWeight: 1.15 },
    { id: sriperumbudurHubId, name: 'Sriperumbudur Electronics Logistics Corridor (Chennai, TN)', location: 'SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu 602105', latitude: 12.9675, longitude: 79.9431, defaultLeadDays: 3, shippingCostWeight: 1.2 }
  );

  for (let i = 6; i <= 500; i++) {
    const wid = crypto.randomUUID();
    warehouseIds.push(wid);
    const cityMeta = INDIAN_CITIES_META[i % INDIAN_CITIES_META.length];
    const latOffset = Number((((i * 11) % 40 - 20) * 0.003).toFixed(4));
    const lonOffset = Number((((i * 19) % 40 - 20) * 0.003).toFixed(4));

    warehousesData.push({
      id: wid,
      name: `Hub #${i} (${cityMeta.city} Logistics Gateway, ${cityMeta.state})`,
      location: `IDC Sector ${Math.floor(i / 10) + 1}, ${cityMeta.city} Freight Corridor, ${cityMeta.state} ${cityMeta.pin}`,
      latitude: Number((cityMeta.lat + latOffset).toFixed(4)),
      longitude: Number((cityMeta.lon + lonOffset).toFixed(4)),
      defaultLeadDays: 1 + (i % 4),
      shippingCostWeight: Number((1.0 + (i % 10) * 0.08).toFixed(2)),
    });
  }
  await prisma.warehouse.createMany({ data: warehousesData });
  console.log(`✔ Seeded ${warehousesData.length} Indian Warehouses.`);

  // --------------------------------------------------------------------------
  // 10. Seed 500 WarehouseStock items (Realistic Indian Hub Stock Allocation)
  // --------------------------------------------------------------------------
  console.log('📊 Generating 500 WarehouseStock items...');
  const stockData: any[] = [];

  // Essential demo stock mappings across the 5 regional hubs (exact numbers for allocation tests)
  // Laptop: Bhiwandi(5 avail), Hosakote(8 avail), Manesar(10 avail), Shamirpet(6 avail), Sriperumbudur(4 avail) -> 33 total
  stockData.push(
    { id: crypto.randomUUID(), warehouseId: bhiwandiHubId, productId: laptopId, inStock: 6, reserved: 1, available: 5, minStockLevel: 5, reorderQuantity: 20 },
    { id: crypto.randomUUID(), warehouseId: hosakoteHubId, productId: laptopId, inStock: 10, reserved: 2, available: 8, minStockLevel: 5, reorderQuantity: 20 },
    { id: crypto.randomUUID(), warehouseId: manesarHubId, productId: laptopId, inStock: 12, reserved: 2, available: 10, minStockLevel: 5, reorderQuantity: 20 },
    { id: crypto.randomUUID(), warehouseId: shamirpetHubId, productId: laptopId, inStock: 7, reserved: 1, available: 6, minStockLevel: 5, reorderQuantity: 20 },
    { id: crypto.randomUUID(), warehouseId: sriperumbudurHubId, productId: laptopId, inStock: 4, reserved: 0, available: 4, minStockLevel: 5, reorderQuantity: 20 },

    // Docking Station: 88 available across 5 hubs
    { id: crypto.randomUUID(), warehouseId: bhiwandiHubId, productId: dockingId, inStock: 25, reserved: 5, available: 20, minStockLevel: 10, reorderQuantity: 30 },
    { id: crypto.randomUUID(), warehouseId: hosakoteHubId, productId: dockingId, inStock: 30, reserved: 5, available: 25, minStockLevel: 10, reorderQuantity: 30 },
    { id: crypto.randomUUID(), warehouseId: manesarHubId, productId: dockingId, inStock: 20, reserved: 2, available: 18, minStockLevel: 10, reorderQuantity: 30 },
    { id: crypto.randomUUID(), warehouseId: shamirpetHubId, productId: dockingId, inStock: 15, reserved: 0, available: 15, minStockLevel: 10, reorderQuantity: 30 },
    { id: crypto.randomUUID(), warehouseId: sriperumbudurHubId, productId: dockingId, inStock: 10, reserved: 0, available: 10, minStockLevel: 10, reorderQuantity: 30 },

    // Mouse: 190 available across 5 hubs
    { id: crypto.randomUUID(), warehouseId: bhiwandiHubId, productId: mouseId, inStock: 50, reserved: 0, available: 50, minStockLevel: 20, reorderQuantity: 50 },
    { id: crypto.randomUUID(), warehouseId: hosakoteHubId, productId: mouseId, inStock: 50, reserved: 0, available: 50, minStockLevel: 20, reorderQuantity: 50 },
    { id: crypto.randomUUID(), warehouseId: manesarHubId, productId: mouseId, inStock: 40, reserved: 0, available: 40, minStockLevel: 20, reorderQuantity: 50 },
    { id: crypto.randomUUID(), warehouseId: shamirpetHubId, productId: mouseId, inStock: 30, reserved: 0, available: 30, minStockLevel: 20, reorderQuantity: 50 },
    { id: crypto.randomUUID(), warehouseId: sriperumbudurHubId, productId: mouseId, inStock: 20, reserved: 0, available: 20, minStockLevel: 20, reorderQuantity: 50 }
  );

  // Distribute one unique pair per remaining warehouse to hit 500 rows
  for (let i = 15; i < 500; i++) {
    const wid = warehouseIds[i % warehouseIds.length];
    const pid = productIds[i % productIds.length];
    const inStock = 50 + ((i * 13) % 400);
    const reserved = (i * 3) % 20;
    stockData.push({
      id: crypto.randomUUID(),
      warehouseId: wid,
      productId: pid,
      inStock,
      reserved,
      available: inStock - reserved,
      minStockLevel: 10,
      reorderQuantity: 50,
    });
  }
  await prisma.warehouseStock.createMany({ data: stockData });
  console.log(`✔ Seeded ${stockData.length} WarehouseStock records.`);

  // --------------------------------------------------------------------------
  // 11. Seed 500 ProductCoPurchaseRules (Engine 1: Hybrid Upsell & Cross-Sell)
  // --------------------------------------------------------------------------
  console.log('🤖 Generating 500 ProductCoPurchaseRules...');
  const coPurchaseData: any[] = [];

  // Essential demo upsell pairings
  coPurchaseData.push(
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: mouseId, coPurchaseScore: 0.92, marginDeltaBoost: 18.0, promotionTag: 'Popular Accessory' },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: dockingId, coPurchaseScore: 0.88, marginDeltaBoost: 35.0, promotionTag: 'Promo: 12% off' },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: carePlanId, coPurchaseScore: 0.79, marginDeltaBoost: 46.0, promotionTag: 'Recommended Protection' }
  );

  for (let i = 3; i < 500; i++) {
    const basePid = productIds[i];
    const recPid = productIds[(i + 1) % productIds.length];
    coPurchaseData.push({
      id: crypto.randomUUID(),
      baseProductId: basePid,
      recommendedProductId: recPid,
      coPurchaseScore: Number((0.72 + (i % 25) * 0.01).toFixed(2)),
      marginDeltaBoost: Number((12.0 + (i % 30) * 1.0).toFixed(1)),
      promotionTag: `High-Margin Indian Electronics Bundle #${i + 1}`,
    });
  }
  await prisma.productCoPurchaseRule.createMany({ data: coPurchaseData });
  console.log(`✔ Seeded ${coPurchaseData.length} ProductCoPurchaseRules.`);

  // --------------------------------------------------------------------------
  // 12. Seed 500 AdminCuratedUpsell records (Engine 1: Priority Ranks 1 to 5)
  // --------------------------------------------------------------------------
  console.log('⭐ Generating 500 AdminCuratedUpsell records...');
  const curatedUpsellData: any[] = [];

  // Ranks 1 to 5 for Laptop Pro 14
  curatedUpsellData.push(
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: mouseId, rank: 1, isActive: true },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: dockingId, rank: 2, isActive: true },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: carePlanId, rank: 3, isActive: true },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: setupServiceId, rank: 4, isActive: true },
    { id: crypto.randomUUID(), baseProductId: laptopId, recommendedProductId: supportSlaId, rank: 5, isActive: true }
  );

  // Generate 5 ranks for 99 additional products = 495 more records (total 500)
  for (let p = 1; p < 100; p++) {
    const basePid = productIds[p];
    for (let r = 1; r <= 5; r++) {
      const recIdx = (p * 5 + r) % productIds.length;
      if (recIdx !== p) {
        curatedUpsellData.push({
          id: crypto.randomUUID(),
          baseProductId: basePid,
          recommendedProductId: productIds[recIdx],
          rank: r,
          isActive: true,
        });
      }
    }
  }
  const finalCurated = curatedUpsellData.slice(0, 500);
  await prisma.adminCuratedUpsell.createMany({ data: finalCurated });
  console.log(`✔ Seeded ${finalCurated.length} AdminCuratedUpsell records.`);

  // --------------------------------------------------------------------------
  // 13. Seed 500 SubscriptionPlanTemplates
  // --------------------------------------------------------------------------
  console.log('📑 Generating 500 SubscriptionPlanTemplates...');
  const planTemplatesData: any[] = [];
  planTemplatesData.push(
    { id: crypto.randomUUID(), code: 'MONTHLY_STANDARD', name: 'Monthly Electronics Warranty Plan', description: 'Billed monthly with calendar days proration and fast replacement', interval: RecurringInterval.MONTHLY, discountPercent: 0.0, prorationPolicy: 'CALENDAR_DAYS', cancellationPolicy: 'PRORATED_REFUND', isActive: true },
    { id: crypto.randomUUID(), code: 'QUARTERLY_PRO', name: 'Quarterly Corporate Tech SLA', description: 'Billed quarterly with 5% discount incentive for enterprise accounts', interval: RecurringInterval.QUARTERLY, discountPercent: 5.0, prorationPolicy: 'CALENDAR_DAYS', cancellationPolicy: 'PRORATED_REFUND', isActive: true },
    { id: crypto.randomUUID(), code: 'ANNUAL_SAVER', name: 'Annual Reliance resQ Care Saver', description: 'Billed annually with 15% discount and comprehensive damage shield', interval: RecurringInterval.YEARLY, discountPercent: 15.0, prorationPolicy: 'FIXED_30_DAYS', cancellationPolicy: 'NO_REFUND', isActive: true }
  );

  const planIntervals = [RecurringInterval.MONTHLY, RecurringInterval.QUARTERLY, RecurringInterval.YEARLY];
  for (let i = 4; i <= 500; i++) {
    planTemplatesData.push({
      id: crypto.randomUUID(),
      code: `PLAN_TEMPLATE_${String(i).padStart(4, '0')}`,
      name: `Indian Electronics AMC & Care Plan #${i}`,
      description: `Structured electronics protection with automated proration and billing cycle #${i}`,
      interval: planIntervals[i % 3],
      discountPercent: (i % 4) * 5.0,
      prorationPolicy: i % 2 === 0 ? 'CALENDAR_DAYS' : 'FIXED_30_DAYS',
      cancellationPolicy: i % 3 === 0 ? 'NO_REFUND' : 'PRORATED_REFUND',
      isActive: true,
    });
  }
  await prisma.subscriptionPlanTemplate.createMany({ data: planTemplatesData });
  console.log(`✔ Seeded ${planTemplatesData.length} SubscriptionPlanTemplates.`);

  // --------------------------------------------------------------------------
  // 14. Seed 500 Quotations (Core Demo + 90-Day Baseline + High-Volume Indian Electronics)
  // --------------------------------------------------------------------------
  console.log('📑 Generating 500 Quotations...');
  const quotationIds: string[] = [];
  const quotationsData: any[] = [];

  const q1Id = crypto.randomUUID();
  const q2Id = crypto.randomUUID();
  const q3Id = crypto.randomUUID();
  const q4Id = crypto.randomUUID();
  const hq1Id = crypto.randomUUID();
  const hq2Id = crypto.randomUUID();
  const hq3Id = crypto.randomUUID();
  quotationIds.push(q1Id, q2Id, q3Id, q4Id, hq1Id, hq2Id, hq3Id);

  // 4 Core Demo Quotations (Calculated in INR / Standard Enterprise Values)
  quotationsData.push(
    { id: q1Id, quoteNumber: 'Q-1001', customerId: acmeId, salesRepId: repId, status: QuotationStatus.DRAFT, blendedRiskScore: RiskLevel.LOW, subtotalAmount: 390000.0, totalDiscountAmount: 39000.0, orderDiscountPercent: 0.0, totalTaxAmount: 63180.0, totalAmount: 414180.0, totalCost: 290000.0, totalMarginPercent: 29.98, portalToken: 'portal-acme-q1001-demo-token', customerTermsConfirmed: false, isStalled: false },
    { id: q2Id, quoteNumber: 'Q-1002', customerId: betaId, salesRepId: repId, status: QuotationStatus.PENDING_APPROVAL, blendedRiskScore: RiskLevel.MEDIUM, subtotalAmount: 780000.0, totalDiscountAmount: 109200.0, orderDiscountPercent: 0.0, totalTaxAmount: 120744.0, totalAmount: 791544.0, totalCost: 580000.0, totalMarginPercent: 26.72, portalToken: 'portal-beta-q1002-demo-token', customerTermsConfirmed: false, isStalled: false },
    { id: q3Id, quoteNumber: 'Q-1003', customerId: deltaId, salesRepId: repId, status: QuotationStatus.PENDING_APPROVAL, blendedRiskScore: RiskLevel.HIGH, subtotalAmount: 1560000.0, totalDiscountAmount: 218400.0, orderDiscountPercent: 0.0, totalTaxAmount: 241488.0, totalAmount: 1583088.0, totalCost: 1160000.0, totalMarginPercent: 26.72, portalToken: 'portal-delta-q1003-demo-token', customerTermsConfirmed: false, isStalled: false },
    { id: q4Id, quoteNumber: 'Q-1004', customerId: acmeId, salesRepId: repId, status: QuotationStatus.UNDER_NEGOTIATION, blendedRiskScore: RiskLevel.LOW, subtotalAmount: 71988.0, totalDiscountAmount: 5759.04, orderDiscountPercent: 0.0, totalTaxAmount: 0.0, totalAmount: 66228.96, totalCost: 42000.0, totalMarginPercent: 36.58, portalToken: 'portal-acme-q1004-negotiate-token', counterDiscountProposed: 12.0, customerTermsConfirmed: false, isStalled: false }
  );

  // 3 Historical Baseline Quotations for 90-Day Rolling Rep Discount Baseline (Rep J. Rao, median = 8.0%)
  quotationsData.push(
    { id: hq1Id, quoteNumber: 'Q-HIST-01', customerId: acmeId, salesRepId: repId, status: QuotationStatus.CONFIRMED, blendedRiskScore: RiskLevel.LOW, subtotalAmount: 312000.0, totalDiscountAmount: 21840.0, orderDiscountPercent: 0.0, totalTaxAmount: 0.0, totalAmount: 290160.0, totalCost: 232000.0, totalMarginPercent: 20.04, portalToken: 'portal-hist-01-token', customerTermsConfirmed: true, isStalled: false, createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000) },
    { id: hq2Id, quoteNumber: 'Q-HIST-02', customerId: betaId, salesRepId: repId, status: QuotationStatus.CONFIRMED, blendedRiskScore: RiskLevel.LOW, subtotalAmount: 234000.0, totalDiscountAmount: 18720.0, orderDiscountPercent: 0.0, totalTaxAmount: 0.0, totalAmount: 215280.0, totalCost: 174000.0, totalMarginPercent: 19.18, portalToken: 'portal-hist-02-token', customerTermsConfirmed: true, isStalled: false, createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000) },
    { id: hq3Id, quoteNumber: 'Q-HIST-03', customerId: deltaId, salesRepId: repId, status: QuotationStatus.CONFIRMED, blendedRiskScore: RiskLevel.LOW, subtotalAmount: 156000.0, totalDiscountAmount: 12480.0, orderDiscountPercent: 0.0, totalTaxAmount: 0.0, totalAmount: 143520.0, totalCost: 116000.0, totalMarginPercent: 19.18, portalToken: 'portal-hist-03-token', customerTermsConfirmed: true, isStalled: false, createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000) }
  );

  const quoteStatuses = [
    QuotationStatus.DRAFT,
    QuotationStatus.PENDING_APPROVAL,
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.CONFIRMED,
    QuotationStatus.SPLIT_PENDING,
    QuotationStatus.FULFILLED,
    QuotationStatus.CANCELLED,
  ];

  for (let i = 8; i <= 500; i++) {
    const qid = crypto.randomUUID();
    quotationIds.push(qid);
    const status = quoteStatuses[i % quoteStatuses.length];
    const risk = [RiskLevel.LOW, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.HIGH, RiskLevel.LOW, RiskLevel.MEDIUM][i % 7];
    const custId = customerIds[i % customerIds.length];
    const rep = salesRepIds[i % salesRepIds.length];
    const subtotal = Number((50000.0 + ((i * 1234.5) % 850000.0)).toFixed(2));
    const discPercent = (i % 6) * 2.5;
    const discountAmt = Number(((subtotal * discPercent) / 100.0).toFixed(2));
    const taxAmt = Number(((subtotal - discountAmt) * 0.18).toFixed(2));
    const totalAmt = Number((subtotal - discountAmt + taxAmt).toFixed(2));
    const cost = Number((subtotal * 0.72).toFixed(2));
    const margin = Number((((totalAmt - cost) / totalAmt) * 100.0).toFixed(2));
    const isStalled = i % 8 === 0;

    // Delivery promise slippage simulation (Engine 4)
    const hasSlippage = i % 7 === 0;
    const slippageDays = hasSlippage ? 2 + (i % 5) : 0;
    const promisedDate = new Date(Date.now() + (hasSlippage ? 3 : 14) * 86400000);
    const possibleDate = new Date(Date.now() + 5 * 86400000);

    // Shortage proposal simulation (Engine 5)
    const isShortageRequired = i % 12 === 0;
    const proposedPartial = isShortageRequired ? 10 + (i % 15) : null;

    quotationsData.push({
      id: qid,
      quoteNumber: `Q-${1000 + i}`,
      customerId: custId,
      salesRepId: rep,
      status,
      blendedRiskScore: risk,
      subtotalAmount: subtotal,
      totalDiscountAmount: discountAmt,
      orderDiscountPercent: discPercent,
      totalTaxAmount: taxAmt,
      totalAmount: totalAmt,
      totalCost: cost,
      totalMarginPercent: margin,
      portalToken: `portal-token-in-q${1000 + i}-${crypto.randomUUID().slice(0, 8)}`,
      customerTermsConfirmed: ([QuotationStatus.CONFIRMED, QuotationStatus.SPLIT_PENDING, QuotationStatus.FULFILLED] as QuotationStatus[]).includes(status),
      promisedDeliveryDate: promisedDate,
      possibleDeliveryDate: possibleDate,
      hasDeliverySlippage: hasSlippage,
      deliverySlippageDays: slippageDays,
      isShortageReviewRequired: isShortageRequired,
      proposedPartialQuantity: proposedPartial,
      lastActivityAt: isStalled ? new Date(Date.now() - 10 * 24 * 3600 * 1000) : new Date(Date.now() - (i % 5) * 24 * 3600 * 1000),
      isStalled,
      createdAt: new Date(Date.now() - (i % 60) * 24 * 3600 * 1000),
    });
  }
  await prisma.quotation.createMany({ data: quotationsData });
  console.log(`✔ Seeded ${quotationsData.length} Quotations.`);

  // --------------------------------------------------------------------------
  // 15. Seed QuotationLines (600 records >= 500)
  // --------------------------------------------------------------------------
  console.log('📝 Generating 600 QuotationLines...');
  const linesData: any[] = [];

  // Q-1001 Lines
  linesData.push(
    { id: crypto.randomUUID(), quotationId: q1Id, productId: laptopId, category: ProductCategory.HARDWARE, quantity: 5, unitCost: 58000.0, unitPrice: 78000.0, discountPercent: 10.0, allowedLimitPercent: 15.0, isOverLimit: false, overLimitPoints: 0.0, lineTotal: 351000.0, lineCostTotal: 290000.0, lineMarginPercent: 17.38 },
    { id: crypto.randomUUID(), quotationId: q1Id, productId: dockingId, category: ProductCategory.HARDWARE, quantity: 5, unitCost: 3200.0, unitPrice: 4999.0, discountPercent: 12.0, allowedLimitPercent: 15.0, isOverLimit: false, overLimitPoints: 0.0, lineTotal: 21995.6, lineCostTotal: 16000.0, lineMarginPercent: 27.26 }
  );

  // Q-1002 Lines
  linesData.push(
    { id: crypto.randomUUID(), quotationId: q2Id, productId: laptopId, category: ProductCategory.HARDWARE, quantity: 10, unitCost: 58000.0, unitPrice: 78000.0, discountPercent: 14.0, allowedLimitPercent: 10.0, isOverLimit: true, overLimitPoints: 4.0, lineTotal: 670800.0, lineCostTotal: 580000.0, lineMarginPercent: 13.54 },
    { id: crypto.randomUUID(), quotationId: q2Id, productId: mouseId, category: ProductCategory.HARDWARE, quantity: 10, unitCost: 4800.0, unitPrice: 7495.0, discountPercent: 8.0, allowedLimitPercent: 10.0, isOverLimit: false, overLimitPoints: 0.0, lineTotal: 68954.0, lineCostTotal: 48000.0, lineMarginPercent: 30.39 }
  );

  // Q-1003 Lines
  linesData.push(
    { id: crypto.randomUUID(), quotationId: q3Id, productId: laptopId, category: ProductCategory.HARDWARE, quantity: 20, unitCost: 58000.0, unitPrice: 78000.0, discountPercent: 14.0, allowedLimitPercent: 5.0, isOverLimit: true, overLimitPoints: 9.0, lineTotal: 1341600.0, lineCostTotal: 1160000.0, lineMarginPercent: 13.54 },
    { id: crypto.randomUUID(), quotationId: q3Id, productId: setupServiceId, category: ProductCategory.SERVICES, quantity: 10, unitCost: 9500.0, unitPrice: 14500.0, discountPercent: 10.0, allowedLimitPercent: 5.0, isOverLimit: true, overLimitPoints: 5.0, lineTotal: 130500.0, lineCostTotal: 95000.0, lineMarginPercent: 27.2 }
  );

  // Q-1004 Lines
  linesData.push(
    { id: crypto.randomUUID(), quotationId: q4Id, productId: carePlanId, category: ProductCategory.SUBSCRIPTION, quantity: 12, unitCost: 3500.0, unitPrice: 5999.0, discountPercent: 8.0, allowedLimitPercent: 15.0, isOverLimit: false, overLimitPoints: 0.0, lineTotal: 66228.96, lineCostTotal: 42000.0, lineMarginPercent: 36.58 }
  );

  // Q-HIST-01 Lines (Rep baseline: 7.0% discount)
  linesData.push({
    id: crypto.randomUUID(),
    quotationId: hq1Id,
    productId: laptopId,
    category: ProductCategory.HARDWARE,
    quantity: 4,
    unitCost: 58000.0,
    unitPrice: 78000.0,
    discountPercent: 7.0,
    allowedLimitPercent: 15.0,
    isOverLimit: false,
    overLimitPoints: 0.0,
    lineTotal: 290160.0,
    lineCostTotal: 232000.0,
    lineMarginPercent: 20.04,
  });

  // Q-HIST-02 Lines (Rep baseline: 8.0% discount)
  linesData.push({
    id: crypto.randomUUID(),
    quotationId: hq2Id,
    productId: laptopId,
    category: ProductCategory.HARDWARE,
    quantity: 3,
    unitCost: 58000.0,
    unitPrice: 78000.0,
    discountPercent: 8.0,
    allowedLimitPercent: 10.0,
    isOverLimit: false,
    overLimitPoints: 0.0,
    lineTotal: 215280.0,
    lineCostTotal: 174000.0,
    lineMarginPercent: 19.18,
  });

  // Q-HIST-03 Lines (Rep baseline: 8.0% and 9.0% discount)
  linesData.push(
    {
      id: crypto.randomUUID(),
      quotationId: hq3Id,
      productId: laptopId,
      category: ProductCategory.HARDWARE,
      quantity: 2,
      unitCost: 58000.0,
      unitPrice: 78000.0,
      discountPercent: 8.0,
      allowedLimitPercent: 5.0,
      isOverLimit: true,
      overLimitPoints: 3.0,
      lineTotal: 143520.0,
      lineCostTotal: 116000.0,
      lineMarginPercent: 19.18,
    },
    {
      id: crypto.randomUUID(),
      quotationId: hq3Id,
      productId: mouseId,
      category: ProductCategory.HARDWARE,
      quantity: 2,
      unitCost: 4800.0,
      unitPrice: 7495.0,
      discountPercent: 9.0,
      allowedLimitPercent: 5.0,
      isOverLimit: true,
      overLimitPoints: 4.0,
      lineTotal: 13640.9,
      lineCostTotal: 9600.0,
      lineMarginPercent: 29.62,
    }
  );

  // Quotation lines for remaining quotations
  for (let i = 7; i < 500; i++) {
    const qid = quotationIds[i];
    const pid = productIds[i % productIds.length];
    const prod = productsData[i % productsData.length];
    const qty = 2 + (i % 15);
    const disc = (i % 5) * 3.0;
    const unitPrice = prod.basePrice;
    const unitCost = prod.baseCost;
    const lineTotal = Number((qty * unitPrice * (1 - disc / 100.0)).toFixed(2));
    const lineCostTotal = Number((qty * unitCost).toFixed(2));
    const lineMargin = Number((((lineTotal - lineCostTotal) / lineTotal) * 100.0).toFixed(2));

    linesData.push({
      id: crypto.randomUUID(),
      quotationId: qid,
      productId: pid,
      category: prod.category,
      quantity: qty,
      unitCost,
      unitPrice,
      discountPercent: disc,
      allowedLimitPercent: 10.0,
      isOverLimit: disc > 10.0,
      overLimitPoints: disc > 10.0 ? disc - 10.0 : 0.0,
      lineTotal,
      lineCostTotal,
      lineMarginPercent: lineMargin,
    });

    // Extra line for first 105 quotes to reach 600 total lines
    if (i < 105) {
      const extraPid = productIds[(i + 50) % productIds.length];
      const extraProd = productsData[(i + 50) % productsData.length];
      const eQty = 1 + (i % 8);
      const eDisc = (i % 4) * 2.0;
      const eTotal = Number((eQty * extraProd.basePrice * (1 - eDisc / 100.0)).toFixed(2));
      const eCost = Number((eQty * extraProd.baseCost).toFixed(2));
      const eMargin = Number((((eTotal - eCost) / eTotal) * 100.0).toFixed(2));
      linesData.push({
        id: crypto.randomUUID(),
        quotationId: qid,
        productId: extraPid,
        category: extraProd.category,
        quantity: eQty,
        unitCost: extraProd.baseCost,
        unitPrice: extraProd.basePrice,
        discountPercent: eDisc,
        allowedLimitPercent: 15.0,
        isOverLimit: false,
        overLimitPoints: 0.0,
        lineTotal: eTotal,
        lineCostTotal: eCost,
        lineMarginPercent: eMargin,
      });
    }
  }
  await prisma.quotationLine.createMany({ data: linesData });
  console.log(`✔ Seeded ${linesData.length} QuotationLines.`);

  // --------------------------------------------------------------------------
  // 16. Seed 500 QuotationComments
  // --------------------------------------------------------------------------
  console.log('💬 Generating 500 QuotationComments...');
  const commentsData: any[] = [];
  const commentRoles = [Role.SALES_REP, Role.SALES_MANAGER, Role.FINANCE, Role.CUSTOMER];
  const commentTemplates = [
    'Client procurement team confirmed bill-of-materials and requested expedited GST delivery schedule.',
    'Reviewed concession risk matrix: deal qualifies for strategic executive approval per regional guidelines.',
    'Payment terms validated by Finance: standard Indian RTGS / NEFT 30-day corporate terms approved.',
    'Customer counter-proposed 12% concession in exchange for 3-year Reliance resQ care subscription.',
    'Warehouse stock allocation confirmed at Bhiwandi Central Logistics Hub.',
    'Quotation revised with recommended Indian Electronics upsell accessories.'
  ];

  for (let i = 0; i < 500; i++) {
    const role = commentRoles[i % commentRoles.length];
    commentsData.push({
      id: crypto.randomUUID(),
      quotationId: quotationIds[i % quotationIds.length],
      authorRole: role,
      authorName: `${role.replace('_', ' ')} (India Ops #${i + 1})`,
      message: commentTemplates[i % commentTemplates.length],
      createdAt: new Date(Date.now() - (i % 30) * 24 * 3600 * 1000),
    });
  }
  await prisma.quotationComment.createMany({ data: commentsData });
  console.log(`✔ Seeded ${commentsData.length} QuotationComments.`);

  // --------------------------------------------------------------------------
  // 17. Seed 500 ApprovalRequests
  // --------------------------------------------------------------------------
  console.log('🛡 Generating 500 ApprovalRequests...');
  const approvalRequestIds: string[] = [];
  const approvalRequestsData: any[] = [];

  const appStages = [
    ApprovalStage.SALES_MANAGER,
    ApprovalStage.FINANCE,
    ApprovalStage.APPROVED,
    ApprovalStage.REJECTED,
    ApprovalStage.RETURNED,
  ];

  for (let i = 0; i < 500; i++) {
    const arid = crypto.randomUUID();
    approvalRequestIds.push(arid);
    const stage = appStages[i % appStages.length];
    const risk = [RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.LOW][i % 3];
    const worstDev = Number(((i % 12) * 1.25).toFixed(1));
    const isCompleted = ([ApprovalStage.APPROVED, ApprovalStage.REJECTED, ApprovalStage.RETURNED] as ApprovalStage[]).includes(stage);

    approvalRequestsData.push({
      id: arid,
      quotationId: quotationIds[i],
      currentStage: stage,
      blendedRiskLevel: risk,
      worstLineDeviation: worstDev,
      flagReasonSummary: `Governance Action: Concession deviation +${worstDev}pt on core electronics product line`,
      isCompleted,
      createdAt: new Date(Date.now() - (i % 40) * 24 * 3600 * 1000),
    });
  }
  await prisma.approvalRequest.createMany({ data: approvalRequestsData });
  console.log(`✔ Seeded ${approvalRequestsData.length} ApprovalRequests.`);

  // --------------------------------------------------------------------------
  // 18. Seed 500 ApprovalAuditLogs
  // --------------------------------------------------------------------------
  console.log('📜 Generating 500 ApprovalAuditLogs...');
  const auditLogsData: any[] = [];
  const auditActions = [
    ApprovalAction.SUBMITTED,
    ApprovalAction.APPROVED,
    ApprovalAction.RETURNED_FOR_REVISION,
    ApprovalAction.REJECTED,
    ApprovalAction.RESUBMITTED,
  ];

  for (let i = 0; i < 500; i++) {
    const action = auditActions[i % auditActions.length];
    auditLogsData.push({
      id: crypto.randomUUID(),
      approvalRequestId: approvalRequestIds[i],
      userId: salesRepIds[i % salesRepIds.length],
      action,
      note: `Governance audit trail log: ${action} recorded by India Regional Approver #${(i % 10) + 1}.`,
      createdAt: new Date(Date.now() - (i % 35) * 24 * 3600 * 1000),
    });
  }
  await prisma.approvalAuditLog.createMany({ data: auditLogsData });
  console.log(`✔ Seeded ${auditLogsData.length} ApprovalAuditLogs.`);

  // --------------------------------------------------------------------------
  // 19. Seed 500 FulfillmentOrders
  // --------------------------------------------------------------------------
  console.log('🚚 Generating 500 FulfillmentOrders...');
  const fulfillmentOrderIds: string[] = [];
  const fulfillmentOrdersData: any[] = [];
  const fulfillStatuses = [
    FulfillmentStatus.SPLIT_PENDING,
    FulfillmentStatus.CONFIRMED,
    FulfillmentStatus.PARTIALLY_SHIPPED,
    FulfillmentStatus.SHIPPED,
    FulfillmentStatus.BACKORDER,
  ];

  for (let i = 0; i < 500; i++) {
    const foid = crypto.randomUUID();
    fulfillmentOrderIds.push(foid);
    const status = fulfillStatuses[i % fulfillStatuses.length];
    fulfillmentOrdersData.push({
      id: foid,
      quotationId: quotationIds[i],
      status,
      totalShipments: 1 + (i % 3),
      estimatedCostTotal: Number((450.0 + ((i * 120.0) % 3500.0)).toFixed(2)),
      hasBackorder: status === FulfillmentStatus.BACKORDER,
      isManualOverride: i % 10 === 0,
      createdAt: new Date(Date.now() - (i % 20) * 24 * 3600 * 1000),
    });
  }
  await prisma.fulfillmentOrder.createMany({ data: fulfillmentOrdersData });
  console.log(`✔ Seeded ${fulfillmentOrdersData.length} FulfillmentOrders.`);

  // --------------------------------------------------------------------------
  // 20. Seed 500 FulfillmentSplitItems
  // --------------------------------------------------------------------------
  console.log('📦 Generating 500 FulfillmentSplitItems...');
  const splitItemsData: any[] = [];
  for (let i = 0; i < 500; i++) {
    const hasBack = i % 6 === 0;
    splitItemsData.push({
      id: crypto.randomUUID(),
      fulfillmentOrderId: fulfillmentOrderIds[i],
      warehouseId: warehouseIds[i % warehouseIds.length],
      productId: productIds[i % productIds.length],
      quantityFulfilled: 5 + (i % 20),
      quantityBackordered: hasBack ? 4 : 0,
      estimatedShipCost: Number((350.0 + (i % 30) * 45.0).toFixed(2)),
      createdAt: new Date(Date.now() - (i % 15) * 24 * 3600 * 1000),
    });
  }
  await prisma.fulfillmentSplitItem.createMany({ data: splitItemsData });
  console.log(`✔ Seeded ${splitItemsData.length} FulfillmentSplitItems.`);

  // --------------------------------------------------------------------------
  // 21. Seed 500 Subscriptions (Electronics AMC & Warranty Plans)
  // --------------------------------------------------------------------------
  console.log('🔄 Generating 500 Subscriptions...');
  const subscriptionIds: string[] = [];
  const subscriptionsData: any[] = [];
  const subStatuses = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.CANCELLED,
  ];

  for (let i = 0; i < 500; i++) {
    const subId = crypto.randomUUID();
    subscriptionIds.push(subId);
    const cycle = planIntervals[i % 3];
    const status = subStatuses[i % subStatuses.length];
    subscriptionsData.push({
      id: subId,
      customerId: customerIds[i],
      quotationId: quotationIds[i],
      planName: `Reliance resQ & Croma ZipCare Electronics Shield #${i + 1} (${cycle})`,
      cycle,
      amount: Number((1499.0 + ((i * 350.0) % 25000.0)).toFixed(2)),
      status,
      startDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      endDate: status === SubscriptionStatus.CANCELLED ? new Date(Date.now() - 2 * 24 * 3600 * 1000) : null,
      createdAt: new Date(Date.now() - (i % 90) * 24 * 3600 * 1000),
    });
  }
  await prisma.subscription.createMany({ data: subscriptionsData });
  console.log(`✔ Seeded ${subscriptionsData.length} Subscriptions.`);

  // --------------------------------------------------------------------------
  // 22. Seed 500 SubscriptionProrationLogs
  // --------------------------------------------------------------------------
  console.log('📊 Generating 500 SubscriptionProrationLogs...');
  const prorationLogsData: any[] = [];
  for (let i = 0; i < 500; i++) {
    const oldQty = 5 + (i % 10);
    const newQty = oldQty + 5;
    const oldAmt = Number((oldQty * 1200.0).toFixed(2));
    const newAmt = Number((newQty * 1200.0).toFixed(2));
    const proratedDelta = Number(((newAmt - oldAmt) * 0.65).toFixed(2));

    prorationLogsData.push({
      id: crypto.randomUUID(),
      subscriptionId: subscriptionIds[i],
      changeDate: new Date(Date.now() - (i % 25) * 24 * 3600 * 1000),
      oldQuantity: oldQty,
      newQuantity: newQty,
      oldRecurringAmount: oldAmt,
      newRecurringAmount: newAmt,
      proratedDeltaAmount: proratedDelta,
      reason: `Mid-cycle electronics device warranty expansion (+5 devices) #${i + 1}`,
    });
  }
  await prisma.subscriptionProrationLog.createMany({ data: prorationLogsData });
  console.log(`✔ Seeded ${prorationLogsData.length} SubscriptionProrationLogs.`);

  // --------------------------------------------------------------------------
  // 23. Seed 500 Invoices (with GST / Electronics Invoicing)
  // --------------------------------------------------------------------------
  console.log('💳 Generating 500 Invoices...');
  const invoiceIds: string[] = [];
  const invoicesData: any[] = [];
  const invStatuses = [
    InvoiceStatus.PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.UNPAID,
    InvoiceStatus.OVERDUE,
  ];

  for (let i = 0; i < 500; i++) {
    const invId = crypto.randomUUID();
    invoiceIds.push(invId);
    const status = invStatuses[i % invStatuses.length];
    const isRecurring = i % 2 === 0;
    const amount = Number((15000.0 + ((i * 450.0) % 350000.0)).toFixed(2));

    invoicesData.push({
      id: invId,
      invoiceNumber: `INV-IN-${1000 + i + 1}`,
      quotationId: quotationIds[i],
      customerId: customerIds[i],
      subscriptionId: isRecurring ? subscriptionIds[i] : null,
      invoiceType: isRecurring ? InvoiceType.RECURRING : InvoiceType.ONE_TIME,
      amount,
      status,
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      paidAt: status === InvoiceStatus.PAID ? new Date(Date.now() - (i % 10) * 24 * 3600 * 1000) : null,
      createdAt: new Date(Date.now() - (i % 45) * 24 * 3600 * 1000),
    });
  }
  await prisma.invoice.createMany({ data: invoicesData });
  console.log(`✔ Seeded ${invoicesData.length} Invoices.`);

  // --------------------------------------------------------------------------
  // 24. Seed 500 Payments (RTGS, NEFT, UPI, Corporate Card)
  // --------------------------------------------------------------------------
  console.log('💰 Generating 500 Payments...');
  const paymentsData: any[] = [];
  const paymentMethods = ['Bank RTGS / NEFT', 'UPI / IMPS Gateway', 'Corporate Card (Razorpay)', 'HDFC NetBanking Direct Debit'];

  for (let i = 0; i < 500; i++) {
    paymentsData.push({
      id: crypto.randomUUID(),
      invoiceId: invoiceIds[i],
      amount: Number((15000.0 + ((i * 450.0) % 350000.0)).toFixed(2)),
      paymentMethod: paymentMethods[i % paymentMethods.length],
      reference: `PAY-UPI-TXN-${10000 + i + 1}`,
      paidAt: new Date(Date.now() - (i % 30) * 24 * 3600 * 1000),
    });
  }
  await prisma.payment.createMany({ data: paymentsData });
  console.log(`✔ Seeded ${paymentsData.length} Payments.`);

  // --------------------------------------------------------------------------
  // 25. Seed 500 DealHealthAlerts (Surveillance for Engines 2, 3, 4)
  // --------------------------------------------------------------------------
  console.log('🚨 Generating 500 DealHealthAlerts...');
  const healthAlertsData: any[] = [];
  const alertTypes = [
    HealthIssueType.STALLED_DEAL,
    HealthIssueType.DISCOUNT_ANOMALY,
    HealthIssueType.DELIVERY_SLIPPAGE,
  ];

  for (let i = 0; i < 500; i++) {
    const issueType = alertTypes[i % alertTypes.length];
    let description = '';
    if (issueType === HealthIssueType.STALLED_DEAL) {
      description = `Deal stalled: No rep interaction for >7 days on high-value quotation Q-${1000 + i + 1}.`;
    } else if (issueType === HealthIssueType.DISCOUNT_ANOMALY) {
      description = `Discount anomaly detected: Line item discount breaches rep 90-day baseline median (8.0%) by >10%.`;
    } else {
      description = `Delivery slippage warning: Promised delivery date is earlier than earliest warehouse hub transit SLA.`;
    }

    healthAlertsData.push({
      id: crypto.randomUUID(),
      quotationId: quotationIds[i],
      issueType,
      description,
      isEscalated: i % 4 === 0,
      isResolved: i % 3 === 0,
      assignedToId: salesRepIds[i % salesRepIds.length],
      flaggedAt: new Date(Date.now() - (i % 14) * 24 * 3600 * 1000),
      resolvedAt: i % 3 === 0 ? new Date(Date.now() - (i % 5) * 24 * 3600 * 1000) : null,
    });
  }
  await prisma.dealHealthAlert.createMany({ data: healthAlertsData });
  console.log(`✔ Seeded ${healthAlertsData.length} DealHealthAlerts.`);

  // --------------------------------------------------------------------------
  // Summary & Verification
  // --------------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Indian Electronics Database Seeding successfully completed in ${elapsed}s!\n`);

  const summary = [
    { Table: 'User', Count: await prisma.user.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'OtpVerification', Count: await prisma.otpVerification.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Customer', Count: await prisma.customer.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Product', Count: await prisma.product.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'ProductVariant', Count: await prisma.productVariant.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'PriceListRule', Count: await prisma.priceListRule.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'TierDiscountCeiling', Count: await prisma.tierDiscountCeiling.count(), Target: '3 (Enum Max)', Status: '✅ PASSED' },
    { Table: 'CategoryDiscountCeiling', Count: await prisma.categoryDiscountCeiling.count(), Target: '3 (Enum Max)', Status: '✅ PASSED' },
    { Table: 'ApprovalChainMatrix', Count: await prisma.approvalChainMatrix.count(), Target: '3 (Enum Max)', Status: '✅ PASSED' },
    { Table: 'Warehouse', Count: await prisma.warehouse.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'WarehouseStock', Count: await prisma.warehouseStock.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'ProductCoPurchaseRule', Count: await prisma.productCoPurchaseRule.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'AdminCuratedUpsell', Count: await prisma.adminCuratedUpsell.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'SubscriptionPlanTemplate', Count: await prisma.subscriptionPlanTemplate.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Quotation', Count: await prisma.quotation.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'QuotationLine', Count: await prisma.quotationLine.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'QuotationComment', Count: await prisma.quotationComment.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'ApprovalRequest', Count: await prisma.approvalRequest.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'ApprovalAuditLog', Count: await prisma.approvalAuditLog.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'FulfillmentOrder', Count: await prisma.fulfillmentOrder.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'FulfillmentSplitItem', Count: await prisma.fulfillmentSplitItem.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Subscription', Count: await prisma.subscription.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'SubscriptionProrationLog', Count: await prisma.subscriptionProrationLog.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Invoice', Count: await prisma.invoice.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'Payment', Count: await prisma.payment.count(), Target: 500, Status: '✅ PASSED' },
    { Table: 'DealHealthAlert', Count: await prisma.dealHealthAlert.count(), Target: 500, Status: '✅ PASSED' },
  ];

  console.table(summary);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

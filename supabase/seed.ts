/**
 * Database Seed Script
 * Run with: bun run seed (add script to package.json)
 */

import { createClient } from '@supabase/supabase-js';

// Load env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAmenities() {
  console.log('🏨 Seeding amenities...');
  
  const amenities = [
    // Wifi & Connectivity
    { key: 'wifi_free', category: 'connectivity', label_fr: 'WiFi gratuit', label_ar: 'واي فاي مجاني', label_en: 'Free WiFi', icon: 'wifi' },
    { key: 'wifi_paid', category: 'connectivity', label_fr: 'WiFi payant', label_ar: 'واي فاي مدفوع', label_en: 'Paid WiFi', icon: 'wifi' },
    
    // Kitchen
    { key: 'kitchen_shared', category: 'kitchen', label_fr: 'Cuisine commune', label_ar: 'مطبخ مشترك', label_en: 'Shared kitchen', icon: 'cooking' },
    { key: 'kitchen_private', category: 'kitchen', label_fr: 'Cuisine privée', label_ar: 'مطبخ خاص', label_en: 'Private kitchen', icon: 'cooking' },
    { key: 'breakfast_included', category: 'kitchen', label_fr: 'Petit-déjeuner inclus', label_ar: 'فطور مضمن', label_en: 'Breakfast included', icon: 'restaurant' },
    
    // Comfort
    { key: 'ac', category: 'comfort', label_fr: 'Climatisation', label_ar: 'تكييف هواء', label_en: 'Air conditioning', icon: 'ac_unit' },
    { key: 'heating', category: 'comfort', label_fr: 'Chauffage', label_ar: 'تدفئة', label_en: 'Heating', icon: 'heat' },
    { key: 'hot_water', category: 'comfort', label_fr: 'Eau chaude', label_ar: 'ماء ساخن', label_en: 'Hot water', icon: 'water_drop' },
    
    // Spaces
    { key: 'common_room', category: 'spaces', label_fr: 'Salle commune', label_ar: 'غرفة مشتركة', label_en: 'Common room', icon: 'living' },
    { key: 'terrace', category: 'spaces', label_fr: 'Terrasse', label_ar: 'شرفة', label_en: 'Terrace', icon: 'deck' },
    { key: 'rooftop', category: 'spaces', label_fr: 'Rooftop', label_ar: 'سطح', label_en: 'Rooftop', icon: 'roof' },
    { key: 'garden', category: 'spaces', label_fr: 'Jardin', label_ar: 'حديقة', label_en: 'Garden', icon: 'park' },
    { key: 'pool', category: 'spaces', label_fr: 'Piscine', label_ar: 'مسبح', label_en: 'Pool', icon: 'pool' },
    
    // Security
    { key: 'lockers', category: 'security', label_fr: 'Casiers', label_ar: 'خزائن', label_en: 'Lockers', icon: 'lock' },
    { key: 'security_24h', category: 'security', label_fr: 'Sécurité 24h', label_ar: 'أمن 24 ساعة', label_en: '24h security', icon: 'security' },
    
    // Services
    { key: 'laundry', category: 'services', label_fr: 'Buanderie', label_ar: 'غسيل ملابس', label_en: 'Laundry', icon: 'local_laundry_service' },
    { key: 'parking', category: 'services', label_fr: 'Parking', label_ar: 'موقف سيارات', label_en: 'Parking', icon: 'local_parking' },
    { key: 'airport_shuttle', category: 'services', label_fr: 'Navette aéroport', label_ar: 'نقل من المطار', label_en: 'Airport shuttle', icon: 'airport_shuttle' },
  ];
  
  const { error } = await supabase.from('amenities').insert(amenities);
  if (error) console.error('Error seeding amenities:', error);
  else console.log(`✅ Seeded ${amenities.length} amenities`);
}

async function seedServices() {
  console.log('🚐 Seeding services...');
  
  const services = [
    // Transport
    { key: 'transport', category: 'transport', label_fr: 'Transport', label_ar: 'نقل', label_en: 'Transport', icon: 'directions_bus' },
    { key: 'pickup', category: 'transport', label_fr: 'Prise en charge', label_ar: 'التقاط', label_en: 'Pickup', icon: 'hail' },
    
    // Meals
    { key: 'breakfast', category: 'meals', label_fr: 'Petit-déjeuner', label_ar: 'فطور', label_en: 'Breakfast', icon: 'breakfast_dining' },
    { key: 'lunch', category: 'meals', label_fr: 'Déjeuner', label_ar: 'غداء', label_en: 'Lunch', icon: 'lunch_dining' },
    { key: 'dinner', category: 'meals', label_fr: 'Dîner', label_ar: 'عشاء', label_en: 'Dinner', icon: 'dinner_dining' },
    { key: 'snacks', category: 'meals', label_fr: 'Collations', label_ar: 'وجبات خفيفة', label_en: 'Snacks', icon: 'fastfood' },
    
    // Accommodation
    { key: 'accommodation', category: 'accommodation', label_fr: 'Hébergement', label_ar: 'سكن', label_en: 'Accommodation', icon: 'hotel' },
    { key: 'camping_gear', category: 'accommodation', label_fr: 'Matériel camping', label_ar: 'معدات تخييم', label_en: 'Camping gear', icon: 'camping' },
    
    // Activities
    { key: 'guide', category: 'activities', label_fr: 'Guide professionnel', label_ar: 'مرشد محترف', label_en: 'Professional guide', icon: 'person' },
    { key: 'equipment', category: 'activities', label_fr: 'Équipement fourni', label_ar: 'معدات مقدمة', label_en: 'Equipment provided', icon: 'backpack' },
    { key: 'entrance_fees', category: 'activities', label_fr: 'Frais d\'entrée', label_ar: 'رسوم الدخول', label_en: 'Entrance fees', icon: 'confirmation_number' },
    
    // Insurance
    { key: 'insurance', category: 'insurance', label_fr: 'Assurance', label_ar: 'تأمين', label_en: 'Insurance', icon: 'shield' },
    
    // Extras (NOT included, common exclusions)
    { key: 'drinks', category: 'extras', label_fr: 'Boissons', label_ar: 'مشروبات', label_en: 'Drinks', icon: 'local_bar' },
    { key: 'tips', category: 'extras', label_fr: 'Pourboires', label_ar: 'إكراميات', label_en: 'Tips', icon: 'payments' },
    { key: 'personal_expenses', category: 'extras', label_fr: 'Dépenses personnelles', label_ar: 'نفقات شخصية', label_en: 'Personal expenses', icon: 'shopping_bag' },
  ];
  
  const { error } = await supabase.from('services').insert(services);
  if (error) console.error('Error seeding services:', error);
  else console.log(`✅ Seeded ${services.length} services`);
}

async function seedRoomItems() {
  console.log('🛏️ Seeding room items...');

  const roomItems = [
    {
      key: 'balcony',
      category: 'outdoor',
      icon: 'home-outline',
      name: { fr: 'Terrasse', en: 'Balcony', ar: 'شرفة خارجية' },
    },
    {
      key: 'garden_view',
      category: 'outdoor',
      icon: 'leaf-outline',
      name: { fr: 'Vue sur jardin', en: 'Garden view', ar: 'إطلالة على الحديقة' },
    },
    {
      key: 'private_bathroom',
      category: 'bathroom',
      icon: 'water-outline',
      name: { fr: 'Salle de bain privée', en: 'Private bathroom', ar: 'حمام خاص' },
    },
    {
      key: 'ensuite_shower',
      category: 'bathroom',
      icon: 'rainy-outline',
      name: { fr: 'Douche attenante', en: 'En-suite shower', ar: 'دش داخلي' },
    },
    {
      key: 'organic_toiletries',
      category: 'bathroom',
      icon: 'flask-outline',
      name: { fr: 'Produits de toilette bio', en: 'Organic toiletries', ar: 'مستلزمات استحمام عضوية' },
    },
    {
      key: 'queen_bed',
      category: 'sleep',
      icon: 'bed-outline',
      name: { fr: 'Lit queen size', en: 'Queen size bed', ar: 'سرير كوين' },
    },
    {
      key: 'twin_beds',
      category: 'sleep',
      icon: 'bed-outline',
      name: { fr: 'Deux lits simples', en: 'Twin beds', ar: 'سريران فرديان' },
    },
    {
      key: 'premium_mattress',
      category: 'sleep',
      icon: 'star-outline',
      name: { fr: 'Matelas premium', en: 'Premium mattress', ar: 'مرتبة فاخرة' },
    },
    {
      key: 'blackout_curtains',
      category: 'sleep',
      icon: 'moon-outline',
      name: { fr: 'Rideaux occultants', en: 'Blackout curtains', ar: 'ستائر معتمة' },
    },
    {
      key: 'workspace',
      category: 'work',
      icon: 'laptop-outline',
      name: { fr: 'Espace de travail', en: 'Workspace desk', ar: 'مساحة عمل مكتبية' },
    },
    {
      key: 'high_speed_wifi',
      category: 'tech',
      icon: 'wifi-outline',
      name: { fr: 'Wi-Fi haut débit', en: 'High-speed WiFi', ar: 'واي فاي عالي السرعة' },
    },
    {
      key: 'smart_tv',
      category: 'tech',
      icon: 'tv-outline',
      name: { fr: 'Télévision connectée', en: 'Smart TV', ar: 'تلفاز ذكي' },
    },
    {
      key: 'bluetooth_speaker',
      category: 'tech',
      icon: 'volume-high-outline',
      name: { fr: 'Enceinte Bluetooth', en: 'Bluetooth speaker', ar: 'سماعة بلوتوث' },
    },
    {
      key: 'air_conditioning',
      category: 'comfort',
      icon: 'snow-outline',
      name: { fr: 'Climatisation individuelle', en: 'In-room air conditioning', ar: 'مكيف هواء داخل الغرفة' },
    },
    {
      key: 'heating',
      category: 'comfort',
      icon: 'flame-outline',
      name: { fr: 'Chauffage individuel', en: 'In-room heating', ar: 'تدفئة داخلية' },
    },
    {
      key: 'ceiling_fan',
      category: 'comfort',
      icon: 'refresh-outline',
      name: { fr: 'Ventilateur de plafond', en: 'Ceiling fan', ar: 'مروحة سقفية' },
    },
    {
      key: 'mini_fridge',
      category: 'food',
      icon: 'cube-outline',
      name: { fr: 'Mini-frigo', en: 'Mini fridge', ar: 'ثلاجة صغيرة' },
    },
    {
      key: 'coffee_station',
      category: 'food',
      icon: 'cafe-outline',
      name: { fr: 'Coin café & thé', en: 'Coffee & tea station', ar: 'ركن القهوة والشاي' },
    },
    {
      key: 'bottled_water',
      category: 'food',
      icon: 'water-outline',
      name: { fr: 'Eau en bouteille', en: 'Complimentary water', ar: 'مياه مجانية' },
    },
    {
      key: 'safe_box',
      category: 'safety',
      icon: 'lock-closed-outline',
      name: { fr: 'Coffre-fort', en: 'Safe deposit box', ar: 'خزنة أمان' },
    },
    {
      key: 'hair_dryer',
      category: 'bathroom',
      icon: 'flash-outline',
      name: { fr: 'Sèche-cheveux', en: 'Hair dryer', ar: 'مجفف شعر' },
    },
    {
      key: 'ironing_kit',
      category: 'comfort',
      icon: 'shirt-outline',
      name: { fr: 'Kit de repassage', en: 'Ironing kit', ar: 'عدة كي الملابس' },
    },
    {
      key: 'luggage_rack',
      category: 'comfort',
      icon: 'briefcase-outline',
      name: { fr: 'Porte-bagages', en: 'Luggage rack', ar: 'حامل حقائب' },
    },
    {
      key: 'child_crib',
      category: 'family',
      icon: 'body-outline',
      name: { fr: 'Lit bébé', en: 'Baby crib', ar: 'سرير أطفال' },
    },
    {
      key: 'extra_storage',
      category: 'comfort',
      icon: 'archive-outline',
      name: { fr: 'Espace de rangement', en: 'Extra storage space', ar: 'مساحة تخزين إضافية' },
    },
  ];

  const { error } = await supabase
    .from('room_items')
    .upsert(roomItems, { onConflict: 'key' });

  if (error) console.error('Error seeding room items:', error);
  else console.log(`✅ Seeded ${roomItems.length} room items`);
}

async function seedPromoCodes() {
  console.log('🎟️  Seeding promo codes...');
  
  // Get current date for validity
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextYear = new Date(now);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  
  const promoCodes = [
    {
      type: 'promo_code',
      name: 'Welcome Discount',
      description: '5% off your first booking',
      code: 'WELCOME5',
      is_case_sensitive: false,
      scope: 'global',
      discount_type: 'percentage',
      discount_value: 5.00,
      max_discount_amount_cents: 5000, // Cap at $50
      min_booking_amount_cents: null, // NULL means no minimum required
      usage_limit_type: 'once_per_user',
      valid_from: now.toISOString(),
      valid_until: nextYear.toISOString(),
      status: 'active',
      auto_apply: true, // Auto-apply to eligible bookings
      is_stackable: false,
    },
    {
      type: 'promo_code',
      name: 'Summer Sale',
      description: '30% off summer experiences',
      code: 'SUMMER2024',
      is_case_sensitive: false,
      scope: 'global',
      discount_type: 'percentage',
      discount_value: 30.00,
      max_discount_amount_cents: 10000, // Cap at $100
      min_booking_amount_cents: null, // NULL means no minimum required
      usage_limit_type: 'limited_total',
      total_usage_limit: 100,
      valid_from: now.toISOString(),
      valid_until: nextMonth.toISOString(),
      status: 'active',
      auto_apply: false,
      is_stackable: false,
    },
    {
      type: 'promo_code',
      name: 'Flash Sale',
      description: '$50 off bookings over $200',
      code: 'FLASH50',
      is_case_sensitive: false,
      scope: 'global',
      discount_type: 'fixed_amount',
      discount_value: 50.00,
      min_booking_amount_cents: 20000, // Minimum $200
      usage_limit_type: 'limited_total',
      total_usage_limit: 50,
      valid_from: now.toISOString(),
      valid_until: nextMonth.toISOString(),
      status: 'active',
      auto_apply: false,
      is_stackable: false,
    },
    {
      type: 'promo_code',
      name: 'Test Code - Unlimited',
      description: 'Test promo code with unlimited uses',
      code: 'TEST123',
      is_case_sensitive: false,
      scope: 'global',
      discount_type: 'percentage',
      discount_value: 10.00,
      min_booking_amount_cents: null, // NULL means no minimum required
      usage_limit_type: 'unlimited',
      valid_from: now.toISOString(),
      valid_until: nextYear.toISOString(),
      status: 'active',
      auto_apply: false,
      is_stackable: false,
    },
  ];
  
  const { error } = await supabase.from('promotions').upsert(promoCodes, { 
    onConflict: 'code',
    ignoreDuplicates: false 
  });
  
  if (error) {
    console.error('Error seeding promo codes:', error);
  } else {
    console.log(`✅ Seeded ${promoCodes.length} promo codes`);
    console.log('   Codes: WELCOME20, SUMMER2024, FLASH50, TEST123');
  }
}

async function seedTestUsers() {
  console.log('👤 Creating test users...');
  
  // Note: In production, users are created via Supabase Auth
  // This is a simplified example for development
  
  const testUsers = [
    {
      email: 'host1@example.com',
      password: 'Test123!@#',
      display_name: 'Ahmed Hassan',
      bio: 'Passionné de tourisme et d\'aventure au Maroc',
    },
    {
      email: 'host2@example.com',
      password: 'Test123!@#',
      display_name: 'Fatima Zahra',
      bio: 'Gérante d\'une auberge écologique à Essaouira',
    },
    {
      email: 'user1@example.com',
      password: 'Test123!@#',
      display_name: 'Pierre Martin',
      bio: 'Amateur de randonnées et de découvertes culturelles',
    },
  ];
  
  console.log('⚠️  Note: User creation requires Supabase Auth API calls.');
  console.log('Please create test users manually via Supabase Dashboard or Auth API.');
  console.log('Test users:');
  testUsers.forEach(u => console.log(`  - ${u.email} / ${u.password}`));
}

async function main() {
  console.log('🌱 Starting database seed...\n');
  
  try {
    await seedAmenities();
    await seedServices();
    await seedRoomItems();
    await seedPromoCodes();
   // await seedTestUsers();
    
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Create test users via Supabase Dashboard (Auth > Users > Add user)');
    console.log('2. Login as a test user and create a host profile');
    console.log('3. Create test experiences (lodging/trip/activity)');
    console.log('4. Upload videos and photos');
    console.log('5. Create test bookings and reviews');
    console.log('6. Test promo codes: WELCOME20, SUMMER2024, FLASH50, TEST123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();

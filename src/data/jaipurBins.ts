import { BinRecord } from '../types';
import { getRiskCategory } from '../services/riskEngine';

/**
 * WasteWise Jagatpura Ward 84 Pilot Dataset
 * All bin coordinates, fill levels, sensor logs, and collection events are
 * SYNTHETIC SIMULATIONS modeled on real Jagatpura geography in Jaipur, Rajasthan.
 */

export const JAGATPURA_CENTER: [number, number] = [26.8285, 75.8480];
export const JAGATPURA_DEFAULT_ZOOM = 13;

export const PILOT_METADATA = {
  jurisdiction: 'Jaipur Greater Municipal Corporation (NNJ Greater)',
  zone: 'Malviya Nagar & Jagatpura Administrative Zone',
  ward: 'Ward 84 (Jagatpura North, Central & South Arterials)',
  depot: 'Jagatpura Sector 26 Central Sanitation Depot',
  cartographySource: 'OpenStreetMap Contributors (ODbL) & OSRM Engine',
  simulationEngine: 'WasteWise Multi-Vehicle Dispatch Engine v2.0',
  disclaimer: 'DEMO — SIMULATED OPERATIONS: All dustbin telemetry, ultrasonic fill levels, and truck GPS locations are simulated for municipal decision-support demonstration. No real municipal sensors or live worker tracking are connected.'
};

export const INITIAL_JAIPUR_BINS: BinRecord[] = [
  // --- CRITICAL BINS (90 - 100%) ---
  {
    id: 'WW-JGT-84-01',
    code: 'WW-JGT-84-01',
    name: 'Jagatpura Railway Station - West Concourse',
    hindiName: 'जगतपुरा रेलवे स्टेशन - पश्चिमी कॉनकोर्स',
    location: {
      lat: 26.8340,
      lng: 75.8452,
      address: 'Station Road, Near Railway Crossing Phatak',
      hindiAddress: 'स्टेशन रोड, रेलवे फाटक के पास',
      landmark: 'Jagatpura Railway Station Gate #1',
      ward: 'Ward 84',
      sector: 'Railway Colony'
    },
    capacityLiters: 1100,
    currentFillPercent: 94,
    estimatedKg: 410,
    riskCategory: getRiskCategory(94), // critical
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 19:30 IST',
    dataFreshness: '4 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'High-transit commuter corridor & food vendors',
    supervisorTradeoffReason: 'High commuter density with morning tea stalls and snack vendors. Immediate spillage onto the pedestrian walkway if delayed past 8:30 AM.'
  },
  {
    id: 'WW-JGT-84-02',
    code: 'WW-JGT-84-02',
    name: 'Ramnagariya Sabzi Mandi (Vegetable Market)',
    hindiName: 'रामनगरिया सब्जी मंडी',
    location: {
      lat: 26.8250,
      lng: 75.8655,
      address: 'Mandi Link Road, Near Kisan Wholesale Shed',
      hindiAddress: 'मंडी लिंक रोड, किसान थोक शेड',
      landmark: 'Ramnagariya Farmers Market Main Gate',
      ward: 'Ward 84',
      sector: 'Ramnagariya Mandi'
    },
    capacityLiters: 2400,
    currentFillPercent: 96,
    estimatedKg: 860,
    riskCategory: getRiskCategory(96), // critical
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 15:00 IST',
    dataFreshness: '8 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Wet organic wholesale market with severe vector risk',
    supervisorTradeoffReason: 'Critical organic vegetable waste overflowing outside dumpster. Rotting produce requires urgent hydraulic compactor collection before morning wholesale auction.'
  },
  {
    id: 'WW-JGT-84-03',
    code: 'WW-JGT-84-03',
    name: 'Jagatpura Overbridge Junction (Phatak Flyover)',
    hindiName: 'जगतपुरा ओवरब्रिज तिराहा (फाटक फ्लाईओवर)',
    location: {
      lat: 26.8408,
      lng: 75.8395,
      address: 'Under Flyover Service Lane, Malviya Nagar Connector',
      hindiAddress: 'फ्लाईओवर सर्विस लेन, मालवीय नगर कनेक्टर',
      landmark: 'Flyover Pillar 14 Service Lane',
      ward: 'Ward 84',
      sector: 'Flyover North'
    },
    capacityLiters: 2400,
    currentFillPercent: 91,
    estimatedKg: 780,
    riskCategory: getRiskCategory(91), // critical
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 12:00 IST',
    dataFreshness: '2 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Primary Jaipur bypass connector lane',
    supervisorTradeoffReason: 'High-capacity dumpster overflowing into traffic lane. Servicing clears 780 kg in one stop, eliminating the largest visual and sanitary hazard at the ward gateway.'
  },
  {
    id: 'WW-JGT-84-04',
    code: 'WW-JGT-84-04',
    name: 'NRI Circle Commercial Market Hub',
    hindiName: 'एनआरआई सर्किल कमर्शियल मार्केट',
    location: {
      lat: 26.8188,
      lng: 75.8622,
      address: 'Sector 24, Main Ring Road, NRI Colony',
      hindiAddress: 'सेक्टर 24, मेन रिंग रोड, एनआरआई कॉलोनी',
      landmark: 'NRI Circle Rotary Island',
      ward: 'Ward 84',
      sector: 'Sector 24'
    },
    capacityLiters: 1100,
    currentFillPercent: 92,
    estimatedKg: 395,
    riskCategory: getRiskCategory(92), // critical
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 14:30 IST',
    dataFreshness: '12 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Weekend commercial rush created overflow of cardboard packaging and plastic cups around the rotary plaza.'
  },

  // --- HIGH BINS (75 - 89%) ---
  {
    id: 'WW-JGT-84-05',
    code: 'WW-JGT-84-05',
    name: 'Mahal Road Commercial Hub - Central Plaza',
    hindiName: 'महल रोड कमर्शियल हब - सेंट्रल प्लाजा',
    location: {
      lat: 26.8245,
      lng: 75.8570,
      address: 'Main Mahal Road, Opposite SBI Jagatpura Branch',
      hindiAddress: 'मुख्य महल रोड, एसबीआई बैंक के सामने',
      landmark: 'Mahal Road Commercial Complex',
      ward: 'Ward 84',
      sector: 'Sector 23'
    },
    capacityLiters: 1100,
    currentFillPercent: 88,
    estimatedKg: 350,
    riskCategory: getRiskCategory(88), // high
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 07:15 IST',
    dataFreshness: '14 hours ago (Stale Simulated Disconnect)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'INCOMPLETE DATA ALERT: Sensor disconnected 14h ago at 62%. Historical evening accumulation and 3 citizen complaints indicate probable 88% overflow.'
  },
  {
    id: 'WW-JGT-84-06',
    code: 'WW-JGT-84-06',
    name: 'Model Town Sector 3 - D-Block Market',
    hindiName: 'मॉडल टाउन सेक्टर 3 - डी-ब्लॉक मार्केट',
    location: {
      lat: 26.8375,
      lng: 75.8325,
      address: 'D-Block Community Center Road, Model Town',
      hindiAddress: 'डी-ब्लॉक कम्युनिटी सेंटर रोड, मॉडल टाउन',
      landmark: 'Model Town Community Hall',
      ward: 'Ward 84',
      sector: 'Model Town'
    },
    capacityLiters: 1100,
    currentFillPercent: 82,
    estimatedKg: 320,
    riskCategory: getRiskCategory(82), // high
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 06:30 IST',
    dataFreshness: '18 hours ago (Faulty Simulated Sensor)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Sensor failed to sync, but 5 citizen reports confirm bin lid cannot close. Prioritized for morning dispatch based on ground reports.'
  },
  {
    id: 'WW-JGT-84-07',
    code: 'WW-JGT-84-07',
    name: 'Central Spine Jagatpura - Retail Boulevard',
    hindiName: 'सेंट्रल स्पाइन जगतपुरा - रिटेल बुलेवार्ड',
    location: {
      lat: 26.8210,
      lng: 75.8525,
      address: 'Central Spine Road, Near Reliance Fresh',
      hindiAddress: 'सेंट्रल स्पाइन रोड, रिलायंस फ्रेश',
      landmark: 'Central Spine Commercial Plaza',
      ward: 'Ward 84',
      sector: 'Central Spine'
    },
    capacityLiters: 1100,
    currentFillPercent: 85,
    estimatedKg: 330,
    riskCategory: getRiskCategory(85), // high
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 08:00 IST',
    dataFreshness: '11 hours ago (Low Battery Alert)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Supermarket delivery trucks offload packaging waste early morning. Fast-accumulating commercial dry waste.'
  },
  {
    id: 'WW-JGT-84-08',
    code: 'WW-JGT-84-08',
    name: 'Akshay Patra Temple Perimeter - South Gate',
    hindiName: 'अक्षय पात्र मंदिर परिसर - दक्षिणी द्वार',
    location: {
      lat: 26.8168,
      lng: 75.8418,
      address: 'Hare Krishna Marg, Sector 26',
      hindiAddress: 'हरे कृष्ण मार्ग, सेक्टर 26',
      landmark: 'Akshay Patra Cultural Complex',
      ward: 'Ward 84',
      sector: 'Sector 26'
    },
    capacityLiters: 2400,
    currentFillPercent: 78,
    estimatedKg: 640,
    riskCategory: getRiskCategory(78), // high
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 16:00 IST',
    dataFreshness: '15 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Pilgrimage corridor & religious community kitchen',
    supervisorTradeoffReason: 'High organic bio-waste density. Warm morning sun accelerates odor; clearing before 9:00 AM pilgrim surge is critical.'
  },

  // --- MEDIUM BINS (50 - 74%) ---
  {
    id: 'WW-JGT-84-09',
    code: 'WW-JGT-84-09',
    name: 'Bombay Hospital Link Road - Health Clinic Arterial',
    hindiName: 'बॉम्बे हॉस्पिटल लिंक रोड - क्लिनिक मार्ग',
    location: {
      lat: 26.8312,
      lng: 75.8365,
      address: 'Near Apex & Bombay Hospital Approach Road',
      hindiAddress: 'बॉम्बे हॉस्पिटल एप्रोच रोड, मालवीय नगर बॉर्डर',
      landmark: 'Apex Heart Hospital Junction',
      ward: 'Ward 84',
      sector: 'Sector 5'
    },
    capacityLiters: 1100,
    currentFillPercent: 71,
    estimatedKg: 270,
    riskCategory: getRiskCategory(71), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 17:45 IST',
    dataFreshness: '5 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Hospital perimeter (Zero tolerance for overflow)',
    supervisorTradeoffReason: 'Medical care zone: zero tolerance for flies or clinical overflow. High priority despite moderate 71% fill.'
  },
  {
    id: 'WW-JGT-84-10',
    code: 'WW-JGT-84-10',
    name: 'SKIT Institute Educational Corridor',
    hindiName: 'एसकेआईटी कॉलेज मार्ग - मुख्य तिराहा',
    location: {
      lat: 26.8222,
      lng: 75.8692,
      address: 'Ramnagariya Knowledge Corridor',
      hindiAddress: 'रामनगरिया नॉलेज कॉरिडोर',
      landmark: 'Swami Keshvanand Institute (SKIT) Gate 2',
      ward: 'Ward 84',
      sector: 'Ramnagariya'
    },
    capacityLiters: 1100,
    currentFillPercent: 64,
    estimatedKg: 220,
    riskCategory: getRiskCategory(64), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 14:00 IST',
    dataFreshness: '6 hours ago (Model Estimated)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'College campus & hostel approach',
    supervisorTradeoffReason: 'Educational institutions have lower weekend morning generation. Can safely defer to secondary afternoon tipper shift.'
  },
  {
    id: 'WW-JGT-84-11',
    code: 'WW-JGT-84-11',
    name: 'Seven Wonders & RTO Office Road',
    hindiName: 'सेवन वंडर्स एवं आरटीओ रोड',
    location: {
      lat: 26.8268,
      lng: 75.8482,
      address: 'Near RTO Jagatpura Office & Public Garden',
      hindiAddress: 'आरटीओ जगतपुरा कार्यालय एवं सार्वजनिक पार्क',
      landmark: 'Jagatpura RTO Compound',
      ward: 'Ward 84',
      sector: 'Sector 19'
    },
    capacityLiters: 1100,
    currentFillPercent: 60,
    estimatedKg: 210,
    riskCategory: getRiskCategory(60), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 20:10 IST',
    dataFreshness: '5 hours ago (Model Estimated)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Public office closed on weekend. Evening street food generation will start after 17:00 IST.'
  },
  {
    id: 'WW-JGT-84-12',
    code: 'WW-JGT-84-12',
    name: 'Gyan Vihar University Road - North Turn',
    hindiName: 'ज्ञान विहार यूनिवर्सिटी मार्ग - उत्तरी मोड़',
    location: {
      lat: 26.8282,
      lng: 75.8585,
      address: 'Near Suresh Gyan Vihar University Gate #3',
      hindiAddress: 'सुरेश ज्ञान विहार यूनिवर्सिटी गेट 3',
      landmark: 'Gyan Vihar University Arch',
      ward: 'Ward 84',
      sector: 'Gyan Vihar'
    },
    capacityLiters: 1100,
    currentFillPercent: 54,
    estimatedKg: 185,
    riskCategory: getRiskCategory(54), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 18:20 IST',
    dataFreshness: '20 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Normal residential and student rental waste. Sufficient residual capacity remains.'
  },
  {
    id: 'WW-JGT-84-13',
    code: 'WW-JGT-84-13',
    name: 'Hare Krishna Marg Residential Enclave',
    hindiName: 'हरे कृष्ण मार्ग आवासीय एन्क्लेव',
    location: {
      lat: 26.8200,
      lng: 75.8445,
      address: 'Near Sector 26 Community Park',
      hindiAddress: 'सेक्टर 26 कम्युनिटी पार्क के समीप',
      landmark: 'Sector 26 Park West Gate',
      ward: 'Ward 84',
      sector: 'Sector 26'
    },
    capacityLiters: 1100,
    currentFillPercent: 68,
    estimatedKg: 240,
    riskCategory: getRiskCategory(68), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 11:30 IST',
    dataFreshness: '30 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Moderate domestic waste from morning household sweeping.'
  },
  {
    id: 'WW-JGT-84-14',
    code: 'WW-JGT-84-14',
    name: 'Mahal Road Wedding Gardens Belt',
    hindiName: 'महल रोड मैरिज गार्डन बेल्ट',
    location: {
      lat: 26.8220,
      lng: 75.8595,
      address: 'Mahal Road Event Corridor',
      hindiAddress: 'महल रोड मैरिज गार्डन क्षेत्र',
      landmark: 'Rajwada Marriage Garden Gate',
      ward: 'Ward 84',
      sector: 'Sector 22'
    },
    capacityLiters: 1100,
    currentFillPercent: 72,
    estimatedKg: 255,
    riskCategory: getRiskCategory(72), // medium
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 22:00 IST',
    dataFreshness: '45 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Event packaging and disposable food plates from previous night reception.'
  },

  // --- LOW BINS (0 - 49%) ---
  {
    id: 'WW-JGT-84-15',
    code: 'WW-JGT-84-15',
    name: 'NRI Colony Circle - Community Green',
    hindiName: 'एनआरआई कॉलोनी सर्किल - पार्क कॉर्नर',
    location: {
      lat: 26.8175,
      lng: 75.8640,
      address: 'Pocket 3, NRI Colony Gated Entrance',
      hindiAddress: 'पॉकेट 3, एनआरआई कॉलोनी मुख्य द्वार',
      landmark: 'NRI Residents Welfare Association Office',
      ward: 'Ward 84',
      sector: 'Sector 24'
    },
    capacityLiters: 1100,
    currentFillPercent: 42,
    estimatedKg: 140,
    riskCategory: getRiskCategory(42), // low
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 21:00 IST',
    dataFreshness: '18 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Quiet residential block. Safe to skip on primary morning manifest to save truck payload.'
  },
  {
    id: 'WW-JGT-84-16',
    code: 'WW-JGT-84-16',
    name: 'Railway Colony Sector 4 Quarters',
    hindiName: 'रेलवे कॉलोनी सेक्टर 4 क्वार्टर',
    location: {
      lat: 26.8360,
      lng: 75.8475,
      address: 'Lane 2, Railway Staff Housing',
      hindiAddress: 'लेन 2, रेलवे स्टाफ आवास',
      landmark: 'Railway Staff Welfare Center',
      ward: 'Ward 84',
      sector: 'Railway Colony'
    },
    capacityLiters: 1100,
    currentFillPercent: 35,
    estimatedKg: 115,
    riskCategory: getRiskCategory(35), // low
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 19:00 IST',
    dataFreshness: '25 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Low fill rate. Estimated 18+ hours until threshold reached.'
  },
  {
    id: 'WW-JGT-84-17',
    code: 'WW-JGT-84-17',
    name: 'Model Town Sector 2 Residential Lane',
    hindiName: 'मॉडल टाउन सेक्टर 2 आवासीय लेन',
    location: {
      lat: 26.8390,
      lng: 75.8340,
      address: 'Road No. 4, Near Sector 2 Post Office',
      hindiAddress: 'रोड नंबर 4, पोस्ट ऑफिस के समीप',
      landmark: 'Sector 2 Post Office',
      ward: 'Ward 84',
      sector: 'Model Town'
    },
    capacityLiters: 1100,
    currentFillPercent: 28,
    estimatedKg: 95,
    riskCategory: getRiskCategory(28), // low
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 16:30 IST',
    dataFreshness: '40 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Low residential load. Collection deferred to tomorrow morning.'
  },
  {
    id: 'WW-JGT-84-18',
    code: 'WW-JGT-84-18',
    name: 'Goner Road Flyover Bypass Approach',
    hindiName: 'गोनेर रोड फ्लाईओवर बाईपास एप्रोच',
    location: {
      lat: 26.8150,
      lng: 75.8550,
      address: 'Bypass Service Road, Near Ring Junction',
      hindiAddress: 'बाईपास सर्विस रोड, रिंग जंक्शन के पास',
      landmark: 'Ring Road Toll Plaza Approach',
      ward: 'Ward 84',
      sector: 'Goner Link'
    },
    capacityLiters: 1100,
    currentFillPercent: 22,
    estimatedKg: 75,
    riskCategory: getRiskCategory(22), // low
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 20:30 IST',
    dataFreshness: '50 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Recently cleared. Minimal waste generated along peripheral highway lane.'
  }
];

export function calculateOverviewMetrics(bins: BinRecord[]) {
  const totalBins = bins.length;
  const criticalBins = bins.filter((b) => b.riskCategory === 'critical').length;
  const highBins = bins.filter((b) => b.riskCategory === 'high').length;
  const mediumBins = bins.filter((b) => b.riskCategory === 'medium').length;
  const lowBins = bins.filter((b) => b.riskCategory === 'low').length;
  const collectedBins = bins.filter((b) => b.collectionStatus === 'collected').length;
  const pendingBins = totalBins - collectedBins;
  const sensitiveZoneBins = bins.filter((b) => b.sensitiveZone).length;
  const totalEstimatedWasteKg = bins.reduce((sum, b) => sum + b.estimatedKg, 0);

  const staleTelemetryBins = bins.filter((b) =>
    b.dataFreshness.toLowerCase().includes('stale') || b.dataFreshness.toLowerCase().includes('fault')
  ).length;
  const highConfidenceBins = totalBins - staleTelemetryBins;
  const telemetryIntegrityPercent = totalBins > 0 ? Math.round((highConfidenceBins / totalBins) * 100) : 100;

  return {
    totalBins,
    criticalBins,
    highBins,
    mediumBins,
    lowBins,
    collectedBins,
    pendingBins,
    sensitiveZoneBins,
    totalEstimatedWasteKg,
    activeTippers: 7,
    staleTelemetryBins,
    highConfidenceBins,
    telemetryIntegrityPercent,
  };
}

export const SAMPLE_SHIFTS = [
  {
    id: 'SHIFT-20261023-M1',
    shiftCode: 'W84-M-01',
    shiftName: 'Morning Peak Commercial & Transit Sweep',
    date: '2026-10-23',
    timeSlot: '06:00 - 10:30 IST',
    ward: 'Ward 84 (Jagatpura)',
    vehicleId: 'RJ-14-GA-4821',
    vehicleType: 'Tata 1618 Hydraulic Compactor Tipper (6.5 Ton)',
    driverCrew: 'Rajesh Sharma & V. Meena',
    servicedBinIds: ['WW-JGT-84-01', 'WW-JGT-84-02', 'WW-JGT-84-03'],
    servicedBinNames: [
      'Jagatpura Railway Station - West Concourse',
      'Ramnagariya Sabzi Mandi (Vegetable Market)',
      'Jagatpura Overbridge Junction (Phatak Flyover)'
    ],
    totalCollectedKg: 2050,
    status: 'completed' as const,
    supervisorNotes: 'Successfully cleared priority transit stops. No delays reported on station road.',
    telemetryDiscrepancyNotes: 'Station bin physical fill matched simulated sensor readings within 5% error.'
  },
  {
    id: 'SHIFT-20261023-A1',
    shiftCode: 'W84-A-01',
    shiftName: 'Afternoon Institutional & Hospital Sweep',
    date: '2026-10-23',
    timeSlot: '13:30 - 17:00 IST',
    ward: 'Ward 84 (Jagatpura)',
    vehicleId: 'RJ-14-EA-1934',
    vehicleType: 'Mahindra Bolero Hopper Tipper (2.5 Ton)',
    driverCrew: 'Kamlesh Gurjar',
    servicedBinIds: ['WW-JGT-84-08', 'WW-JGT-84-09'],
    servicedBinNames: [
      'Akshay Patra Temple Perimeter - South Gate',
      'Bombay Hospital Link Road - Health Clinic Arterial'
    ],
    totalCollectedKg: 910,
    status: 'completed' as const,
    supervisorNotes: 'Hospital corridor cleared with zero spillage. Odor mitigation protocol applied at Akshay Patra south gate.'
  }
];


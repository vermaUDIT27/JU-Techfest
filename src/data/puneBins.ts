// ==========================================
// SANCHAYA Pune Edition - Coherent Bin Inventory & Demo Scenario Telemetry
// ==========================================

import { 
  BinRecord, 
  RiskLevel, 
  FillThresholdStatus, 
  FillReadingSource, 
  FillThresholdConfig, 
  DEFAULT_DEMO_THRESHOLDS 
} from '../types';

export { DEFAULT_DEMO_THRESHOLDS };

/**
 * Derives operational threshold band based on prototype configurable defaults:
 * - Normal: below 70%
 * - High: 70–84%
 * - Critical: 85–99%
 * - Full: 100%
 * 
 * Note: These are prototype defaults for demonstration and testing, not verified municipal policy.
 */
export function getBinThresholdStatus(
  fillPercent: number,
  config: FillThresholdConfig = DEFAULT_DEMO_THRESHOLDS
): FillThresholdStatus {
  const fill = Math.max(0, Math.min(100, Number(fillPercent) || 0));
  if (fill >= config.fullMin) return 'full';
  if (fill >= 85) return 'critical';
  if (fill >= 70) return 'high';
  return 'normal';
}

/**
 * Derives risk category from fill percent for backward compatibility with existing risk engines
 */
export function getRiskCategory(fillPercent: number): RiskLevel {
  const fill = Math.max(0, Math.min(100, Number(fillPercent) || 0));
  if (fill >= 85) return 'critical';
  if (fill >= 70) return 'high';
  if (fill >= 40) return 'medium';
  return 'low';
}

export const DEMO_SCENARIO_METADATA = {
  scenarioName: 'Pune Central & Suburban Civic Demo Scenario',
  scenarioVersion: '2.0.0',
  description: 'Simulated operational bin inventory and telemetry for end-to-end workflow demonstration. Separate from source-reported PMC macro statistics.',
  thresholds: DEFAULT_DEMO_THRESHOLDS,
  isSimulated: true,
  notice: 'The supplied Pune master dataset does not contain verified GPS coordinates or live fill percentages for individual bins. These demo records are explicitly marked as simulated.',
};

/**
 * Demo scenario dataset containing verified Pune landmarks, simulated telemetry,
 * and explicit locationUnavailable bins for unmapped areas.
 */
export const INITIAL_PUNE_BINS: BinRecord[] = [
  // --- FULL BINS (100%) ---
  {
    id: 'WW-PUN-00',
    code: 'WW-PUN-00',
    name: 'Kasba Peth - Tambat Ali Brass Artisans Quarter',
    marathiName: 'कसबा पेठ - तांबट आळी परिसर',
    hindiName: 'कसबा पेठ - तांबट आळी',
    wardId: 'pune-ward-15',
    colonyName: 'Tambat Ali Artisan Quarter',
    location: {
      lat: 18.5218,
      lng: 73.8569,
      address: 'Tambat Ali, Kasba Peth, Pune',
      marathiAddress: 'तांबट आळी, कसबा पेठ, पुणे',
      landmark: 'Old Wooden Ganpati Temple Corridor',
      ward: 'Kasba Vishrambaugh Wada',
      sector: 'Kasba Peth',
    },
    locationUnavailable: false,
    capacityLiters: 2400,
    currentFillPercent: 100,
    readingSource: 'simulated',
    fillThresholdStatus: 'full',
    estimatedKg: 980,
    riskCategory: 'critical',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-4821',
    assignedDriverId: 'DRV-PMC-01',
    assignedStopOrder: 1,
    lastCollectionTime: 'Yesterday, 17:00 IST',
    lastCollectionTimestamp: '2026-10-23T11:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:00:00Z',
    collectionHistory: [
      { timestamp: '2026-10-23T11:30:00Z', truckId: 'MH-12-PMC-4821', result: 'collected', weightKg: 920 },
      { timestamp: '2026-10-22T10:45:00Z', truckId: 'MH-12-PMC-4821', result: 'collected', weightKg: 890 },
    ],
    dataFreshness: '2 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Heritage dense handicraft and residential quarter',
    supervisorTradeoffReason: 'Overflowing bin requires immediate clearance before morning rush.',
  },

  // --- CRITICAL BINS (85–99%) ---
  {
    id: 'WW-PUN-01',
    code: 'WW-PUN-01',
    name: 'Shaniwar Wada Heritage Concourse & Market',
    marathiName: 'शनिवार वाडा परिसर व बाजार',
    hindiName: 'शनिवार वाडा हेरिटेज मार्केट',
    wardId: 'pune-ward-15',
    colonyName: 'Shaniwar Wada Heritage Precinct',
    location: {
      lat: 18.5196,
      lng: 73.8553,
      address: 'Bajirao Road, Kasba Peth, Pune',
      marathiAddress: 'बाजीराव रस्ता, कसबा पेठ, पुणे',
      landmark: 'Delhi Darwaza, Shaniwar Wada',
      ward: 'Kasba Vishrambaugh Wada',
      sector: 'Kasba Peth',
    },
    locationUnavailable: false,
    capacityLiters: 2400,
    currentFillPercent: 96,
    readingSource: 'simulated',
    fillThresholdStatus: 'critical',
    estimatedKg: 820,
    riskCategory: 'critical',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-4821',
    assignedDriverId: 'DRV-PMC-01',
    assignedStopOrder: 2,
    lastCollectionTime: 'Yesterday, 19:30 IST',
    lastCollectionTimestamp: '2026-10-23T14:00:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:10:00Z',
    collectionHistory: [
      { timestamp: '2026-10-23T14:00:00Z', truckId: 'MH-12-PMC-4821', result: 'collected', weightKg: 810 },
    ],
    dataFreshness: '4 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'High-density tourist heritage precinct & pedestrian marketplace',
    supervisorTradeoffReason: 'Rapid bio-waste accumulation from morning market vendors. Peak morning footfall requires immediate clearing.',
  },
  {
    id: 'WW-PUN-02',
    code: 'WW-PUN-02',
    name: 'Mandai Market - Central Vegetable Pavilion',
    marathiName: 'महात्मा फुले मंडई - भाजीपाला विभाग',
    hindiName: 'महात्मा फुले मंडी सब्जी बाजार',
    wardId: 'pune-ward-15',
    colonyName: 'Mandai Wholesale Market',
    location: {
      lat: 18.5132,
      lng: 73.8561,
      address: 'Mahatma Phule Mandai, Shukrawar Peth',
      marathiAddress: 'महात्मा फुले मंडई, शुक्रवार पेठ',
      landmark: 'Burud Ali Junction',
      ward: 'Kasba Vishrambaugh Wada',
      sector: 'Shukrawar Peth',
    },
    locationUnavailable: false,
    capacityLiters: 3200,
    currentFillPercent: 94,
    readingSource: 'simulated',
    fillThresholdStatus: 'critical',
    estimatedKg: 1140,
    riskCategory: 'critical',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-4821',
    assignedDriverId: 'DRV-PMC-01',
    assignedStopOrder: 3,
    lastCollectionTime: 'Yesterday, 21:00 IST',
    lastCollectionTimestamp: '2026-10-23T15:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:05:00Z',
    collectionHistory: [
      { timestamp: '2026-10-23T15:30:00Z', truckId: 'MH-12-PMC-4821', result: 'collected', weightKg: 1120 },
    ],
    dataFreshness: '7 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Wholesale produce market corridor',
    supervisorTradeoffReason: 'Heavy organic waste density. Moisture and ambient heat accelerate decomposition odor.',
  },
  {
    id: 'WW-PUN-03',
    code: 'WW-PUN-03',
    name: 'Swargate Bus Terminal & Metro Interchange',
    marathiName: 'स्वारगेट बस स्थानक व मेट्रो जंक्शन',
    hindiName: 'स्वारगेट बस स्टैंड व मेट्रो स्टेशन',
    wardId: 'pune-ward-15',
    colonyName: 'Swargate Multimodal Interchange',
    location: {
      lat: 18.5012,
      lng: 73.8584,
      address: 'Shivaji Road, Swargate Bus Stand',
      marathiAddress: 'शिवाजी रस्ता, स्वारगेट',
      landmark: 'Swargate Underground Metro Gate 2',
      ward: 'Kasba Vishrambaugh Wada',
      sector: 'Swargate',
    },
    locationUnavailable: false,
    capacityLiters: 1800,
    currentFillPercent: 92,
    readingSource: 'sensor',
    fillThresholdStatus: 'critical',
    estimatedKg: 620,
    riskCategory: 'critical',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-4821',
    assignedDriverId: 'DRV-PMC-01',
    assignedStopOrder: 4,
    lastCollectionTime: 'Today, 04:30 IST',
    lastCollectionTimestamp: '2026-10-23T23:00:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:02:00Z',
    collectionHistory: [
      { timestamp: '2026-10-23T23:00:00Z', truckId: 'MH-12-PMC-4821', result: 'collected', weightKg: 600 },
    ],
    dataFreshness: '12 mins ago (Pilot Ultrasonic Sensor)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Primary intercity transit hub & multimodal interchange',
    supervisorTradeoffReason: 'Intercity commuters deposit continuous single-use food packaging; morning peak overflow risk.',
  },
  {
    id: 'WW-PUN-04',
    code: 'WW-PUN-04',
    name: 'Fergusson College Road - Cafe Boulevard',
    marathiName: 'फर्ग्युसन कॉलेज रस्ता',
    hindiName: 'फर्ग्युसन कॉलेज रोड कैफे एरिया',
    wardId: 'pune-ward-8',
    colonyName: 'Deccan Gymkhana Boulevard',
    location: {
      lat: 18.5236,
      lng: 73.8415,
      address: 'FC Road, Deccan Gymkhana',
      marathiAddress: 'एफसी रस्ता, डेक्कन जिमखाना',
      landmark: 'Goodluck Chowk Junction',
      ward: 'Shivaji Nagar-Ghole Road',
      sector: 'Deccan',
    },
    locationUnavailable: false,
    capacityLiters: 1500,
    currentFillPercent: 91,
    readingSource: 'simulated',
    fillThresholdStatus: 'critical',
    estimatedKg: 490,
    riskCategory: 'critical',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-5134',
    assignedDriverId: 'DRV-PMC-02',
    assignedStopOrder: 1,
    lastCollectionTime: 'Yesterday, 22:15 IST',
    lastCollectionTimestamp: '2026-10-23T16:45:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:12:00Z',
    collectionHistory: [
      { timestamp: '2026-10-23T16:45:00Z', truckId: 'MH-12-PMC-5134', result: 'collected', weightKg: 470 },
    ],
    dataFreshness: '2 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Student hub & evening commercial dining stretch',
    supervisorTradeoffReason: 'High volume of dry packaging from student retail corridors.',
  },

  // --- HIGH BINS (70–84%) ---
  {
    id: 'WW-PUN-05',
    code: 'WW-PUN-05',
    name: 'Savitribai Phule Pune University Main Gate',
    marathiName: 'पुणे विद्यापीठ मुख्य प्रवेशद्वार',
    hindiName: 'पुणे यूनिवर्सिटी मुख्य द्वार',
    wardId: 'pune-ward-8',
    colonyName: 'Ganeshkhind University Campus',
    location: {
      lat: 18.5529,
      lng: 73.8266,
      address: 'Ganeshkhind Road, University Circle',
      marathiAddress: 'गणेशखिंड रस्ता, विद्यापीठ चौक',
      landmark: 'SPPU Heritage Arch',
      ward: 'Shivaji Nagar-Ghole Road',
      sector: 'Ganeshkhind',
    },
    locationUnavailable: false,
    capacityLiters: 1800,
    currentFillPercent: 84,
    readingSource: 'sensor',
    fillThresholdStatus: 'high',
    estimatedKg: 580,
    riskCategory: 'high',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-5134',
    assignedDriverId: 'DRV-PMC-02',
    assignedStopOrder: 2,
    lastCollectionTime: 'Yesterday, 17:00 IST',
    lastCollectionTimestamp: '2026-10-23T11:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:00:00Z',
    collectionHistory: [],
    dataFreshness: '14 mins ago (Pilot Sensor)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Morning university commuter surge on Ganeshkhind arterial.',
  },
  {
    id: 'WW-PUN-06',
    code: 'WW-PUN-06',
    name: 'Kothrud Depot & Karve Statue Circle',
    marathiName: 'कोथरूड डेपो व कर्वे पुतळा चौक',
    hindiName: 'कोथरूड डिपो व कर्वे सर्कल',
    wardId: 'pune-ward-10',
    colonyName: 'Karvenagar Commercial Sector',
    location: {
      lat: 18.5042,
      lng: 73.8115,
      address: 'Karve Road, Kothrud',
      marathiAddress: 'कर्वे रस्ता, कोथरूड',
      landmark: 'Maharshi Karve Statue',
      ward: 'Kothrud Bavdhan',
      sector: 'Kothrud',
    },
    locationUnavailable: false,
    capacityLiters: 2200,
    currentFillPercent: 82,
    readingSource: 'simulated',
    fillThresholdStatus: 'high',
    estimatedKg: 690,
    riskCategory: 'high',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-3912',
    assignedDriverId: 'DRV-PMC-03',
    assignedStopOrder: 1,
    lastCollectionTime: 'Yesterday, 18:30 IST',
    lastCollectionTimestamp: '2026-10-23T13:00:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:08:00Z',
    collectionHistory: [],
    dataFreshness: '6 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Major transit arterial for western Pune suburbs.',
  },
  {
    id: 'WW-PUN-07',
    code: 'WW-PUN-07',
    name: 'Paud Road - MIT College Transit Point',
    marathiName: 'पौड रस्ता - एमआयटी कॉलेज कॉर्नर',
    hindiName: 'पौड रोड एमआईटी कॉलेज',
    wardId: 'pune-ward-10',
    colonyName: 'Rambaug Colony',
    location: {
      lat: 18.5152,
      lng: 73.8188,
      address: 'Paud Road, Rambaug Colony',
      marathiAddress: 'पौड रस्ता, रामबाग कॉलनी',
      landmark: 'MIT World Peace University Approach',
      ward: 'Kothrud Bavdhan',
      sector: 'Paud Road',
    },
    locationUnavailable: false,
    capacityLiters: 1600,
    currentFillPercent: 78,
    readingSource: 'simulated',
    fillThresholdStatus: 'high',
    estimatedKg: 460,
    riskCategory: 'high',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-3912',
    assignedDriverId: 'DRV-PMC-03',
    assignedStopOrder: 2,
    lastCollectionTime: 'Yesterday, 16:45 IST',
    lastCollectionTimestamp: '2026-10-23T11:15:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:05:00Z',
    collectionHistory: [],
    dataFreshness: '9 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'High residential density and academic transit corridor.',
  },
  {
    id: 'WW-PUN-08',
    code: 'WW-PUN-08',
    name: 'Magarpatta City - Cybercity North Gate',
    marathiName: 'मगरपट्टा सायबरसिटी उत्तर गेट',
    hindiName: 'मगरपट्टा साइबरसिटी नॉर्थ गेट',
    wardId: 'pune-ward-22',
    colonyName: 'Magarpatta Cybercity Tech Zone',
    location: {
      lat: 18.5158,
      lng: 73.9284,
      address: 'Magarpatta Road, Hadapsar',
      marathiAddress: 'मगरपट्टा रस्ता, हडपसर',
      landmark: 'Tower 4 IT Complex Approach',
      ward: 'Hadapsar Mundhwa',
      sector: 'Magarpatta',
    },
    locationUnavailable: false,
    capacityLiters: 2400,
    currentFillPercent: 82,
    readingSource: 'sensor',
    fillThresholdStatus: 'high',
    estimatedKg: 740,
    riskCategory: 'high',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-6201',
    assignedDriverId: 'DRV-PMC-04',
    assignedStopOrder: 1,
    lastCollectionTime: 'Yesterday, 20:00 IST',
    lastCollectionTimestamp: '2026-10-23T14:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:11:00Z',
    collectionHistory: [],
    dataFreshness: '3 mins ago (Pilot IoT)',
    isSimulated: true,
    sensitiveZone: true,
    sensitiveZoneType: 'Major IT tech-park gateway & commercial hub',
    supervisorTradeoffReason: 'Heavy cafeteria dry waste generation during night shifts.',
  },
  {
    id: 'WW-PUN-09',
    code: 'WW-PUN-09',
    name: 'Hadapsar Gadital - Solapur Highway Stand',
    marathiName: 'हडपसर गाडीतळ - सोलापूर महामार्ग',
    hindiName: 'हडपसर गाड़ीतल सोलापुर हाईवे',
    wardId: 'pune-ward-22',
    colonyName: 'Hadapsar Gadital Commercial Zone',
    location: {
      lat: 18.5025,
      lng: 73.9312,
      address: 'Pune-Solapur Road, Hadapsar',
      marathiAddress: 'पुणे-सोलापूर महामार्ग, हडपसर',
      landmark: 'Gadital ST Terminal',
      ward: 'Hadapsar Mundhwa',
      sector: 'Gadital',
    },
    locationUnavailable: false,
    capacityLiters: 2000,
    currentFillPercent: 77,
    readingSource: 'simulated',
    fillThresholdStatus: 'high',
    estimatedKg: 580,
    riskCategory: 'high',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-6201',
    assignedDriverId: 'DRV-PMC-04',
    assignedStopOrder: 2,
    lastCollectionTime: 'Yesterday, 19:15 IST',
    lastCollectionTimestamp: '2026-10-23T13:45:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:03:00Z',
    collectionHistory: [],
    dataFreshness: '11 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Busy highway entrance with constant market and commuter littering.',
  },

  // --- NORMAL BINS (< 70%) ---
  {
    id: 'WW-PUN-10',
    code: 'WW-PUN-10',
    name: 'Viman Nagar - Symbiosis Campus Lane',
    marathiName: 'विमान नगर - सिम्बायोसिस मार्ग',
    hindiName: 'विमान नगर सिम्बायोसिस लेन',
    wardId: 'pune-ward-3',
    colonyName: 'Viman Nagar Resident Area',
    location: {
      lat: 18.5635,
      lng: 73.9125,
      address: 'New Airport Road, Viman Nagar',
      marathiAddress: 'नवीन विमानतळ रस्ता, विमान नगर',
      landmark: 'Phoenix Marketcity West Lane',
      ward: 'Nagar Road-Wadgaon Sheri',
      sector: 'Viman Nagar',
    },
    locationUnavailable: false,
    capacityLiters: 1500,
    currentFillPercent: 68,
    readingSource: 'manual',
    fillThresholdStatus: 'normal',
    estimatedKg: 380,
    riskCategory: 'medium',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-1845',
    assignedDriverId: 'DRV-PMC-05',
    assignedStopOrder: 1,
    lastCollectionTime: 'Today, 06:00 IST',
    lastCollectionTimestamp: '2026-10-24T00:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T02:56:00Z',
    collectionHistory: [],
    dataFreshness: '18 mins ago (Sanitation Supervisor Log)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'High residential D2D coverage maintains manageable street accumulation.',
  },
  {
    id: 'WW-PUN-11',
    code: 'WW-PUN-11',
    name: 'Aundh - Bremen Chowk Commercial Crossing',
    marathiName: 'औंध - ब्रेमेन चौक',
    hindiName: 'औंध ब्रेमेन चौक क्रॉसिंग',
    wardId: 'pune-ward-8',
    colonyName: 'Bremen Chowk Aundh',
    location: {
      lat: 18.5604,
      lng: 73.8082,
      address: 'Aundh-Ravet BRTS Road',
      marathiAddress: 'औंध-रावेत बीआरटीएस रस्ता',
      landmark: 'Spicer College Junction',
      ward: 'Aundh Baner',
      sector: 'Aundh',
    },
    locationUnavailable: false,
    capacityLiters: 1800,
    currentFillPercent: 64,
    readingSource: 'simulated',
    fillThresholdStatus: 'normal',
    estimatedKg: 430,
    riskCategory: 'medium',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-1845',
    assignedDriverId: 'DRV-PMC-05',
    assignedStopOrder: 2,
    lastCollectionTime: 'Today, 05:45 IST',
    lastCollectionTimestamp: '2026-10-24T00:15:00Z',
    lastUpdatedTimestamp: '2026-10-24T02:52:00Z',
    collectionHistory: [],
    dataFreshness: '22 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Moderate commercial waste volume.',
  },
  {
    id: 'WW-PUN-12',
    code: 'WW-PUN-12',
    name: 'Bibwewadi - Chintamani Dnyanpeeth Lane',
    marathiName: 'बिबवेवाडी - चिंतामणी नगर',
    hindiName: 'बिबवेवाड़ी चिंतामणि नगर',
    wardId: 'pune-ward-35',
    colonyName: 'Chintamani Nagar Phase 1',
    location: {
      lat: 18.4782,
      lng: 73.8645,
      address: 'Bibwewadi Main Road',
      marathiAddress: 'बिबवेवाडी मुख्य रस्ता',
      landmark: 'Kokane Hospital Junction',
      ward: 'Bibwewadi',
      sector: 'Bibwewadi',
    },
    locationUnavailable: false,
    capacityLiters: 1500,
    currentFillPercent: 58,
    readingSource: 'manual',
    fillThresholdStatus: 'normal',
    estimatedKg: 320,
    riskCategory: 'medium',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-7422',
    assignedDriverId: 'DRV-PMC-06',
    assignedStopOrder: 1,
    lastCollectionTime: 'Today, 06:15 IST',
    lastCollectionTimestamp: '2026-10-24T00:45:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:09:00Z',
    collectionHistory: [],
    dataFreshness: '5 mins ago (Supervisor Check)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Medium residential area.',
  },
  {
    id: 'WW-PUN-13',
    code: 'WW-PUN-13',
    name: 'Dhankawadi - Ambegaon Pathar Market Stand',
    marathiName: 'धनकवडी - आंबेगाव पठार',
    hindiName: 'धनकवड़ी आंबेगांव पठार बाजार',
    wardId: 'pune-ward-39',
    colonyName: 'Ambegaon Pathar Foothills',
    location: {
      lat: 18.4552,
      lng: 73.8492,
      address: 'Dhankawadi Road, Near Bharati Vidyapeeth',
      marathiAddress: 'धनकवडी रस्ता, भारती विद्यापीठ जवळ',
      landmark: 'Bharati Vidyapeeth Campus Gate 1',
      ward: 'Dhanawadi Sahakarnagar',
      sector: 'Dhankawadi',
    },
    locationUnavailable: false,
    capacityLiters: 1800,
    currentFillPercent: 54,
    readingSource: 'simulated',
    fillThresholdStatus: 'normal',
    estimatedKg: 350,
    riskCategory: 'medium',
    collectionStatus: 'assigned',
    assignedTruckId: 'MH-12-PMC-8119',
    assignedDriverId: 'DRV-PMC-07',
    assignedStopOrder: 1,
    lastCollectionTime: 'Today, 05:30 IST',
    lastCollectionTimestamp: '2026-10-24T00:00:00Z',
    lastUpdatedTimestamp: '2026-10-24T03:06:00Z',
    collectionHistory: [],
    dataFreshness: '8 mins ago (Simulated IoT)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Rapidly growing residential sector. Handled by morning tipper.',
  },

  // --- EXPLICIT UNMAPPED / LOCATION-UNAVAILABLE BINS ---
  // (Fulfills Priority 2 & 3: Do not render bins at missing coordinates; provide clear explicit state)
  {
    id: 'WW-PUN-14',
    code: 'WW-PUN-14',
    name: 'Kondhwa Khurd - Composite Ward 42 Transit Point',
    marathiName: 'कोंढवा खुर्द - प्रभाग ४२ परिसर',
    hindiName: 'कोंढवा खुर्द - वार्ड 42 ट्रांजिट',
    wardId: 'pune-ward-42',
    colonyName: 'Kondhwa-Yelwalewadi Unsurveyed Cluster',
    location: {
      lat: 0,
      lng: 0,
      address: 'Kondhwa-Yelwalewadi Belt (Unmapped)',
      marathiAddress: 'कोंढवा-येळवलेवाडी परिसर (नकाशा अनुपलब्ध)',
      landmark: 'Survey point pending GPS capture',
      ward: 'Ward 42 Ambiguous Belt',
      sector: 'Kondhwa Khurd',
    },
    locationUnavailable: true, // EXPLICIT LOCATION UNAVAILABLE
    capacityLiters: 1800,
    currentFillPercent: 88,
    readingSource: 'manual',
    fillThresholdStatus: 'critical',
    estimatedKg: 540,
    riskCategory: 'critical',
    collectionStatus: 'unassigned',
    lastCollectionTime: 'Yesterday, 14:00 IST',
    lastCollectionTimestamp: '2026-10-23T08:30:00Z',
    lastUpdatedTimestamp: '2026-10-24T02:40:00Z',
    collectionHistory: [],
    dataFreshness: '34 mins ago (Manual Field Log - GPS Unavailable)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Survey coordinates pending municipal geocoding. High fill reported via supervisor phone.',
  },
  {
    id: 'WW-PUN-15',
    code: 'WW-PUN-15',
    name: 'Dhanawadi Sahakarnagar - Unmapped Colony Bin B',
    marathiName: 'धनकवडी सहकारनगर - अवर्गीकृत परिसर',
    hindiName: 'धनकवड़ी सहकारनगर - गैर-मानचित्रित कचरा पात्र',
    wardId: 'pune-ward-39',
    colonyName: 'Sahakarnagar Extended Sector 4',
    location: {
      lat: 0,
      lng: 0,
      address: 'Sahakarnagar Slopes (Unmapped)',
      marathiAddress: 'सहकारनगर टेकडी उतार',
      landmark: 'Unregistered community corner',
      ward: 'Dhanawadi Sahakarnagar',
      sector: 'Sahakarnagar Slopes',
    },
    locationUnavailable: true, // EXPLICIT LOCATION UNAVAILABLE
    capacityLiters: 1100,
    currentFillPercent: 62,
    readingSource: 'manual',
    fillThresholdStatus: 'normal',
    estimatedKg: 280,
    riskCategory: 'medium',
    collectionStatus: 'unassigned',
    lastCollectionTime: '2 days ago',
    lastCollectionTimestamp: '2026-10-22T09:00:00Z',
    lastUpdatedTimestamp: '2026-10-24T01:30:00Z',
    collectionHistory: [],
    dataFreshness: '2 hrs ago (Field Estimate)',
    isSimulated: true,
    sensitiveZone: false,
    supervisorTradeoffReason: 'Manual estimate without automated sensor telemetry.',
  },
];

export const PUNE_DEMO_SCENARIO_BINS = INITIAL_PUNE_BINS;

/**
 * Calculates operational metrics across the active bin inventory,
 * deriving counts for Normal, High, Critical, Full, Stale, and Location Unavailable.
 */
export function calculateOverviewMetrics(
  bins: BinRecord[],
  config: FillThresholdConfig = DEFAULT_DEMO_THRESHOLDS
) {
  const totalBins = bins.length;

  // Exact threshold groupings:
  // Full: 100%
  const fullBins = bins.filter((b) => b.currentFillPercent >= config.fullMin).length;
  // Critical: 85 - 99%
  const criticalBins = bins.filter(
    (b) => b.currentFillPercent >= 85 && b.currentFillPercent < config.fullMin
  ).length;
  // High: 70 - 84%
  const highBins = bins.filter(
    (b) => b.currentFillPercent >= 70 && b.currentFillPercent < 85
  ).length;
  // Normal: < 70%
  const normalBins = bins.filter((b) => b.currentFillPercent < 70).length;

  // Medium and Low for backward-compatible risk helpers
  const mediumBins = bins.filter((b) => b.currentFillPercent >= 50 && b.currentFillPercent < 70).length;
  const lowBins = bins.filter((b) => b.currentFillPercent < 50).length;

  // Collection progress
  const collectedBins = bins.filter((b) => b.collectionStatus === 'collected').length;
  const pendingBins = totalBins - collectedBins;

  // Critical bins awaiting collection (fill >= 85% and NOT collected)
  const criticalAwaitingCollection = bins.filter(
    (b) => b.currentFillPercent >= 85 && b.collectionStatus !== 'collected'
  ).length;

  // Telemetry freshness & location availability
  const locationUnavailableCount = bins.filter((b) => b.locationUnavailable).length;
  const staleTelemetryBins = bins.filter((b) =>
    b.dataFreshness.toLowerCase().includes('stale') ||
    b.dataFreshness.toLowerCase().includes('fault') ||
    b.dataFreshness.toLowerCase().includes('unavailable')
  ).length;

  const staleOrUnavailableBins = bins.filter((b) =>
    b.locationUnavailable ||
    b.dataFreshness.toLowerCase().includes('stale') ||
    b.dataFreshness.toLowerCase().includes('fault') ||
    b.dataFreshness.toLowerCase().includes('unavailable')
  ).length;

  const highConfidenceBins = totalBins - staleOrUnavailableBins;
  const telemetryIntegrityPercent = totalBins > 0 ? Math.round((highConfidenceBins / totalBins) * 100) : 100;

  const sensitiveZoneBins = bins.filter((b) => b.sensitiveZone).length;
  const totalEstimatedWasteKg = bins.reduce((sum, b) => sum + (Number(b.estimatedKg) || 0), 0);

  // Reading sources
  const simulatedCount = bins.filter((b) => b.readingSource === 'simulated' || (!b.readingSource && b.isSimulated)).length;
  const sensorCount = bins.filter((b) => b.readingSource === 'sensor').length;
  const manualCount = bins.filter((b) => b.readingSource === 'manual').length;

  return {
    totalBins,
    fullBins,
    criticalBins,
    highBins,
    normalBins,
    mediumBins,
    lowBins,
    criticalAwaitingCollection,
    collectedBins,
    pendingBins,
    sensitiveZoneBins,
    totalEstimatedWasteKg,
    activeTippers: 7,
    staleTelemetryBins,
    staleOrUnavailableBins,
    locationUnavailableCount,
    highConfidenceBins,
    telemetryIntegrityPercent,
    simulatedCount,
    sensorCount,
    manualCount,
    verifiedCount: 0, // Master dataset does NOT have verified GPS/sensor telemetry
  };
}

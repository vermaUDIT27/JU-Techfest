import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Layers,
  Search
} from 'lucide-react';
import { getDataQualityReport, getAllWards } from '../../data/puneData';

interface IssueRecord {
  id: string;
  issue: string;
  affectedRecords: string;
  whyItMatters: string;
  recommendedAction: string;
  status: 'Preserved Separately' | 'Unassigned (Preserved)' | 'Transparently Disclosed' | 'Operational Caveat' | 'Capacity Constraint';
  statusColor: string;
  plainLanguageSummary: string;
  technicalDetails: {
    label: string;
    value: string | React.ReactNode;
  }[];
}

export const DataQualityView: React.FC = () => {
  const dataQuality = getDataQualityReport();
  const wards = getAllWards();

  const [expandedIssueId, setExpandedIssueId] = useState<string | null>('issue-ward-39');
  const [filterQuery, setFilterQuery] = useState('');

  const ward39Records = wards.filter((w) => w.source_ward_id.includes('39') || w.ward_number_raw === '39');
  const ward42Record = wards.find((w) => w.source_ward_id.includes('42'));

  const issues: IssueRecord[] = [
    {
      id: 'issue-ward-39',
      issue: 'Duplicate Ward 39 Records in Source Spreadsheets',
      affectedRecords: '2 Ward Records (Dhankawadi vs Navi Peth)',
      whyItMatters: 'Two distinct geographic areas in Pune share the same ward number (39) in official spreadsheets, with different administrative zones, populations, and waste tonnages. Merging or averaging them would falsify real civic metrics.',
      recommendedAction: 'Preserve both records with unique internal IDs. Disclose both to municipal heads rather than silently merging them.',
      status: 'Preserved Separately',
      statusColor: 'bg-amber-100 text-amber-900 border-amber-300',
      plainLanguageSummary: 'The source data contains two different places both named "Ward 39": one in Dhanawadi Sahakarnagar (44 tonnes waste/day) and one in Kasba Vishrambaugh Wada (46 tonnes waste/day). SANCHAYA keeps both records safe and distinct.',
      technicalDetails: [
        {
          label: 'Record A',
          value: 'Ward 39 Dhankawadi-Ambegaon Pathar • Zone: Dhanawadi Sahakarnagar • Waste: 44.00 Tonnes/Day • Households: 59,265 • Internal ID: pune-ward-39-dhanawadi',
        },
        {
          label: 'Record B',
          value: 'Ward 39 Navi Peth-Parvati • Zone: Kasba Vishrambaugh Wada • Waste: 46.32 Tonnes/Day • Households: 86,159 • Internal ID: pune-ward-39-kasba',
        },
        {
          label: 'Resolution Rule',
          value: 'Neither record is discarded or averaged. Unique internal IDs guarantee distinct API access and database storage.',
        },
      ],
    },
    {
      id: 'issue-ward-42',
      issue: 'Composite Multi-Zone Ward 42',
      affectedRecords: 'Ward 42 (Raw: "42(12,7,10,8,9)")',
      whyItMatters: 'Ward 42 lists five different administrative zones in its name. Assigning it to any single zone would distort that zone’s budget, truck allocations, and waste workload.',
      recommendedAction: 'Leave zone assignment as Unassigned (null) until official PMC ward demarcation files are released.',
      status: 'Unassigned (Preserved)',
      statusColor: 'bg-amber-100 text-amber-900 border-amber-300',
      plainLanguageSummary: 'Ward 42 spans five separate municipal zones in its title. Rather than guessing which zone it belongs to, SANCHAYA marks it as unassigned so operators can make transparent decisions.',
      technicalDetails: [
        {
          label: 'Raw Source Label',
          value: '"42(12,7,10,8,9)" — Kondhwa-Yelwalewadi, Dhankawadi-Sahakanagar, Hadapsar-Mundhwa, Sinhagad Road, Warje-Karvenagar',
        },
        {
          label: 'Reported Metrics',
          value: 'Daily Waste: 76.00 Tonnes/Day • Households: 64,529 • Street Bins: 110',
        },
        {
          label: 'Resolution Rule',
          value: 'Preserved with zone_name: null and zone_assignment_status: "ambiguous_source_value". Counted in citywide totals, excluded from single-zone totals.',
        },
      ],
    },
    {
      id: 'issue-missing-fleet',
      issue: 'Missing Vehicle Counts for 27 Out of 42 Wards',
      affectedRecords: '27 Ward Records (Blank in Source)',
      whyItMatters: 'Only 15 wards have recorded vehicle counts in the source spreadsheets. Treating missing numbers as zero would falsely claim those wards have no garbage trucks.',
      recommendedAction: 'Clearly display missing vehicle data as "Unknown / Not Reported". Never convert missing values into 0 or fake numbers.',
      status: 'Transparently Disclosed',
      statusColor: 'bg-blue-100 text-blue-900 border-blue-300',
      plainLanguageSummary: 'Official spreadsheets only list vehicle counts for 15 wards (totaling 2,125 trucks). The other 27 wards are blank. SANCHAYA labels these as "Not Reported" instead of inventing numbers.',
      technicalDetails: [
        {
          label: 'Populated Records',
          value: '15 wards report 2,125 total vehicles across compactor, tipper, and mini-truck categories.',
        },
        {
          label: 'Unpopulated Records',
          value: '27 wards are null/blank in source spreadsheets.',
        },
        {
          label: 'Resolution Rule',
          value: 'Field vehicle_count_reported remains null. UI displays "Unknown (Not Reported)".',
        },
      ],
    },
    {
      id: 'issue-d2d-coverage',
      issue: 'Door-to-Door Listing Coverage Gap',
      affectedRecords: 'Citywide (42 Wards)',
      whyItMatters: 'Only 939,121 households are listed under daily door-to-door collection, out of 4,294,227 total reported households (~21.9% listing rate). This shows high reliance on public street bins.',
      recommendedAction: 'Display Door-to-Door coverage share explicitly alongside total households. Do not assume 100% door-to-door coverage.',
      status: 'Operational Caveat',
      statusColor: 'bg-purple-100 text-purple-900 border-purple-300',
      plainLanguageSummary: 'About 22% of reported households are officially listed for daily doorstep pickup. The rest rely on public street dustbins. Route plans must balance doorstep collection with street bin clearing.',
      technicalDetails: [
        {
          label: 'Reported Households',
          value: '4,294,227 total households across 42 wards.',
        },
        {
          label: 'D2D Listed Households',
          value: '939,121 households listed under daily collection.',
        },
        {
          label: 'Operational Impact',
          value: 'Street bins (5,569 reported) remain critical collection nodes, requiring systematic truck routes.',
        },
      ],
    },
    {
      id: 'issue-landfill-capacity',
      issue: 'Single Primary Processing Facility Listed',
      affectedRecords: 'Urali Devachi Processing Site & Sanitary Landfill (SLF)',
      whyItMatters: 'Urali Devachi is the only primary landfill listed in the dataset, with a reported capacity of 300–350 Tonnes/Day. This is lower than the citywide total generation of 1,592 Tonnes/Day.',
      recommendedAction: 'Model decentralized composting and regional recycling transfer stations in future updates.',
      status: 'Capacity Constraint',
      statusColor: 'bg-rose-100 text-rose-900 border-rose-300',
      plainLanguageSummary: 'The main landfill at Urali Devachi only handles 300 to 350 tonnes a day, while Pune generates nearly 1,600 tonnes daily. Local processing and recycling are vital to prevent landfill overflow.',
      technicalDetails: [
        {
          label: 'City Generation',
          value: '1,592.43 Tonnes/Day reported across 42 wards.',
        },
        {
          label: 'Urali Devachi Capacity',
          value: 'Reported as 300–350 Tonnes/Day in primary disposal records.',
        },
      ],
    },
  ];

  const filteredIssues = filterQuery
    ? issues.filter(
        (i) =>
          i.issue.toLowerCase().includes(filterQuery.toLowerCase()) ||
          i.whyItMatters.toLowerCase().includes(filterQuery.toLowerCase()) ||
          i.affectedRecords.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : issues;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-monsoon-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-saffron-100 text-saffron-800 border border-saffron-200">
            Data Governance & Quality
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-monsoon-100 text-basalt-600 border border-monsoon-300">
            5 Documented Caveats
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-basalt-900 mt-1 font-sans">
          Source Data Quality & Issue Registry
        </h1>
        <p className="text-xs sm:text-sm text-basalt-600 mt-0.5">
          Transparent registry of known source-data ambiguities, duplicate numbers, and missing telemetry across Pune Municipal Corporation spreadsheets.
        </p>
      </div>

      {/* Quick Search & Summary Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-monsoon-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-basalt-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter issues (e.g. Ward 39, Fleet, Landfill)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-monsoon-300 text-xs text-basalt-800 bg-monsoon-50 placeholder-basalt-400 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>
        <span className="text-xs text-basalt-500 font-medium">
          Showing <strong>{filteredIssues.length} of {issues.length}</strong> verified data caveats
        </span>
      </div>

      {/* Understandable Issue Registry Table (Priority 1 Specification) */}
      <div className="bg-white rounded-2xl border border-monsoon-200 shadow-civic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-monsoon-100 text-basalt-700 uppercase text-[10.5px] font-bold border-b border-monsoon-200">
              <tr>
                <th className="px-4 py-3 min-w-[220px]">Issue</th>
                <th className="px-4 py-3 min-w-[160px]">Affected Records</th>
                <th className="px-4 py-3 min-w-[240px]">Why It Matters</th>
                <th className="px-4 py-3 min-w-[200px]">Recommended Action</th>
                <th className="px-4 py-3 min-w-[140px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-monsoon-200">
              {filteredIssues.map((item) => {
                const isExpanded = expandedIssueId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`hover:bg-monsoon-50/80 transition-colors cursor-pointer ${isExpanded ? 'bg-monsoon-50/60' : ''}`}
                      onClick={() => setExpandedIssueId(isExpanded ? null : item.id)}
                    >
                      {/* Column 1: Issue */}
                      <td className="px-4 py-3 font-bold text-basalt-900 align-top">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            className="mt-0.5 text-basalt-500 hover:text-basalt-900"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-saffron-600" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div>
                            <span>{item.issue}</span>
                            <span className="text-[11px] text-basalt-500 font-normal block mt-0.5">
                              {item.plainLanguageSummary}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Affected Records */}
                      <td className="px-4 py-3 font-mono text-xs text-basalt-700 align-top">
                        <span className="bg-monsoon-100 px-2 py-1 rounded text-[11px] block whitespace-pre-wrap">
                          {item.affectedRecords}
                        </span>
                      </td>

                      {/* Column 3: Why It Matters */}
                      <td className="px-4 py-3 text-basalt-600 leading-relaxed align-top">
                        {item.whyItMatters}
                      </td>

                      {/* Column 4: Recommended Action */}
                      <td className="px-4 py-3 text-basalt-800 font-medium leading-relaxed align-top">
                        {item.recommendedAction}
                      </td>

                      {/* Column 5: Status */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Technical Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-monsoon-50/40">
                        <td colSpan={5} className="px-6 py-4 border-t border-monsoon-200">
                          <div className="p-4 rounded-xl bg-white border border-monsoon-200 shadow-xs space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-basalt-900 uppercase tracking-wide">
                              <Info className="w-4 h-4 text-saffron-600" />
                              <span>Technical Evidence & Raw Spreadsheet Record Verification:</span>
                            </div>
                            <div className="space-y-1.5 text-xs font-mono">
                              {item.technicalDetails.map((detail, idx) => (
                                <div key={idx} className="p-2 rounded bg-monsoon-50 border border-monsoon-200">
                                  <strong className="text-basalt-800 block text-[11px] font-sans font-bold">{detail.label}:</strong>
                                  <span className="text-basalt-700 text-[11px]">{detail.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Provenance Information */}
      <div className="p-5 rounded-2xl bg-white border border-monsoon-200 shadow-civic space-y-3">
        <h3 className="font-bold text-basalt-900 text-sm flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-sahyadri-600" />
          <span>Source File Provenance (PMC Master Operations Dataset)</span>
        </h3>
        <p className="text-xs text-basalt-600 leading-relaxed">
          The Pune operations platform derives all macro statistics from the supplied <code className="font-mono bg-monsoon-100 px-1 py-0.5 rounded">puneMasterDataset.json</code> (compiled across 6 civic streams). Inconsistencies are acknowledged in accordance with municipal data governance rules.
        </p>
      </div>
    </div>
  );
};

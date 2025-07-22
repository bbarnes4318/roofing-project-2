import React, { useState } from 'react';
import { ChevronDownIcon } from '../common/Icons';

const checklistPhases = [
  {
    id: 'prospect',
    label: '🟧 Prospect Phase – Insurance – 1st Supplement',
    items: [
      {
        id: 'site-inspection',
        label: 'Site Inspection – Project Manager 👷🏼',
        subtasks: [
          'Take site photos',
          'Complete inspection form',
          'Document material colors',
          'Capture Hover photos',
          'Present upgrade options'
        ]
      },
      {
        id: 'write-estimate',
        label: 'Write Estimate – Project Manager 👷🏼',
        subtasks: [
          'Fill out Estimate Form',
          'Write initial estimate – AccuLynx',
          'Write Customer Pay Estimates',
          'Send for Approval'
        ]
      },
      {
        id: 'insurance-process',
        label: 'Insurance Process – Administration 📝',
        subtasks: [
          'Compare field vs insurance estimates',
          'Identify supplemental items',
          'Draft estimate in Xactimate'
        ]
      },
      {
        id: 'agreement-prep',
        label: 'Agreement Preparation – Administration 📝',
        subtasks: [
          'Trade cost analysis',
          'Prepare Estimate Forms',
          'Match AL estimates',
          'Calculate customer pay items',
          'Send shingle/class4 email – PDF'
        ]
      },
      {
        id: 'agreement-signing',
        label: 'Agreement Signing – Administration 📝',
        subtasks: [
          'Review and send signature request',
          'Record in QuickBooks',
          'Process deposit',
          'Collect signed disclaimers'
        ]
      }
    ]
  },
  {
    id: 'approved',
    label: '🟩 Approved Phase',
    items: [
      {
        id: 'admin-setup',
        label: 'Administrative Setup – Administration 📝',
        subtasks: [
          'Confirm shingle choice',
          'Order materials',
          'Create labor orders',
          'Send labor order to roofing crew'
        ]
      },
      {
        id: 'pre-job',
        label: 'Pre-Job Actions – Office 👩🏼‍💻',
        subtasks: [
          'Pull permits'
        ]
      },
      {
        id: 'prepare-production',
        label: 'Prepare for Production – Administration 📝',
        subtasks: [
          'All pictures in Job (Gutter, Ventilation, Elevation)',
          'Verify Labor Order in Scheduler',
          '  - Correct Dates',
          '  - Correct crew',
          '  - Send install schedule email to customer',
          'Verify Material Orders',
          '  - Confirmations from supplier',
          '  - Call if no confirmation',
          '  - Provide special crew instructions',
          'Subcontractor Work',
          '  - Work order in scheduler',
          '  - Schedule subcontractor',
          '  - Communicate with customer'
        ]
      }
    ]
  },
  {
    id: 'execution',
    label: '🔧 Execution Phase',
    items: [
      {
        id: 'installation',
        label: 'Installation – Field Director 🛠️',
        subtasks: [
          'Document work start',
          'Capture progress photos',
          'Daily Job Progress Note',
          '  - Work started/finished',
          '  - Days and people needed',
          '  - Format: 2 Guys for 4 hours',
          'Upload Pictures'
        ]
      },
      {
        id: 'quality-check',
        label: 'Quality Check – Field + Admin',
        subtasks: [
          'Completion photos – Roof Supervisor 🛠️',
          'Complete inspection – Roof Supervisor 🛠️',
          'Upload Roof Packet',
          'Verify Packet is complete – Admin 📝'
        ]
      },
      {
        id: 'multiple-trades',
        label: 'Multiple Trades – Administration 📝',
        subtasks: [
          'Confirm start date',
          'Confirm material/labor for all trades'
        ]
      },
      {
        id: 'subcontractor-work',
        label: 'Subcontractor Work – Administration 📝',
        subtasks: [
          'Confirm dates',
          'Communicate with customer'
        ]
      },
      {
        id: 'update-customer',
        label: 'Update Customer – Administration 📝',
        subtasks: [
          'Notify of completion',
          'Share photos',
          'Send 2nd half payment link'
        ]
      }
    ]
  },
  {
    id: 'supplement',
    label: '🌀 2nd Supplement Phase',
    items: [
      {
        id: 'create-supp',
        label: 'Create Supp in Xactimate – Administration 📝',
        subtasks: [
          'Check Roof Packet & Checklist',
          'Label photos',
          'Add to Xactimate',
          'Submit to insurance'
        ]
      },
      {
        id: 'followup-calls',
        label: 'Follow-Up Calls – Administration 📝',
        subtasks: [
          'Call 2x/week until updated estimate'
        ]
      },
      {
        id: 'review-approved',
        label: 'Review Approved Supp – Administration 📝',
        subtasks: [
          'Update trade cost',
          'Prepare counter-supp or email',
          'Add to AL Estimate'
        ]
      },
      {
        id: 'customer-update',
        label: 'Customer Update – Administration',
        subtasks: [
          'Share 2 items minimum',
          'Let them know next steps'
        ]
      }
    ]
  },
  {
    id: 'completion',
    label: '🏁 Completion Phase',
    items: [
      {
        id: 'financial-processing',
        label: 'Financial Processing – Administration 📝',
        subtasks: [
          'Verify worksheet',
          'Final invoice & payment link',
          'AR follow-up calls'
        ]
      },
      {
        id: 'project-closeout',
        label: 'Project Closeout – Office 👩🏼‍💻',
        subtasks: [
          'Register warranty',
          'Send documentation',
          'Submit insurance paperwork',
          'Send final receipt and close job'
        ]
      }
    ]
  }
];

const ProjectChecklistPage = () => {
  const [openPhase, setOpenPhase] = useState(null);
  const [openItem, setOpenItem] = useState({});

  const handlePhaseClick = (phaseId) => {
    setOpenPhase(openPhase === phaseId ? null : phaseId);
    setOpenItem({});
  };

  const handleItemClick = (itemId) => {
    setOpenItem((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft border border-white/20">
      <div className="p-8 border-b border-gray-100/50 bg-gradient-to-r from-white to-gray-50/50 rounded-t-2xl">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-1">Checklist</h1>
        <p className="text-gray-600 text-lg font-medium">Track project tasks and milestones</p>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          {checklistPhases.map((phase) => (
            <div key={phase.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-soft border border-white/20">
              <div
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => handlePhaseClick(phase.id)}
              >
                <h3 className="text-xl font-bold text-gray-800">{phase.label}</h3>
                <ChevronDownIcon
                  className={`w-6 h-6 ml-4 transform transition-transform ${openPhase === phase.id ? 'rotate-180' : ''}`}
                />
              </div>
              {openPhase === phase.id && (
                <div className="mt-6 space-y-3">
                  {phase.items.map((item) => (
                    <div key={item.id}>
                      <div
                        className="flex items-center cursor-pointer group"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <span className="flex-1 text-lg font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                          {item.label}
                        </span>
                        <ChevronDownIcon
                          className={`w-5 h-5 ml-2 transform transition-transform ${openItem[item.id] ? 'rotate-180' : ''}`}
                        />
                      </div>
                      {openItem[item.id] && (
                        <ul className="ml-8 mt-2 space-y-1 list-disc text-gray-600 text-base">
                          {item.subtasks.map((sub, idx) => (
                            <li key={idx}>{sub}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectChecklistPage;
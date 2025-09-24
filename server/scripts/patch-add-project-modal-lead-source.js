const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '..', 'src', 'components', 'common', 'AddProjectModal.jsx');

function applyPatches(src) {
  let text = src;
  let changed = false;

  if (!text.includes('leadSourceId')) {
    // 1) Extend initial formData
    const needle1 = "projectManagerId: '' // Project manager assignment";
    if (text.includes(needle1)) {
      text = text.replace(
        needle1,
        "projectManagerId: '', // Project manager assignment\n    leadSourceId: ''"
      );
      changed = true;
    }

    // 2) Add state variables for lead sources
    const needle2 = 'const [showSecondHousehold, setShowSecondHousehold] = useState(false);';
    if (text.includes(needle2)) {
      text = text.replace(
        needle2,
        `${needle2}\n  const [leadSources, setLeadSources] = useState([]);\n  const [leadSourcesLoading, setLeadSourcesLoading] = useState(true);`
      );
      changed = true;
    }

    // 3) Add useEffect to load lead sources when modal opens
    const needle3 = '}, [isOpen]);';
    if (text.includes(needle3)) {
      const inject = `\n\n  // Load lead sources when modal opens\n  useEffect(() => {\n    const loadLeadSources = async () => {\n      try {\n        setLeadSourcesLoading(true);\n        const res = await api.get('/lead-sources');\n        const items = Array.isArray(res?.data?.data) ? res.data.data : [];\n        setLeadSources(items.filter(ls => ls.isActive !== false));\n      } catch (e) {\n        console.error('Error fetching lead sources:', e);\n        setLeadSources([]);\n      } finally {\n        setLeadSourcesLoading(false);\n      }\n    };\n    if (isOpen) {\n      loadLeadSources();\n    } else {\n      setLeadSources([]);\n    }\n  }, [isOpen]);`;
      text = text.replace(needle3, `${needle3}${inject}`);
      changed = true;
    }

    // 4) Insert Lead Source dropdown before Description section in Step 2
    const needle4 = '                {/* Description */}';
    if (text.includes(needle4)) {
      const leadSourceBlock = `                {/* Lead Source */}\n                <div>\n                  <label className=\"block text-sm font-semibold text-gray-700 mb-2\">\n                    Lead Source\n                  </label>\n                  <select\n                    name=\"leadSourceId\"\n                    value={formData.leadSourceId}\n                    onChange={handleInputChange}\n                    className=\"w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300\"\n                    disabled={leadSourcesLoading}\n                  >\n                    <option value=\"\">Select a lead source (optional)</option>\n                    {leadSources.map(ls => (\n                      <option key={ls.id} value={ls.id}>{ls.name}</option>\n                    ))}\n                  </select>\n                  {leadSourcesLoading && (\n                    <p className=\"mt-2 text-sm text-gray-500\">Loading lead sources...</p>\n                  )}\n                </div>\n\n                {/* Description */}`;
      text = text.replace(needle4, leadSourceBlock);
      changed = true;
    }

    // 5) Include leadSourceId in projectData
    const needle5 = 'startingPhase: formData.startingPhase // New field for starting phase';
    if (text.includes(needle5)) {
      text = text.replace(
        needle5,
        'startingPhase: formData.startingPhase, // New field for starting phase\n        leadSourceId: formData.leadSourceId || undefined'
      );
      changed = true;
    }

    // 6) Reset form include leadSourceId
    const needle6 = "projectManagerId: ''\n    });";
    if (text.includes(needle6)) {
      text = text.replace(
        needle6,
        "projectManagerId: '',\n      leadSourceId: ''\n    });"
      );
      changed = true;
    }
  }

  return { text, changed };
}

(function main() {
  if (!fs.existsSync(target)) {
    console.error('Target file not found:', target);
    process.exit(1);
  }
  const original = fs.readFileSync(target, 'utf8');
  const { text, changed } = applyPatches(original);
  if (!changed) {
    console.log('No changes applied (already patched or patterns not found).');
    process.exit(0);
  }
  fs.writeFileSync(target, text, 'utf8');
  console.log('✅ AddProjectModal updated with Lead Source support.');
})();

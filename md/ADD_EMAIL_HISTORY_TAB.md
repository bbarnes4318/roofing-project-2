# Add Email History Tab to Project Detail Page

## Quick Manual Edit Required

I've created all the email history UI components, but need you to make one small edit to show the tab.

### File to Edit:
`src/components/pages/ProjectDetailPage.jsx`

### Step 1: The tab is already in the nav items (line 2295) ✅
```javascript
const navItems = ['Project Profile', 'Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Email History', 'Work Order'];
```

### Step 2: Add the case statement

Find this section (around line 2286-2290):
```javascript
            case 'Project Documents':
                return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
            case 'Work Order':
                return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
```

Add these 2 lines BETWEEN them:
```javascript
            case 'Email History':
                return <ProjectEmailHistory projectId={projectData.id} />;
```

So it becomes:
```javascript
            case 'Project Documents':
                return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
            case 'Email History':
                return <ProjectEmailHistory projectId={projectData.id} />;
            case 'Work Order':
                return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
```

That's it! The import is already added at the top (line 10).

---

## ✅ What's Already Complete

All these components are built and ready:

1. ✅ **EmailHistoryList** - Reusable email list component
2. ✅ **EmailDetailModal** - View full email with attachments
3. ✅ **ProjectEmailHistory** - Project email history tab
4. ✅ **CustomerEmailHistory** - Customer email history
5. ✅ **EmailHistoryPage** - Global email history page
6. ✅ **Import added** to ProjectDetailPage.jsx

Just add those 2 lines and you're done!

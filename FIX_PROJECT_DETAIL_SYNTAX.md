# Fix ProjectDetailPage.jsx Syntax Error

## Problem
Missing closing braces for the switch statement after adding Email History case.

## Fix Required

Around line 2285-2292, you need to add the missing closing braces and default case.

### Current (BROKEN):
```javascript
                );
                case 'Project Documents':
                    return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
                case 'Email History':
                    return <ProjectEmailHistory projectId={projectData.id} />;
                case 'Work Order':
                    return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
                    
    const navItems = ['Project Profile', 'Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Email History', 'Work Order'];
```

### Should Be (FIXED):
```javascript
                );
            case 'Project Documents':
                return <ProjectDocumentsPage project={projectData} onBack={onBack} colorMode={colorMode} />;
            case 'Email History':
                return <ProjectEmailHistory projectId={projectData.id} />;
            case 'Work Order':
                return <div className="p-8 text-center text-gray-400 text-sm">(Blank for now)</div>;
            default:
                return <ProjectProfileTab project={projectData} colorMode={colorMode} onProjectSelect={onProjectSelect} />;
        }
    };

    const navItems = ['Project Profile', 'Project Workflow', 'Alerts', 'Messages', 'Project Schedule', 'Project Documents', 'Email History', 'Work Order'];
```

## Changes Needed:
1. Line 2286: Change `case` indentation (should have 12 spaces, not 16)
2. Line 2288: Change `case` indentation (should have 12 spaces, not 16)  
3. Line 2290: Change `case` indentation (should have 12 spaces, not 16)
4. After line 2291: Add `default:` case
5. After default case: Add closing braces `}` and `};`

The switch statement needs to close before `const navItems` line!

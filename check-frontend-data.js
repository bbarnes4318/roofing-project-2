const axios = require('axios');

async function checkFrontendData() {
    try {
        console.log('Testing what frontend actually sees...');
        
        // Get projects like frontend does
        const response = await axios.get('http://localhost:5000/api/projects?limit=100');
        
        if (response.data && response.data.data) {
            const projects = response.data.data;
            console.log(`\nTotal projects returned: ${projects.length}`);
            
            // Check project-level phases (what frontend should use)
            const projectPhases = {};
            projects.forEach(project => {
                const phase = project.phase || 'Unknown';
                projectPhases[phase] = (projectPhases[phase] || 0) + 1;
            });
            
            console.log('\n=== PROJECT-LEVEL PHASES (what frontend should see) ===');
            Object.entries(projectPhases).forEach(([phase, count]) => {
                console.log(`${phase}: ${count} projects`);
            });
            
            // Check if projects have workflow.steps phases (what might confuse frontend)
            let totalStepPhases = 0;
            const stepPhases = {};
            projects.forEach(project => {
                if (project.workflow && project.workflow.steps) {
                    project.workflow.steps.forEach(step => {
                        if (step.phase) {
                            stepPhases[step.phase] = (stepPhases[step.phase] || 0) + 1;
                            totalStepPhases++;
                        }
                    });
                }
            });
            
            console.log('\n=== WORKFLOW STEP PHASES (what might confuse frontend) ===');
            console.log(`Total workflow steps with phases: ${totalStepPhases}`);
            Object.entries(stepPhases).forEach(([phase, count]) => {
                console.log(`${phase}: ${count} steps`);
            });
            
            // Show first project structure
            console.log('\n=== FIRST PROJECT STRUCTURE ===');
            const firstProject = projects[0];
            console.log(`Project phase: "${firstProject.phase}"`);
            console.log(`Project status: "${firstProject.status}"`);
            console.log(`Workflow steps count: ${firstProject.workflow?.steps?.length || 0}`);
            
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkFrontendData();
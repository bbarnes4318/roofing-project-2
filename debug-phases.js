const axios = require('axios');

async function debugPhases() {
    try {
        const response = await axios.get('http://localhost:5000/api/projects?limit=5');
        const projects = response.data.data;
        
        projects.forEach((project, index) => {
            console.log(`\n=== PROJECT ${index + 1}: ${project.projectName} ===`);
            console.log(`Final Phase: ${project.phase}`);
            console.log(`Status: ${project.status}`);
            
            if (project.workflow && project.workflow.steps) {
                console.log(`Workflow Steps: ${project.workflow.steps.length}`);
                
                // Sort steps by stepId
                const sortedSteps = project.workflow.steps.sort((a, b) => a.stepId.localeCompare(b.stepId));
                
                console.log('Step completion status:');
                sortedSteps.forEach(step => {
                    console.log(`  ${step.stepId} (${step.phase}): ${step.isCompleted ? 'COMPLETED' : 'INCOMPLETE'}`);
                });
                
                // Find first incomplete step
                const firstIncomplete = sortedSteps.find(step => !step.isCompleted);
                if (firstIncomplete) {
                    console.log(`First incomplete: ${firstIncomplete.stepId} (${firstIncomplete.phase})`);
                } else {
                    console.log('All steps completed');
                }
            } else {
                console.log('No workflow found');
            }
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugPhases();
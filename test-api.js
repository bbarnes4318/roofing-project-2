const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing API connection...');
        const response = await axios.get('http://localhost:5000/api/projects?limit=100');
        
        if (response.data && response.data.data) {
            const projects = response.data.data;
            console.log(`Found ${projects.length} projects`);
            
            // Count phases
            const phaseCount = {};
            projects.forEach(project => {
                const phase = project.phase || 'Unknown';
                phaseCount[phase] = (phaseCount[phase] || 0) + 1;
            });
            
            console.log('\nPhase Distribution:');
            Object.entries(phaseCount).forEach(([phase, count]) => {
                console.log(`${phase}: ${count} projects`);
            });
            
            // Show first few project details
            console.log('\nFirst 3 projects:');
            projects.slice(0, 3).forEach(p => {
                console.log(`- ${p.projectName}: Phase = "${p.phase}", Status = "${p.status}"`);
            });
        } else {
            console.log('No projects data found');
        }
    } catch (error) {
        console.error('API Error:', error.message);
    }
}

testAPI();
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Project = require('./models/Project');
const ProjectWorkflow = require('./models/ProjectWorkflow');
const ProjectProgressService = require('./services/ProjectProgressService');

async function testProgressCalculation() {
    try {
        console.log('🧪 TESTING PROGRESS CALCULATION SERVICE...\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Get all projects
        const projects = await Project.find({}).lean();
        console.log(`📊 Found ${projects.length} projects\n`);
        
        for (const project of projects) {
            console.log(`\n🔍 Testing project: ${project.projectName}`);
            console.log(`   ID: ${project._id}`);
            console.log(`   Type: ${project.projectType}`);
            
            // Get workflow for this project
            const workflow = await ProjectWorkflow.findOne({ project: project._id }).lean();
            
            if (!workflow) {
                console.log(`   ❌ No workflow found`);
                continue;
            }
            
            console.log(`   📋 Workflow found with ${workflow.steps?.length || 0} steps`);
            
            // Attach workflow to project
            project.workflow = workflow;
            
            // Calculate progress
            const progressData = ProjectProgressService.calculateProjectProgress(project);
            
            console.log(`   📈 Progress Results:`);
            console.log(`      Overall: ${progressData.overall}%`);
            console.log(`      Materials: ${progressData.materials}%`);
            console.log(`      Labor: ${progressData.labor}%`);
            console.log(`      Completed Steps: ${progressData.completedSteps}/${progressData.totalSteps}`);
            console.log(`      Trades: ${progressData.trades.length}`);
            
            progressData.trades.forEach((trade, index) => {
                console.log(`         ${index + 1}. ${trade.name}: ${trade.laborProgress}% (Materials: ${trade.materialsDelivered ? 'Delivered' : 'Pending'})`);
            });
            
            // Show step breakdown if available
            if (progressData.stepBreakdown) {
                console.log(`   📋 Step Breakdown:`);
                console.log(`      By Type - Materials: ${progressData.stepBreakdown.byType.materials}, Labor: ${progressData.stepBreakdown.byType.labor}, Admin: ${progressData.stepBreakdown.byType.admin}`);
                
                Object.keys(progressData.stepBreakdown.byPhase).forEach(phase => {
                    const phaseData = progressData.stepBreakdown.byPhase[phase];
                    console.log(`      ${phase}: ${phaseData.completed}/${phaseData.total} completed`);
                });
            }
        }
        
        console.log('\n✅ Progress calculation test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error testing progress calculation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

// Run the test
testProgressCalculation();
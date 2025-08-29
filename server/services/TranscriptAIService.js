const OpenAI = require('openai');

class TranscriptAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateProfessionalSummary(transcriptData) {
        try {
            console.log('🔍 TranscriptAIService: Starting generateProfessionalSummary');
            console.log('🔍 TranscriptAIService: Input data:', JSON.stringify(transcriptData, null, 2));
            const { fullTranscript, metadata, projectInfo } = transcriptData;
            
            // Prepare the conversation text
            const conversationText = fullTranscript.map(entry => 
                `${entry.speaker}: ${entry.message}`
            ).join('\n');

            // Create a comprehensive prompt for GPT-5
            const systemPrompt = `You are an expert construction project manager and technical writer. 
Your task is to analyze a voice conversation transcript from a roofing project discussion and create a professional-grade document summary.

The document should be comprehensive, actionable, and suitable for project records and client communication.

Focus on:
1. Extracting all key decisions, approvals, and agreements
2. Identifying specific action items with clear ownership
3. Listing all materials, specifications, and quantities discussed
4. Highlighting risks, concerns, or issues raised
5. Capturing timeline commitments and scheduling details
6. Noting any budget or cost discussions
7. Identifying technical requirements or specifications
8. Summarizing the overall project status and next steps

Format the response as a JSON object with the following structure:
{
    "executiveSummary": "A comprehensive 2-3 paragraph executive summary",
    "projectStatus": "Current project status and phase",
    "keyDecisions": [
        {
            "decision": "The specific decision made",
            "rationale": "Why this decision was made",
            "impact": "Impact on project",
            "speaker": "Who made the decision",
            "timestamp": "When it was made"
        }
    ],
    "actionItems": [
        {
            "action": "Specific action to be taken",
            "assignee": "Person responsible",
            "dueDate": "When it needs to be completed",
            "priority": "high/medium/low",
            "dependencies": "What it depends on",
            "estimatedEffort": "Time/resource estimate"
        }
    ],
    "materialsAndSpecifications": [
        {
            "item": "Material or specification",
            "quantity": "Amount needed",
            "specifications": "Detailed specs",
            "supplier": "Preferred supplier if mentioned",
            "cost": "Cost if discussed",
            "leadTime": "Delivery timeline"
        }
    ],
    "scheduleAndTimeline": {
        "currentPhase": "Current project phase",
        "completedMilestones": ["List of completed items"],
        "upcomingMilestones": [
            {
                "milestone": "Description",
                "targetDate": "When",
                "dependencies": ["What needs to happen first"]
            }
        ],
        "criticalPath": "What's on the critical path",
        "weatherDependencies": "Weather-related considerations"
    },
    "risksAndIssues": [
        {
            "risk": "Description of risk or issue",
            "severity": "high/medium/low",
            "likelihood": "high/medium/low",
            "mitigation": "Proposed mitigation strategy",
            "owner": "Who will manage this",
            "status": "open/monitoring/resolved"
        }
    ],
    "budgetAndCosts": {
        "discussedCosts": ["List of costs mentioned"],
        "approvedExpenses": ["Approved expenses"],
        "pendingApprovals": ["Items needing approval"],
        "costSavingOpportunities": ["Potential savings identified"]
    },
    "technicalDetails": [
        {
            "aspect": "Technical aspect discussed",
            "requirement": "Specific requirement",
            "solution": "Proposed or agreed solution",
            "considerations": "Important considerations"
        }
    ],
    "clientConcerns": [
        {
            "concern": "Client concern raised",
            "response": "How it was addressed",
            "followUp": "Required follow-up"
        }
    ],
    "nextSteps": [
        {
            "step": "What happens next",
            "timing": "When",
            "responsible": "Who"
        }
    ],
    "communicationItems": [
        {
            "item": "What needs to be communicated",
            "audience": "To whom",
            "method": "How",
            "deadline": "By when"
        }
    ]
}`;

            const userPrompt = `Project Context:
${projectInfo ? `Project: ${projectInfo.name}
Project Number: ${projectInfo.number}
Address: ${projectInfo.address || 'Not specified'}` : 'No specific project selected'}

Call Date: ${metadata.callDate}
Call Duration: ${metadata.duration}
Participants: ${metadata.participantCount}

Conversation Transcript:
${conversationText}

Please analyze this conversation and provide a comprehensive professional summary following the specified JSON format. Be thorough and extract all relevant information for project documentation.`;

            console.log('🔍 TranscriptAIService: About to call OpenAI API');
            console.log('🔍 TranscriptAIService: Model:', process.env.OPENAI_MODEL || "gpt-5");
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || "gpt-5",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_completion_tokens: 8000,
                response_format: { type: "json_object" }
            });
            console.log('🔍 TranscriptAIService: OpenAI API call successful');
            
            const responseContent = completion.choices?.[0]?.message?.content;
            
            if (!responseContent || responseContent.trim() === '') {
                throw new Error('GPT-5 returned empty response content');
            }

            const aiSummary = JSON.parse(responseContent);

            // Enhance with original transcript data
            return {
                ...aiSummary,
                metadata: {
                    ...metadata,
                    project: projectInfo,
                    aiModel: process.env.OPENAI_MODEL || 'gpt-5',
                    generatedAt: new Date().toISOString()
                },
                fullTranscript: fullTranscript
            };

        } catch (error) {
            console.error('Error generating AI summary:', error);
            
            // Fallback to basic summary if AI fails
            return this.generateFallbackSummary(transcriptData);
        }
    }

    generateFallbackSummary(transcriptData) {
        const { fullTranscript, metadata, projectInfo } = transcriptData;
        
        return {
            executiveSummary: "Voice conversation transcript captured. Manual review recommended for detailed analysis.",
            projectStatus: "Status to be determined from conversation review",
            keyDecisions: [],
            actionItems: [],
            materialsAndSpecifications: [],
            scheduleAndTimeline: {
                currentPhase: "To be determined",
                completedMilestones: [],
                upcomingMilestones: [],
                criticalPath: "To be identified",
                weatherDependencies: "None identified"
            },
            risksAndIssues: [],
            budgetAndCosts: {
                discussedCosts: [],
                approvedExpenses: [],
                pendingApprovals: [],
                costSavingOpportunities: []
            },
            technicalDetails: [],
            clientConcerns: [],
            nextSteps: [],
            communicationItems: [],
            metadata: {
                ...metadata,
                project: projectInfo,
                aiModel: 'fallback',
                generatedAt: new Date().toISOString()
            },
            fullTranscript: fullTranscript
        };
    }
}

module.exports = new TranscriptAIService();
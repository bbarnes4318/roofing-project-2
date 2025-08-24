const fs = require('fs');
const path = require('path');
const openAIService = require('./OpenAIService');

class KnowledgeBaseService {
	constructor() {}

	readFileSafe(filePath, maxBytes = 100_000) {
		try {
			if (!fs.existsSync(filePath)) return '';
			const buf = fs.readFileSync(filePath);
			return buf.slice(0, maxBytes).toString('utf8');
		} catch (e) {
			return '';
		}
	}

	async answerQuestion(question) {
		const root = path.resolve(__dirname, '..', '..');
		const phasesText = this.readFileSafe(path.join(root, 'project-phases.txt'), 150_000);
		const tablesText = this.readFileSafe(path.join(root, 'tables-and-fields.md'), 150_000);
		const workflowCsv = this.readFileSafe(path.join(root, 'workflow.csv'), 100_000);

		const context = [
			'# Project Phases\n',
			phasesText,
			'\n\n# Tables and Fields\n',
			tablesText,
			'\n\n# Workflow CSV (excerpt)\n',
			workflowCsv
		].filter(Boolean).join('\n');

		const prompt = `You are Bubbles, the company assistant. Answer the user's question strictly using the context. If it is not in the context, say you don't have that information.

Question: ${question}

Context:
${context.slice(0, 18000)}

Answer in 80 words or fewer.`;

		const response = await openAIService.generateSingleResponse(prompt);
		return response.content || "I don't have that information in the provided context.";
	}
}

module.exports = KnowledgeBaseService;
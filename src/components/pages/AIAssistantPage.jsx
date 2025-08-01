import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, SparklesIcon, ClipboardDocumentCheckIcon, ChartBarIcon, DocumentTextIcon, CogIcon } from '../common/Icons';

const AIAssistantPage = ({ projects = [] }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'assistant',
            content: 'Hello! I\'m your AI assistant. I can help you with project management, task tracking, estimates, and more. What would you like to know?',
            timestamp: new Date(),
            richContent: null
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const quickActions = [
        {
            id: 'tasks',
            icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
            label: 'Show Today\'s Tasks',
            action: () => handleQuickAction('Show me all tasks due today')
        },
        {
            id: 'status',
            icon: <ChartBarIcon className="w-5 h-5" />,
            label: 'Project Status',
            action: () => handleQuickAction('What\'s the current status of all active projects?')
        },
        {
            id: 'estimate',
            icon: <DocumentTextIcon className="w-5 h-5" />,
            label: 'Project Analysis',
            action: () => handleQuickAction('Analyze project progress and identify potential issues')
        },
        {
            id: 'support',
            icon: <CogIcon className="w-5 h-5" />,
            label: 'Field Support',
            action: () => handleQuickAction('I need field support assistance')
        }
    ];

    const handleQuickAction = (actionText) => {
        handleSubmit(null, actionText);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e, quickActionText = null) => {
        if (e) e.preventDefault();
        
        const userInput = quickActionText || input;
        if (!userInput.trim()) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: userInput,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI processing
        setTimeout(() => {
            const response = generateRichResponse(userInput);
            const assistantMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: response.text,
                timestamp: new Date(),
                richContent: response
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        }, 1000);
    };

    const generateRichResponse = (userInput) => {
        const input = userInput.toLowerCase();
        if (input.includes('task')) {
            return {
                text: "Here are your tasks for today:",
                items: [
                    { type: 'link', text: 'Review Project Blueprint', url: '/projects/blueprint' },
                    { type: 'text', text: 'Meeting with client at 2 PM' },
                    { type: 'image', url: '/images/task-chart.png', alt: 'Task Progress Chart' }
                ]
            };
        }
        if (input.includes('status')) {
            const activeProjects = (projects || []).filter(p => p.status === 'active' || p.status === 'in-progress').slice(0, 3);
            const projectStatusItems = activeProjects.map(project => ({
                type: 'text',
                text: `${project.name}: ${project.progress || 0}% complete`
            }));
            
            return {
                text: "Current status of your active projects:",
                items: [
                    ...projectStatusItems,
                    { type: 'link', text: 'View all project details', url: '/projects/list' },
                    { type: 'image', url: '/images/progress-bar.png', alt: 'Project Progress Overview' }
                ]
            };
        }
        if (input.includes('estimate')) {
            return {
                text: "Here is a draft of your new project estimate:",
                items: [
                    { type: 'text', text: 'Project: New Roof Installation' },
                    { type: 'text', text: 'Estimated Cost: $24,500' },
                    { type: 'link', text: 'Download Estimate PDF', url: '/estimates/roof-installation.pdf' },
                    { type: 'text', text: 'Please review and let me know if you want to make changes.' }
                ]
            };
        }
        if (input.includes('analysis') || input.includes('progress')) {
            const activeProjects = (projects || []).filter(p => p.status === 'active' || p.status === 'in-progress').slice(0, 3);
            const analysisItems = activeProjects.map(project => ({
                type: 'text',
                text: `${project.name}: ${project.progress || 0}% complete - ${project.progress < 50 ? '⚠️ Behind schedule' : project.progress > 80 ? '✅ On track' : '🔄 In progress'}`
            }));
            
            return {
                text: "Project Analysis Report:",
                items: [
                    ...analysisItems,
                    { type: 'text', text: '📊 Overall Progress: Good' },
                    { type: 'text', text: '⚠️ 2 projects need attention' },
                    { type: 'link', text: 'View detailed project reports', url: '/projects/analysis' },
                    { type: 'text', text: 'Recommendation: Schedule team meeting to address delays.' }
                ]
            };
        }
        if (input.includes('support')) {
            return {
                text: "Field Support Contact:",
                items: [
                    { type: 'text', text: 'Mike Field (555) 123-4567' },
                    { type: 'link', text: 'Open Support Ticket', url: '/support/new' },
                    { type: 'image', url: '/images/map-support.png', alt: 'Field Support Location' }
                ]
            };
        }
        return {
            text: "I understand your request. I'm here to help with your construction project needs. What specific information would you like to know?",
            items: []
        };
    };

    const MessageBubble = ({ message }) => {
        const isAssistant = message.type === 'assistant';
        
        const renderRichContent = (content) => {
            if (!message.richContent) return <p className="text-sm">{content}</p>;
            
            return (
                <div className="space-y-2">
                    <p className="text-sm">{content.text}</p>
                    {content.items?.map((item, index) => {
                        switch (item.type) {
                            case 'link':
                                return (
                                    <a 
                                        key={index}
                                        href={item.url}
                                        className="text-blue-600 hover:text-blue-800 text-sm block"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {item.text}
                                    </a>
                                );
                            case 'image':
                                return (
                                    <img 
                                        key={index}
                                        src={item.url}
                                        alt={item.alt}
                                        className="rounded-lg max-w-full h-auto mt-2"
                                    />
                                );
                            default:
                                return <p key={index} className="text-sm">{item.text}</p>;
                        }
                    })}
                </div>
            );
        };

        return (
            <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
                <div className={`flex max-w-[80%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'} items-start gap-2`}>
                    {isAssistant && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 ${
                        isAssistant 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-blue-600 text-white'
                    }`}>
                        {renderRichContent(message.content)}
                        <span className={`text-xs mt-1 block ${
                            isAssistant ? 'text-gray-500' : 'text-blue-100'
                        }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={action.action}
                            className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                            <div className="text-blue-600">{action.icon}</div>
                            <span className="text-sm font-medium text-gray-700">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    {messages.map(message => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything about your projects..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                            isLoading || !input.trim()
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        } text-white font-semibold transition-colors`}
                    >
                        {isLoading ? (
                            <>
                                <SparklesIcon className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="w-5 h-5" />
                                Send
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistantPage; 
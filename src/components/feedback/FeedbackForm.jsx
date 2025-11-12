import React, { useState, useRef } from 'react';
import { X, Upload, Image, FileText, AlertTriangle, Lightbulb, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const FeedbackForm = ({ onSubmit, colorMode, currentUser, isOpen = true, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium',
    problem: '',
    proposal: '',
    impact: '',
    environment: '',
    tags: []
  });
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: AlertTriangle, color: 'red' },
    { id: 'improvement', label: 'Improvement', icon: Wrench, color: 'blue' },
    { id: 'idea', label: 'New Idea', icon: Lightbulb, color: 'green' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    await processFiles(files);
  };

  const processFiles = async (files) => {
    const validFiles = [];
    const rejectedFiles = [];

    for (const file of files) {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      
      if (isValidSize && isValidType) {
        if (file.type.startsWith('image/')) {
          // Convert image to base64 data URL for inline display
          try {
            const dataUrl = await fileToDataURL(file);
            validFiles.push({
              file,
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl, // Store as data URL for inline display
              isImage: true
            });
          } catch (error) {
            console.error('Error processing image:', error);
            rejectedFiles.push(file.name);
          }
        } else {
          // PDFs - store file reference
          validFiles.push({
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            isImage: false
          });
        }
      } else {
        rejectedFiles.push(file.name);
      }
    }

    if (rejectedFiles.length > 0) {
      toast.error(`Some files were rejected. Only images and PDFs up to 10MB are allowed.`);
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} file(s)`);
    }
  };

  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          // Create a File object from the blob
          const file = new File([blob], `snippet-${Date.now()}.png`, { type: blob.type });
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processFiles(imageFiles);
      toast.success(`Pasted ${imageFiles.length} image(s) from clipboard`);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-capture environment data
      const environment = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      };

      // Format attachments for backend (store as JSON array with image data URLs)
      const formattedAttachments = attachments.map(att => ({
        name: att.name,
        type: att.type,
        size: att.size,
        dataUrl: att.dataUrl || null, // Base64 data URL for images
        isImage: att.isImage || false
      }));

      const submissionData = {
        ...formData,
        environment,
        attachments: formattedAttachments
        // authorId is handled by the backend from the JWT token
      };

      await onSubmit(submissionData);
      
      // Reset form
      setFormData({
        type: 'bug',
        title: '',
        description: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
        severity: 'medium',
        problem: '',
        proposal: '',
        impact: '',
        environment: '',
        tags: []
      });
      setAttachments([]);
      
      if (onClose) onClose();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMarkdownPreview = (text) => {
    // Simple markdown preview - in production, use a proper markdown parser
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  if (!isOpen) return null;

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="overflow-y-auto"
      onPaste={handlePaste}
    >
          {/* Type Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-3 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Feedback Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {feedbackTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleInputChange('type', type.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === type.id
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : colorMode
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 text-${type.color}-500`} />
                    <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="feedback-title"
              name="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief, descriptive title..."
              className={`w-full px-4 py-3 rounded-xl border ${
                colorMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              required
            />
          </div>

          {/* Dynamic Fields Based on Type */}
          {formData.type === 'bug' && (
            <>
              {/* Steps to Reproduce */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Steps to Reproduce
                </label>
                <textarea
                  id="feedback-steps-to-reproduce"
                  name="stepsToReproduce"
                  value={formData.stepsToReproduce}
                  onChange={(e) => handleInputChange('stepsToReproduce', e.target.value)}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    colorMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Expected Behavior
                  </label>
                  <textarea
                    id="feedback-expected-behavior"
                    name="expectedBehavior"
                    value={formData.expectedBehavior}
                    onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                    placeholder="What should happen..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      colorMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Actual Behavior
                  </label>
                  <textarea
                    id="feedback-actual-behavior"
                    name="actualBehavior"
                    value={formData.actualBehavior}
                    onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                    placeholder="What actually happens..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      colorMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              {/* Severity */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Severity
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleInputChange('severity', level.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.severity === level.value
                          ? `border-${level.color}-500 bg-${level.color}-50`
                          : colorMode
                          ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-${level.color}-500 mx-auto mb-1`}></div>
                      <span className={`text-xs font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                        {level.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(formData.type === 'improvement' || formData.type === 'idea') && (
            <>
              {/* Problem/Use Case */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.type === 'improvement' ? 'Current Problem' : 'Use Case'}
                </label>
                <textarea
                  id="feedback-problem"
                  name="problem"
                  value={formData.problem}
                  onChange={(e) => handleInputChange('problem', e.target.value)}
                  placeholder="Describe the current issue or use case..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    colorMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              {/* Proposal */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {formData.type === 'improvement' ? 'Proposed Solution' : 'Idea Description'}
                </label>
                <textarea
                  id="feedback-proposal"
                  name="proposal"
                  value={formData.proposal}
                  onChange={(e) => handleInputChange('proposal', e.target.value)}
                  placeholder="Describe your solution or idea..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    colorMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              {/* Impact */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Expected Impact
                </label>
                <textarea
                  id="feedback-impact"
                  name="impact"
                  value={formData.impact}
                  onChange={(e) => handleInputChange('impact', e.target.value)}
                  placeholder="How would this benefit users? What's the impact?"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    colorMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-sm font-medium ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`text-sm px-3 py-1 rounded-lg ${
                    showPreview 
                      ? colorMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      : colorMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
            
            {showPreview ? (
              <div 
                className={`p-4 rounded-xl border ${
                  colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-300'
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(formData.description) }}
              />
            ) : (
              <textarea
                id="feedback-description"
                name="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your feedback in detail... (Markdown supported)"
                rows={6}
                className={`w-full px-4 py-3 rounded-xl border ${
                  colorMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                required
              />
            )}
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${colorMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Attachments (Images/PDFs up to 10MB)
            </label>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-4 border-2 border-dashed rounded-xl transition-colors ${
                  colorMode 
                    ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <Upload className="h-6 w-6 mx-auto mb-2" />
                <span className={`text-sm ${colorMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Click to upload files
                </span>
              </button>
              
              {attachments.length > 0 && (
                <div className="space-y-3">
                  {attachments.map((att, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      colorMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {att.isImage ? (
                            <Image className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`text-sm font-medium ${colorMode ? 'text-white' : 'text-gray-900'}`}>
                            {att.name}
                          </span>
                          <span className={`text-xs ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ({(att.size / 1024 / 1024).toFixed(1)}MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {att.isImage && att.dataUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-gray-300 max-w-md">
                          <img 
                            src={att.dataUrl} 
                            alt={att.name}
                            className="w-full h-auto max-h-64 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className={`text-xs mt-2 ${colorMode ? 'text-gray-400' : 'text-gray-500'}`}>
                💡 Tip: You can paste images directly from your clipboard (e.g., Windows Snipping Tool)
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                colorMode 
                  ? 'bg-slate-700 text-white hover:bg-slate-600' 
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
              className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                isSubmitting || !formData.title.trim() || !formData.description.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
  );
};

export default FeedbackForm;

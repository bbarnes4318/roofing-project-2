import React, { useState } from 'react';
import { DocumentTextIcon, CheckCircleIcon, ClockIcon, SparklesIcon, ExclamationTriangleIcon, ClipboardDocumentCheckIcon } from '../common/Icons';

const EstimateComparisonTool = ({ onBack }) => {
  const [adjusterEstimate, setAdjusterEstimate] = useState(null);
  const [scopeSheet, setScopeSheet] = useState(null);
  const [contractorEstimate, setContractorEstimate] = useState(null);

  const [analysisResult, setAnalysisResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Analysis is ready if the two required documents are uploaded.
  const analysisReady = adjusterEstimate && scopeSheet;

  const handleAnalyze = async () => {
    if (!analysisReady) {
      setError("Please upload at least the Adjuster Estimate and Contractor Scope Sheet.");
      return;
    }
    setError("");
    setIsLoading(true);
    setAnalysisResult("");

    // --- Dynamic LLM Prompt Engineering ---
    // The prompt is now chosen based on whether the optional contractor estimate is provided.
    
    const threeDocPrompt = `
      You are an expert insurance restoration estimator, specializing in analyzing and comparing Xactimate estimates and contractor scope sheets. Your tone should be professional, objective, and collaborative.

      I have uploaded three documents for a water damage claim (Claim ID: HW-789-2025) for analysis. Please act as if you have read and understood them perfectly.

      1.  **Adjuster's Xactimate Estimate (PDF):**
          * **Assumed Content:** A preliminary estimate from the carrier including water extraction, 3 days of drying equipment, baseboard removal, and a 2-foot flood cut.
          * **Key Omissions:** Missing content manipulation, attached garage scope, flooring replacement, containment, and uses basic paint specs.

      2.  **Contractor's Scope Sheet (DOCX):**
          * **Assumed Content:** A detailed on-site scope noting heavy content manipulation (piano, sectional), non-salvageable premium laminate flooring, water damage in the attached garage, the need for dust containment, and a premium two-coat paint system.

      3.  **Contractor's Xactimate Estimate (PDF):**
          * **Assumed Content:** This estimate includes everything from the adjuster's estimate PLUS line items for: R&R Premium Laminate Flooring, Heavy Content Manipulation, Containment Barrier, Seal & Paint Walls (two coats), and scope for the attached garage.

      **YOUR TASK:**
      Generate a professional report that the contractor can send to the insurance adjuster. The report must clearly and respectfully outline the discrepancies between the adjuster's and contractor's estimates, using the scope sheet as justification for the necessary additions.

      **REPORT FORMAT:**
      * Start with a title: "Supplement Request & Justification Report".
      * Use Markdown for formatting.
      * Create a "Summary of Proposed Adjustments" section.
      * Create a "Detailed Line Item Justification" section. For each item, provide: **Item**, **Justification** (citing scope sheet findings), and **Recommendation**.
      * End with a professional closing statement.
    `;

    const twoDocPrompt = `
      You are an expert insurance restoration estimator, tasked with helping a contractor build an accurate estimate. Your tone should be professional, objective, and advisory.

      I have uploaded two documents for a water damage claim (Claim ID: HW-789-2025) for a preliminary analysis. Please act as if you have read and understood them perfectly.

      1.  **Adjuster's Xactimate Estimate (PDF):**
          * **Assumed Content:** A preliminary estimate from the carrier including water extraction, 3 days of drying equipment, baseboard removal, and a 2-foot flood cut.
          * **Key Omissions:** Missing content manipulation, attached garage scope, flooring replacement, containment, and uses basic paint specs.

      2.  **Contractor's Scope Sheet (DOCX):**
          * **Assumed Content:** A detailed on-site scope noting heavy content manipulation (piano, sectional), non-salvageable premium laminate flooring, water damage in the attached garage, the need for dust containment, and a premium two-coat paint system.

      **YOUR TASK:**
      Generate a "Pre-Estimate Advisory Report". This report will serve as a guide for the contractor to build their own comprehensive Xactimate estimate by comparing the adjuster's initial findings with the more detailed on-site scope.

      **REPORT FORMAT:**
      * Start with a title: "Pre-Estimate Advisory Report".
      * Use Markdown for formatting.
      * Create a "Recommended Additions to Estimate" section.
      * For each recommended addition, provide: **Item** (e.g., "Content Manipulation - Heavy"), **Justification** (citing scope sheet findings), and an **Estimating Note** (a tip for listing it in Xactimate).
      * Add a "General Recommendations" section for other potential considerations (e.g., checking local codes, project monitoring).
      * End with a professional closing statement.
    `;

    const prompt = contractorEstimate ? threeDocPrompt : twoDocPrompt;
    
    try {
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; // Use environment variable
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            setAnalysisResult(text);
        } else {
            console.error("Unexpected API response structure:", result);
            throw new Error("Failed to parse the analysis from the API response.");
        }

    } catch (err) {
      console.error("Error during analysis:", err);
      setError(`An error occurred during analysis. Please try again. Details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSystem = () => {
      setAdjusterEstimate(null);
      setScopeSheet(null);
      setContractorEstimate(null);
      setAnalysisResult("");
      setError("");
      setIsLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Upload & Control Area */}
      <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-200 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <FileUploadCard 
            title="Adjuster Estimate" 
            file={adjusterEstimate} 
            setFile={setAdjusterEstimate}
            icon={<DocumentTextIcon className="w-10 h-10 text-blue-600" />}
            color="blue"
            required={true}
          />
          <FileUploadCard 
            title="Contractor Scope Sheet" 
            file={scopeSheet} 
            setFile={setScopeSheet}
            icon={<DocumentTextIcon className="w-10 h-10 text-green-600" />}
            color="green"
            required={true}
          />
          <FileUploadCard 
            title="Contractor Estimate" 
            file={contractorEstimate} 
            setFile={setContractorEstimate}
            icon={<DocumentTextIcon className="w-10 h-10 text-purple-600" />}
            color="purple"
            required={false}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 border-t border-gray-200">
          <button
            onClick={handleAnalyze}
            disabled={!analysisReady || isLoading}
            style={{
              background: 'linear-gradient(90deg, #2563eb, #1d4ed8, #1e40af)',
              color: 'white',
              padding: '16px 40px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(90deg, #1d4ed8, #1e40af, #1e3a8a)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(90deg, #2563eb, #1d4ed8, #1e40af)';
              e.target.style.transform = 'scale(1)';
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <ClockIcon className="w-6 h-6 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="w-6 h-6" />
                Run Analysis
              </>
            )}
          </button>
          <button
            onClick={resetSystem}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 text-lg font-semibold text-gray-700 bg-gray-100 rounded-xl shadow-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-10 bg-red-50 border border-red-200 text-red-700 px-8 py-6 rounded-xl flex items-center gap-4 shadow-lg">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0"/>
          <span className="font-medium text-lg">{error}</span>
        </div>
      )}

      {/* Results Display */}
      {analysisResult && <AnalysisResult reportText={analysisResult} />}
    </div>
  );
};

// File Upload Card Component
const FileUploadCard = ({ title, file, setFile, icon, color, required }) => {
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all duration-300 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg">
      {file ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-gray-900 text-lg">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={handleRemoveFile}
            className="text-red-600 hover:text-red-800 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-center">
            {icon}
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-gray-900 text-lg">
              {title} {!required && <span className="text-xs text-gray-400 font-normal">(Optional)</span>}
            </p>
            <p className="text-sm text-gray-500">Upload PDF or DOCX file</p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-2 mt-6 border border-blue-400 text-sm font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-500 transition-all duration-200">
              Choose File
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

// Analysis Result Component
const AnalysisResult = ({ reportText }) => {
  const [copySuccess, setCopySuccess] = useState('');

  const handleCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = reportText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
        setCopySuccess('Failed to copy');
    }
    document.body.removeChild(textarea);
  };

  const formatReport = (text) => {
    return text
        .split('\n')
        .map((line, index) => {
            if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-semibold text-blue-600 mt-6 mb-2">{line.substring(4)}</h3>;
            if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b border-gray-200 pb-2">{line.substring(3)}</h2>;
            if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-bold text-gray-900 text-center mb-4">{line.substring(2)}</h1>;
            if (line.startsWith('* ')) return <li key={index} className="ml-6 list-disc list-outside text-gray-700">{line.substring(2)}</li>;
            if (line.trim() === '') return <br key={index} />;
            return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
        })
        .reduce((acc, el, index) => {
            // Group list items
            if (el.type === 'li') {
                if (acc.length > 0 && acc[acc.length - 1].type === 'ul') {
                    acc[acc.length - 1].props.children.push(el);
                } else {
                    acc.push(<ul key={`ul-${index}`} className="mb-4">{[el]}</ul>);
                }
            } else {
                acc.push(el);
            }
            return acc;
        }, []);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 relative">
      <div className="p-8 sm:p-12">
        <div className="prose max-w-none prose-lg">
          {formatReport(reportText)}
        </div>
      </div>
      <div className="absolute top-6 right-6">
        <button
          onClick={handleCopy}
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {copySuccess ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> : <ClipboardDocumentCheckIcon className="w-5 h-5" />}
          {copySuccess || 'Copy Report'}
        </button>
      </div>
    </div>
  );
};

export default EstimateComparisonTool; 
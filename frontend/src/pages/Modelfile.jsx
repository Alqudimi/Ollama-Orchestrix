import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode,
  CheckCircle,
  AlertCircle,
  Eye,
  Wand2,
  Copy,
  Download,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Textarea } from '../components/common';
import { modelfileService } from '../services/api';
import { useToast } from '../components/common/Toast';

const Modelfile = () => {
  const [content, setContent] = useState(`FROM llama2

# Set the temperature
PARAMETER temperature 0.7

# Set the system prompt
SYSTEM You are a helpful AI assistant. You provide clear, concise, and accurate responses.

# Optional: Add example messages
MESSAGE user Hello!
MESSAGE assistant Hi! How can I help you today?`);
  const [validation, setValidation] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleValidate = async () => {
    setLoading(true);
    try {
      const response = await modelfileService.validate(content);
      setValidation(response.data);
      setPreview(null);
      if (response.data.valid) {
        toast.success('Modelfile is valid');
      } else {
        toast.error('Modelfile has errors');
      }
    } catch (error) {
      toast.error('Failed to validate modelfile');
    } finally {
      setLoading(false);
    }
  };

  const handleFormat = async () => {
    setLoading(true);
    try {
      const response = await modelfileService.format(content);
      setContent(response.data.formatted);
      toast.success('Modelfile formatted');
    } catch (error) {
      toast.error('Failed to format modelfile');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const response = await modelfileService.preview(content);
      setPreview(response.data);
      setValidation(null);
      toast.success('Preview generated');
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Modelfile';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Download started');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Modelfile Editor</h1>
          <p className="text-dark-400 mt-1">Create and validate Modelfiles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Copy} onClick={handleCopy}>
            Copy
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleDownload}>
            Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={FileCode}>Editor</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={Wand2} onClick={handleFormat} loading={loading}>
                Format
              </Button>
              <Button variant="secondary" size="sm" icon={CheckCircle} onClick={handleValidate} loading={loading}>
                Validate
              </Button>
              <Button size="sm" icon={Eye} onClick={handlePreview} loading={loading}>
                Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 px-4 py-3 bg-dark-800/50 border border-dark-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 text-dark-100 font-mono text-sm resize-none scrollbar-thin"
              placeholder="Enter your Modelfile content here..."
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {validation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle icon={validation.valid ? CheckCircle : AlertCircle}>
                    Validation Result
                  </CardTitle>
                  <Badge variant={validation.valid ? 'success' : 'danger'}>
                    {validation.valid ? 'Valid' : 'Invalid'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {validation.errors?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-red-400 mb-2">Errors</h4>
                      <ul className="space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index} className="text-sm text-dark-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.warnings?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h4>
                      <ul className="space-y-1">
                        {validation.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-dark-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.parsed && (
                    <div>
                      <h4 className="text-sm font-medium text-dark-300 mb-2">Parsed Structure</h4>
                      <div className="p-3 rounded-lg bg-dark-800/50 text-xs font-mono text-dark-300 overflow-x-auto">
                        <pre>{JSON.stringify(validation.parsed, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {preview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle icon={Eye}>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                      <h4 className="text-sm font-medium text-dark-300 mb-2">Base Model</h4>
                      <Badge variant="primary" size="lg">{preview.base_model || 'Unknown'}</Badge>
                    </div>

                    {preview.will_create && (
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                        <h4 className="text-sm font-medium text-dark-300 mb-3">Features</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(preview.will_create).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              {value ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-dark-500" />
                              )}
                              <span className="text-sm text-dark-300 capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {preview.parameters && Object.keys(preview.parameters).length > 0 && (
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                        <h4 className="text-sm font-medium text-dark-300 mb-3">Parameters</h4>
                        <div className="space-y-2">
                          {Object.entries(preview.parameters).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-dark-400">{key}</span>
                              <span className="text-dark-200">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {preview.estimated_behavior?.length > 0 && (
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                        <h4 className="text-sm font-medium text-dark-300 mb-3">Expected Behavior</h4>
                        <ul className="space-y-1">
                          {preview.estimated_behavior.map((behavior, index) => (
                            <li key={index} className="text-sm text-dark-300 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                              {behavior}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!validation && !preview && (
            <Card>
              <CardContent>
                <div className="text-center py-8">
                  <FileCode className="w-16 h-16 mx-auto text-dark-600 mb-4" />
                  <h3 className="text-lg font-medium text-dark-300 mb-2">No Results Yet</h3>
                  <p className="text-dark-400">
                    Click Validate or Preview to see results
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modelfile;

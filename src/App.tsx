import { useState } from 'react';
import { Camera, BookOpen, History, Plus, Trash2, Download, ChevronRight, Loader2, RefreshCw, Save, CheckCircle2, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recognizeQuestion, generateSimilarQuestions, OCRResult, SimilarQuestion } from './services/geminiService';
import { useRecords } from './hooks/useRecords';
import { SavedRecord } from './types';
import { cn, formatDate } from './lib/utils';
import { generatePDF } from './lib/pdfExport';

type Page = 'recognition' | 'book';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('recognition');
  const { records, addRecord, deleteRecord } = useRecords();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setIsProcessing(true);
      setOcrResult(null);
      setSimilarQuestions([]);
      
      try {
        const result = await recognizeQuestion(base64);
        setOcrResult(result);
      } catch (error) {
        console.error("OCR failed", error);
        alert("识别失败，请重试");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSimilar = async () => {
    if (!ocrResult) return;
    setIsGeneratingSimilar(true);
    try {
      const questions = await generateSimilarQuestions(
        ocrResult.content,
        ocrResult.knowledgePoint,
        ocrResult.subject
      );
      setSimilarQuestions(questions);
    } catch (error) {
      console.error("Generation failed", error);
      alert("生成失败，请重试");
    } finally {
      setIsGeneratingSimilar(false);
    }
  };

  const handleSave = () => {
    if (!ocrResult || similarQuestions.length === 0) return;
    
    const newRecord: SavedRecord = {
      id: `rec-${Date.now()}`,
      timestamp: Date.now(),
      originalImage: selectedImage || undefined,
      ocrResult,
      similarQuestions
    };
    
    addRecord(newRecord);
    alert("已保存到错题本");
    // Reset state for next one
    setSelectedImage(null);
    setOcrResult(null);
    setSimilarQuestions([]);
  };

  const toggleRecordSelection = (id: string) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRecords(newSelection);
  };

  const handleExportPDF = async () => {
    if (selectedRecords.size === 0) {
      alert("请先选择要打印的错题");
      return;
    }
    
    setIsExporting(true);
    try {
      const recordsToExport = records.filter(r => selectedRecords.has(r.id));
      await generatePDF(recordsToExport);
    } catch (error) {
      console.error("Export failed", error);
      alert("导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            错题举一反三打印机
          </h1>
          {currentPage === 'book' && records.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting || selectedRecords.size === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              打印所选 ({selectedRecords.size})
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-4">
          <AnimatePresence mode="wait">
            {currentPage === 'recognition' ? (
              <motion.div
                key="recognition"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Upload Area */}
                {!selectedImage ? (
                  <label className="block w-full aspect-video border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-700">点击或拍照上传错题</p>
                        <p className="text-sm text-slate-500">支持 JPG, PNG 格式</p>
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                      <img src={selectedImage} alt="Uploaded" className="w-full h-auto max-h-64 object-contain bg-slate-100" />
                      <button 
                        onClick={() => { setSelectedImage(null); setOcrResult(null); setSimilarQuestions([]); }}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* OCR Result */}
                    {isProcessing ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-slate-600 font-medium">正在智能识别题目...</p>
                      </div>
                    ) : ocrResult ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase">
                            {ocrResult.subject}
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                            知识点: <span className="text-slate-900">{ocrResult.knowledgePoint}</span>
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-bold text-slate-800">识别内容:</h3>
                          <div className="p-4 bg-slate-50 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
                            {ocrResult.content}
                          </div>
                          {ocrResult.options && ocrResult.options.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-2">
                              {ocrResult.options.map((opt, i) => (
                                <div key={i} className="p-3 border border-slate-100 rounded-lg text-sm bg-white">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <p className="text-xs text-orange-600 font-bold mb-1">原答案</p>
                            <p className="text-sm font-medium">{ocrResult.originalAnswer || '未识别'}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs text-green-600 font-bold mb-1">标准答案</p>
                            <p className="text-sm font-medium">{ocrResult.standardAnswer || '未识别'}</p>
                          </div>
                        </div>

                        {similarQuestions.length === 0 && (
                          <button
                            onClick={handleGenerateSimilar}
                            disabled={isGeneratingSimilar}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                          >
                            {isGeneratingSimilar ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            生成举一反三题目
                          </button>
                        )}
                      </motion.div>
                    ) : null}

                    {/* Similar Questions */}
                    {isGeneratingSimilar && similarQuestions.length === 0 && (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                        <p className="text-slate-600 font-medium">正在基于知识点生成变式题...</p>
                      </div>
                    )}

                    {similarQuestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            举一反三练习题
                          </h3>
                          <button 
                            onClick={handleGenerateSimilar}
                            disabled={isGeneratingSimilar}
                            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                          >
                            <RefreshCw className={cn("w-3 h-3", isGeneratingSimilar && "animate-spin")} />
                            换一批
                          </button>
                        </div>

                        {similarQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 bg-slate-800 text-white text-xs flex items-center justify-center rounded-full font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-500">相似变式</span>
                            </div>
                            <div className="text-slate-700 leading-relaxed">
                              {q.content}
                            </div>
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                              <div className="flex gap-2">
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">答案</span>
                                <p className="text-sm text-slate-600">{q.answer}</p>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">解析</span>
                                <p className="text-sm text-slate-600">{q.explanation}</p>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">易错点</span>
                                <p className="text-sm text-red-700 font-medium italic">{q.commonMistakes}</p>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handleSave}
                          className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
                        >
                          <Save className="w-5 h-5" />
                          保存到错题库
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="book"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <History className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">暂无错题记录</p>
                    <button 
                      onClick={() => setCurrentPage('recognition')}
                      className="mt-4 text-blue-600 font-bold hover:underline"
                    >
                      去添加第一道错题
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-sm text-slate-500 font-medium">
                        共 {records.length} 条记录
                      </p>
                      <button 
                        onClick={() => {
                          if (selectedRecords.size === records.length) {
                            setSelectedRecords(new Set());
                          } else {
                            setSelectedRecords(new Set(records.map(r => r.id)));
                          }
                        }}
                        className="text-sm text-blue-600 font-medium"
                      >
                        {selectedRecords.size === records.length ? '取消全选' : '全选'}
                      </button>
                    </div>
                    {records.map((record) => (
                      <div 
                        key={record.id}
                        className={cn(
                          "bg-white p-4 rounded-2xl border transition-all cursor-pointer group",
                          selectedRecords.has(record.id) ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
                        )}
                        onClick={() => toggleRecordSelection(record.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-colors",
                            selectedRecords.has(record.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                          )}>
                            {selectedRecords.has(record.id) && <Plus className="w-4 h-4 text-white rotate-45" style={{ transform: 'rotate(0deg)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                                {record.ocrResult.subject}
                              </span>
                              <span className="text-xs text-slate-400">{formatDate(record.timestamp)}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 truncate mb-1">
                              {record.ocrResult.knowledgePoint}
                            </h4>
                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                              {record.ocrResult.content}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <FileText className="w-3 h-3" />
                                3道变式题
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('确定要删除这条记录吗？')) {
                                    deleteRecord(record.id);
                                  }
                                }}
                                className="ml-auto opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 pb-8 z-20">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setCurrentPage('recognition')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'recognition' ? "text-blue-600" : "text-slate-400"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              currentPage === 'recognition' ? "bg-blue-50" : "bg-transparent"
            )}>
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold">错题识别</span>
          </button>
          
          <button 
            onClick={() => setCurrentPage('book')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'book' ? "text-blue-600" : "text-slate-400"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              currentPage === 'book' ? "bg-blue-50" : "bg-transparent"
            )}>
              <History className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold">错题本</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

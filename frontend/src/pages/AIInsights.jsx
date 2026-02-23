import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Sparkles, Loader2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const AIInsights = () => {
  const { totals, settings } = useFinance();
  const { toast } = useToast();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const threadRef = useRef(null);

  const currency = settings?.currency || 'LKR';
  const isLoading = suggestionsLoading || askLoading;

  // Auto-scroll to bottom when messages change or when loading starts
  useEffect(() => {
    if (threadRef.current) {
      const scrollToBottom = () => {
        threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
      };
      // Scroll immediately
      scrollToBottom();
      // Also scroll after a short delay to catch async updates
      const timeout = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages, askLoading, suggestionsLoading]);

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const data = await api.ai.getSuggestions();
      const text = data.suggestions || '';
      setMessages((prev) => [...prev, { type: 'suggestion', content: text }]);
      // Scroll after suggestions are added
      setTimeout(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast({
        title: 'Could not get suggestions',
        description: err?.message || 'Check your AI API key in the server.',
        variant: 'destructive',
      });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isLoading) return;
    setAskLoading(true);
    setQuestion('');
    // Scroll to bottom immediately when question is submitted
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
    try {
      const data = await api.ai.ask(q);
      const ans = data.answer || '';
      setMessages((prev) => [...prev, { type: 'qa', question: q, answer: ans }]);
      // Scroll again after answer is added
      setTimeout(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast({
        title: 'Could not get answer',
        description: err?.message || 'Check your AI API key in the server.',
        variant: 'destructive',
      });
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>AI Insights - MyAccounts</title>
        <meta name="description" content="AI-powered financial analysis, suggestions, and Q&A from your data" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Get next-move suggestions and ask anything about your money. All answers use only your data.
          </p>
        </div>

        {/* Combined: Suggestions + Ask — only the chat area scrolls; input bar stays fixed at bottom */}
        <div className="bg-card rounded-xl border border-secondary overflow-hidden flex flex-col min-h-[320px] sm:min-h-[400px] md:min-h-[480px] max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-11rem)] md:max-h-[calc(100vh-12rem)] h-[calc(100vh-10rem)] sm:h-[calc(100vh-11rem)] md:h-[calc(100vh-12rem)]">
          <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-secondary">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <Button onClick={fetchSuggestions} disabled={isLoading} size="lg" className="w-full sm:w-auto min-h-[44px]">
                {suggestionsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get AI suggestions
                  </>
                )}
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground">
                or ask a question below
              </span>
            </div>
          </div>

          <div
            ref={threadRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-5"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">Click &quot;Get AI suggestions&quot; for next moves, or type a question.</p>
                <p className="text-base mt-1">Answers are based only on your financial data.</p>
              </div>
            )}
            {messages.map((msg, i) =>
              msg.type === 'suggestion' ? (
                <div key={i} className="rounded-xl bg-primary/5 border border-primary/20 p-4 sm:p-6">
                  <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wide mb-2 sm:mb-3">Suggestions</p>
                  <p className="text-sm sm:text-base leading-6 sm:leading-7 whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              ) : (
                <div key={i} className="rounded-xl bg-secondary/30 border border-secondary p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <p className="text-sm sm:text-base font-medium text-foreground break-words">Q: {msg.question}</p>
                  <p className="text-sm sm:text-base text-muted-foreground leading-6 sm:leading-7 whitespace-pre-wrap break-words">A: {msg.answer}</p>
                </div>
              )
            )}
            {askLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-base">Thinking...</span>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-secondary bg-background/30 pb-[env(safe-area-inset-bottom)]">
            <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input
                placeholder="Ask about profit, purchases, expenses, or how to..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 min-w-0 min-h-[44px] sm:min-h-[48px] text-base px-4"
                disabled={askLoading}
              />
              <Button type="submit" disabled={askLoading || !question.trim()} size="lg" className="min-h-[44px] sm:min-h-[48px] px-6 w-full sm:w-auto shrink-0">
                {askLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ask'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIInsights;

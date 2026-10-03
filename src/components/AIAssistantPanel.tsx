import React, { useRef, useState } from 'react';
import {
  askAssistant,
  assistantErrorMessage,
  type AssistantResponse,
} from '../lib/assistant';

const SUGGESTED_QUESTIONS = [
  'Show my recent CO2 emissions.',
  'Is my plant currently compliant?',
  'What is the applicable CO2 threshold for my industry?',
  'Are there any unusual emission readings?',
];

const STATUS_LABELS: Record<AssistantResponse['status'], string> = {
  SUCCESS: 'RESULT READY',
  NO_DATA: 'NO MATCHING DATA',
  NO_APPLICABLE_THRESHOLD: 'NO APPLICABLE THRESHOLD',
  INVALID_THRESHOLD: 'THRESHOLD NEEDS REVIEW',
  UNIT_MISMATCH: 'UNIT MISMATCH',
  UNSUPPORTED: 'NOT SUPPORTED',
};

export default function AIAssistantPanel() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submitQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setLoading(true);
    setError('');
    setResponse(null);
    try {
      setResponse(await askAssistant(trimmedQuestion));
    } catch (requestError) {
      setError(assistantErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const clearAssistant = () => {
    setQuestion('');
    setResponse(null);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="assistant-title"
      className="sketch-panel a2"
      style={{ padding: '20px', marginBottom: 18 }}
    >
      <div className="stitle" id="assistant-title">AI Assistant</div>
      <p
        style={{
          color: 'var(--ink4)',
          fontFamily: 'Special Elite',
          fontSize: 11,
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        Ask about your emissions, compliance, thresholds, or unusual readings.
      </p>

      <form onSubmit={submitQuestion}>
        <label className="lbl" htmlFor="assistant-question">YOUR QUESTION</label>
        <textarea
          ref={inputRef}
          id="assistant-question"
          className="inp"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Is my plant currently exceeding the CO2 limit?"
          rows={3}
          maxLength={2000}
          required
          disabled={loading}
          aria-describedby="assistant-question-hint"
          style={{ minHeight: 78, resize: 'vertical', lineHeight: 1.5 }}
        />
        <div
          id="assistant-question-hint"
          style={{ color: 'var(--ink4)', fontFamily: 'Special Elite', fontSize: 9, marginTop: 4 }}
        >
          Answers are based on data your account is allowed to access.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !question.trim()}
            aria-disabled={loading || !question.trim()}
          >
            {loading ? 'ASKING…' : 'ASK AI'}
          </button>
          <button
            className="btn"
            type="button"
            onClick={clearAssistant}
            disabled={loading || (!question && !response && !error)}
          >
            CLEAR
          </button>
        </div>
      </form>

      {!response && !error && !loading && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: 'var(--ink4)', fontFamily: 'Special Elite', fontSize: 9, marginBottom: 8 }}>
            TRY A QUESTION
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="btn btn-xs"
                onClick={() => {
                  setQuestion(suggestion);
                  inputRef.current?.focus();
                }}
                style={{ height: 'auto', minHeight: 28, whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.4 }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div aria-live="polite" aria-busy={loading} style={{ marginTop: 14 }}>
        {loading && (
          <div role="status" style={messageStyle('var(--blue)', 'var(--bluex)')}>
            <span className="live-dot" aria-hidden="true" style={{ marginRight: 8 }} />
            Analyzing your emissions data...
          </div>
        )}
        {error && (
          <div role="alert" style={messageStyle('var(--red)', 'var(--redx)')}>
            {error}
          </div>
        )}
        {response && (
          <div style={messageStyle(statusColor(response.status), statusBackground(response.status))}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 10, fontWeight: 600, marginBottom: 7 }}>
              {STATUS_LABELS[response.status]}
            </div>
            <p style={{ color: 'var(--ink2)', fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.65 }}>
              {response.answer}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function messageStyle(borderColor: string, background: string): React.CSSProperties {
  return {
    border: `1px solid ${borderColor}`,
    background,
    color: borderColor,
    padding: '11px 12px',
    overflowWrap: 'anywhere',
  };
}

function statusColor(status: AssistantResponse['status']): string {
  return status === 'SUCCESS'
    ? 'var(--green)'
    : status === 'UNSUPPORTED' || status === 'NO_DATA'
      ? 'var(--blue)'
      : 'var(--amber)';
}

function statusBackground(status: AssistantResponse['status']): string {
  return status === 'SUCCESS'
    ? 'var(--greenx)'
    : status === 'UNSUPPORTED' || status === 'NO_DATA'
      ? 'var(--bluex)'
      : 'var(--amberx)';
}
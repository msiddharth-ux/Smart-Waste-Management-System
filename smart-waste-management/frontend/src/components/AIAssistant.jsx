import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { sendAIChat, getAIInsights } from '../utils/api';
import '../styles/AIAssistant.css';

// Lightweight Markdown Renderer for bold, bullet points, headers, inline code
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="ai-markdown">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Level 3 header
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx}>{trimmed.replace(/^###\s+/, '')}</h3>;
        }
        // Level 4 header
        if (trimmed.startsWith('#### ')) {
          return <h4 key={idx}>{trimmed.replace(/^####\s+/, '')}</h4>;
        }
        // Bullet list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <li key={idx}>
              <RenderInline text={itemText} />
            </li>
          );
        }
        // Numbered list item
        if (/^\d+\.\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^\d+\.\s+/, '');
          return (
            <div key={idx} style={{ margin: '4px 0 4px 14px' }}>
              <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{trimmed.match(/^\d+\./)[0]}</span>
              <RenderInline text={itemText} />
            </div>
          );
        }
        // Blank line
        if (!trimmed) {
          return <div key={idx} style={{ height: '6px' }} />;
        }
        // Standard paragraph
        return (
          <p key={idx}>
            <RenderInline text={line} />
          </p>
        );
      })}
    </div>
  );
}

FormattedMessage.propTypes = {
  text: PropTypes.string.isRequired,
  onNavigate: PropTypes.func
};

// Render inline bold, code, and italics
function RenderInline({ text }) {
  // Regex pattern matching **bold**, `code`, *italic*
  const parts = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: 'bold', index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1] } : null,
      codeMatch ? { type: 'code', index: codeMatch.index, length: codeMatch[0].length, content: codeMatch[1] } : null,
      italicMatch ? { type: 'italic', index: italicMatch.index, length: italicMatch[0].length, content: italicMatch[1] } : null
    ].filter(Boolean).sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      parts.push(<span key={keyCounter}>{remaining}</span>);
      break;
    }

    const first = matches[0];
    if (first.index > 0) {
      parts.push(<span key={keyCounter++}>{remaining.slice(0, first.index)}</span>);
    }

    if (first.type === 'bold') {
      parts.push(<strong key={keyCounter++}>{first.content}</strong>);
    } else if (first.type === 'code') {
      parts.push(<code key={keyCounter++}>{first.content}</code>);
    } else if (first.type === 'italic') {
      parts.push(<em key={keyCounter++}>{first.content}</em>);
    }

    remaining = remaining.slice(first.index + first.length);
  }

  return <>{parts}</>;
}

RenderInline.propTypes = {
  text: PropTypes.string.isRequired
};

export default function AIAssistant({ onNavigate, isFloating = false, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### 🌿 Welcome to EcoAI Assistant!\n\nI am your real-time operations co-pilot for the Intelligent Garbage Management network.\n\nI monitor **live IoT bin fill levels**, route bottlenecks, citizen grievances, and waste classification rules.\n\n*How can I assist your operations today?*`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: '🚨 Check Critical Bins', query: 'Which bins are full or need immediate collection?' },
        { label: '🚛 Optimal Collection Route', query: 'Plan an optimal collection route for today' },
        { label: '📊 System Health Check', query: 'Show operations health diagnosis' }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load telemetry insights on mount
  useEffect(() => {
    fetchQuickInsights();
    const interval = setInterval(fetchQuickInsights, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchQuickInsights = async () => {
    try {
      const res = await getAIInsights();
      setInsights(res.data);
    } catch (err) {
      console.warn('AI insights unavailable:', err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await sendAIChat(text, messages.slice(-4));
      const aiReply = res.data;

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: aiReply.reply,
        actions: aiReply.actions || [],
        systemSnapshot: aiReply.systemSnapshot,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Voice read out if enabled
      if (speechEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        // Strip markdown syntax for natural speech
        const plainText = aiReply.reply.replace(/[#*`_-]/g, '').slice(0, 240);
        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `### ⚠️ Connection Notice\n\nCould not reach the AI intelligence engine. The local fallback store reported normal operation. Please check your backend status at \`http://localhost:5000\`.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: [{ label: 'View Dashboard', tab: 'dashboard' }]
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handlePromptClick = (promptText) => {
    handleSendMessage(promptText);
  };

  const handleActionClick = (action) => {
    if (action.query) {
      handleSendMessage(action.query);
      return;
    }
    if (action.tab && onNavigate) {
      onNavigate(action.tab);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with city waste logistics?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: '🚨 Check Critical Bins', query: 'Which bins are full or need immediate collection?' },
          { label: '🚛 Optimal Collection Route', query: 'Plan an optimal collection route for today' }
        ]
      }
    ]);
  };

  const quickPills = [
    { label: '🚨 Critical Bins', query: 'Which bins are full or need immediate collection?' },
    { label: '🚛 Optimize Route', query: 'Plan an optimal collection route for today' },
    { label: '📊 System Health', query: 'Show operations health diagnosis' },
    { label: '♻️ Segregation Guide', query: 'How should I sort and dispose of hazardous waste and electronics?' },
    { label: '📋 Complaints Status', query: 'Summarize active citizen complaints' },
    { label: '📦 Status of Bin A', query: 'What is the current status of Bin A?' }
  ];

  // Core Chat Render
  const renderChatUI = () => (
    <>
      <div className="ai-chat-header">
        <div className="ai-header-lead">
          <div className="ai-bot-avatar" aria-hidden="true">🌱</div>
          <div className="ai-header-meta">
            <h3>EcoAI Co-Pilot</h3>
            <div className="ai-online-status">
              <span className="ai-pulse-dot" />
              <span>IoT Telemetry Synchronized</span>
            </div>
          </div>
        </div>
        <div className="ai-chat-actions">
          {'speechSynthesis' in window && (
            <button
              className={`ai-icon-btn ${speechEnabled ? 'active' : ''}`}
              title={speechEnabled ? 'Mute AI voice' : 'Enable voice read-out'}
              onClick={() => {
                if (speechEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                setSpeechEnabled(!speechEnabled);
              }}
            >
              {speechEnabled ? '🔊 Audio on' : '🔇 Audio off'}
            </button>
          )}
          <button className="ai-icon-btn" title="Clear chat" onClick={handleClearChat}>
            🗑️ Clear
          </button>
          {isFloating && (
            <>
              <button
                className="ai-icon-btn"
                title={isMaximized ? 'Restore size' : 'Expand window'}
                onClick={() => setIsMaximized(!isMaximized)}
              >
                {isMaximized ? '🗗' : '🗖'}
              </button>
              <button className="ai-icon-btn" title="Close assistant" onClick={onClose}>
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ai-messages-scroll">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-message-row ${msg.sender}`}>
            <div className={`ai-msg-avatar ${msg.sender}`}>
              {msg.sender === 'assistant' ? '🌱' : '👤'}
            </div>
            <div className="ai-message-bubble">
              <FormattedMessage text={msg.text} onNavigate={onNavigate} />

              {msg.actions && msg.actions.length > 0 && (
                <div className="ai-action-buttons">
                  {msg.actions.map((act, i) => (
                    <button
                      key={i}
                      className="ai-action-nav-btn"
                      onClick={() => handleActionClick(act)}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="ai-message-time">{msg.time}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-message-row assistant">
            <div className="ai-msg-avatar assistant">🌱</div>
            <div className="ai-message-bubble">
              <div className="ai-typing-indicator">
                <span className="ai-dot" />
                <span className="ai-dot" />
                <span className="ai-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-wrapper">
        <div className="ai-quick-suggestions-bar">
          {quickPills.map((p, idx) => (
            <button
              key={idx}
              className="ai-mini-suggestion"
              onClick={() => handlePromptClick(p.query)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="ai-text-input"
            placeholder="Ask anything (e.g., 'Which bins need pickup?', 'Plan route', 'Bin A status')..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="ai-send-btn" disabled={loading || !inputValue.trim()}>
            Send ➜
          </button>
        </form>
      </div>
    </>
  );

  // If floating popup widget
  if (isFloating) {
    return (
      <div className={`ai-floating-panel ${isMaximized ? 'maximized' : ''}`}>
        {renderChatUI()}
      </div>
    );
  }

  // Full-page AI Command Center mode
  return (
    <div className="ai-assistant-container">
      <div className="ai-sidebar">
        <div className="ai-card">
          <div className="ai-card-header">
            <span className="ai-card-title">📡 Operations Radar</span>
            <span className={`ai-badge ${insights?.level || 'normal'}`}>
              {insights?.level === 'critical' ? 'High Alert' : insights?.level === 'warning' ? 'Elevated' : 'Optimal'}
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {insights?.headline || 'Continuous monitoring active.'}
          </p>

          <div className="ai-metric-grid">
            <div className="ai-metric-box">
              <span className="ai-metric-label">Monitored Bins</span>
              <span className="ai-metric-value">{insights?.stats?.totalBins ?? '3'}</span>
            </div>
            <div className="ai-metric-box">
              <span className="ai-metric-label">Critical (≥80%)</span>
              <span className="ai-metric-value" style={{ color: (insights?.stats?.criticalBins || 0) > 0 ? '#bd4b3b' : '#18754f' }}>
                {insights?.stats?.criticalBins ?? '0'}
              </span>
            </div>
            <div className="ai-metric-box">
              <span className="ai-metric-label">Network Fill</span>
              <span className="ai-metric-value">{insights?.stats?.avgFill ?? '0'}%</span>
            </div>
            <div className="ai-metric-box">
              <span className="ai-metric-label">Pending Tickets</span>
              <span className="ai-metric-value">{insights?.stats?.pendingComplaints ?? '0'}</span>
            </div>
          </div>

          {insights?.recommendation && (
            <div className="ai-insight-banner">
              <strong>AI Recommendation:</strong><br />
              {insights.recommendation}
            </div>
          )}
        </div>

        <div className="ai-card">
          <div className="ai-card-header">
            <span className="ai-card-title">⚡ Quick Inquiries</span>
          </div>
          <div className="ai-quick-prompts">
            <button className="prompt-chip" onClick={() => handlePromptClick('Which bins are full or need immediate collection?')}>
              <span className="prompt-chip-icon">🚨</span>
              <span>Full Bins Immediate Alert</span>
            </button>
            <button className="prompt-chip" onClick={() => handlePromptClick('Plan an optimal collection route for today')}>
              <span className="prompt-chip-icon">🚛</span>
              <span>Dispatch Optimized Route</span>
            </button>
            <button className="prompt-chip" onClick={() => handlePromptClick('Show operations health diagnosis')}>
              <span className="prompt-chip-icon">📊</span>
              <span>Operations Health Diagnosis</span>
            </button>
            <button className="prompt-chip" onClick={() => handlePromptClick('Summarize active citizen complaints')}>
              <span className="prompt-chip-icon">📋</span>
              <span>Review Citizen Complaints</span>
            </button>
            <button className="prompt-chip" onClick={() => handlePromptClick('How should I sort and dispose of hazardous waste and electronics?')}>
              <span className="prompt-chip-icon">♻️</span>
              <span>Hazardous & E-Waste Guide</span>
            </button>
          </div>
        </div>
      </div>

      <div className="ai-chat-main">
        {renderChatUI()}
      </div>
    </div>
  );
}

AIAssistant.propTypes = {
  onNavigate: PropTypes.func,
  isFloating: PropTypes.bool,
  onClose: PropTypes.func
};

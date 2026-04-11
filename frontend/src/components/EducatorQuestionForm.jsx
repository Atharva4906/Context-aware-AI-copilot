import React, { useState } from 'react';
import axios from 'axios';

const CATEGORY_OPTIONS = ['Math', 'Physics', 'English', 'Coding'];

export default function EducatorQuestionForm() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [category, setCategory] = useState('Math');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const resetForm = () => {
    setCategory('Math');
    setContent('');
    setOptions(['', '', '', '']);
    setCorrectAnswerIndex(0);
  };

  const handleSubmit = async () => {
    const normalizedOptions = options.map((opt) => opt.trim()).filter(Boolean);
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      setStatus('Question content is required.');
      return;
    }
    if (normalizedOptions.length < 2) {
      setStatus('At least 2 options are required.');
      return;
    }
    if (correctAnswerIndex < 0 || correctAnswerIndex >= normalizedOptions.length) {
      setStatus('Select a valid correct answer index.');
      return;
    }

    const payload = {
      category,
      content: normalizedContent,
      options: normalizedOptions,
      correct_answer: normalizedOptions[correctAnswerIndex],
      correct_answer_index: correctAnswerIndex,
    };

    setIsSubmitting(true);
    setStatus('');
    try {
      await axios.post(`${apiUrl}/api/admin/questions`, payload);
      setStatus('Question created successfully.');
      resetForm();
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Failed to create question.';
      setStatus(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedOptions = options.map((opt) => opt.trim()).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <header className="mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">Add Questions</h2>
        <p className="text-neutral-400 text-sm">Create new question entries from the educator panel.</p>
      </header>

      <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5 space-y-5">
        <div>
          <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-purple-500/50"
          >
            {CATEGORY_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Question Content</label>
          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Enter question text"
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Options</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <input
                key={idx}
                value={opt}
                onChange={(event) => handleOptionChange(idx, event.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500/50"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider">Correct Answer</label>
          <select
            value={correctAnswerIndex}
            onChange={(event) => setCorrectAnswerIndex(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-purple-500/50"
          >
            {normalizedOptions.map((opt, idx) => (
              <option key={`${idx}-${opt}`} value={idx}>
                {idx + 1}. {opt}
              </option>
            ))}
            {normalizedOptions.length === 0 && <option value={0}>Add options first</option>}
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-xl bg-white text-black hover:bg-neutral-200 px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Create Question'}
        </button>

        {status && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-neutral-300">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

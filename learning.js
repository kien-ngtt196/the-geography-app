import { readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';

const books = new Map();
export function lessons(grade) {
  if (![8, 9].includes(grade)) fail(400, 'Hãy chọn lớp 8 hoặc lớp 9.');
  if (!books.has(grade)) books.set(grade, JSON.parse(readFileSync(new URL('./content/grade' + grade + '.json', import.meta.url))));
  return books.get(grade);
}
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function safeQuestion({ answer, acceptedAnswers, explanation, ...question }) { return question; }
export function selectQuestions(grade, lessonId, mode, guest, examPaper = 'general') {
  const catalog = lessons(grade);
  if (mode === 'exam' && examPaper !== 'general') {
    if (grade !== 9 || examPaper !== 'midterm1') fail(400, 'Đề giữa kì I trong tài liệu chỉ dành cho lớp 9.');
    return JSON.parse(readFileSync(new URL('./content/grade9-midterm1.json', import.meta.url)));
  }
  const lesson = lessonId ? catalog.find(item => item.id === lessonId) : null;
  if (lessonId && !lesson) fail(404, 'Không tìm thấy bài học.');
  const pool = (lesson ? [lesson] : catalog).flatMap(l => l.questions.map(q => ({ ...q, lessonId: l.id })));
  if (guest) {
    const first = catalog.flatMap(l => l.questions);
    return ['choice', 'boolean', 'short'].map(type => first.find(q => q.type === type && q.media) || first.find(q => q.type === type)).filter(Boolean);
  }
  if (mode === 'room') {
    const shuffled = shuffle(pool.filter(q => !q.reviewOnly && (q.type !== 'choice' || q.options?.length === 4)));
    const required = ['biết','hiểu','vận dụng'].flatMap(level => shuffled.filter(q => q.level === level).slice(0, 3));
    return shuffle(required.concat(shuffled.filter(q => !required.includes(q))).slice(0, 10));
  }
  if (mode === 'exam') {
    return ['choice','boolean','short'].flatMap((type, i) => {
      const candidates = pool.filter(q => !q.reviewOnly && q.type === type && (type !== 'boolean' || q.answer.length === 4));
      const count = [8,2,2][i];
      if (candidates.length < count) fail(409, 'Ngân hàng chưa đủ câu hỏi cho cấu trúc đề này.');
      return shuffle(candidates).slice(0,count);
    });
  }
  return shuffle(pool).slice(0, 10);
}
function normalized(value) {
  return String(value ?? '').normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
}
function normalizedShort(value) {
  const text = normalized(value)
    .replace(/−/g, '-')
    .replace(/\s*°\s*/g, '°')
    .replace(/\s*['’′]$/g, '′');
  if (/^-?\d{1,3}( \d{3})+([.,]\d+)?$/.test(text)) return text.replaceAll(' ', '').replace(',', '.');
  return /^-?\d+,\d+$/.test(text) ? text.replace(',', '.') : text;
}
export function fraction(q, value) {
  if (q.type === 'boolean') {
    if (!Array.isArray(value) || value.length !== q.answer.length) return 0;
    return q.answer.filter((a, i) => normalized(a) === normalized(value[i])).length / q.answer.length;
  }
  if (q.type === 'short' && Array.isArray(value) && q.numberFields?.length > 1) {
    if (value.length !== q.numberFields.length || !value.every(part=>typeof part === 'string' && /^\d+$/.test(part.trim()))) return 0;
    value = value.map((part,index)=>Number(part) + q.numberFields[index].unit).join('');
  }
  if (typeof value !== 'string' || !value.trim()) return 0;
  if (q.type === 'short') {
    const submitted = normalizedShort(value);
    return Number([q.answer, ...(q.acceptedAnswers || [])].some(value => {
      const expected = normalizedShort(value);
      const numeric = /^-?\d+(\.\d+)?$/;
      if (numeric.test(expected) && numeric.test(submitted)) return Number(expected) === Number(submitted);
      return expected === submitted;
    }));
  }
  return Number(normalized(q.answer) === normalized(value));
}
export function gradeAttempt(questions, answers, mode) {
  // Preserve the 4:2:1 objective section weights in the supplied paper.
  const weights = { choice:4, boolean:2, short:1 };
  const scored = questions.filter(q => !q.reviewOnly);
  const counts = Object.fromEntries(Object.keys(weights).map(type => [type, scored.filter(q => q.type === type).length]));
  const weightSum = Object.keys(weights).reduce((n,t) => n + (counts[t] ? weights[t] : 0), 0);
  let score = 0;
  const items = questions.map(q => {
    if (q.reviewOnly) return { id:q.id, correct:null, answer:q.answer, lessonId:q.lessonId };
    const part = fraction(q, answers[q.id]);
    score += part * (mode === 'exam' ? weights[q.type] / counts[q.type] / weightSum : 1 / scored.length);
    return { id:q.id, correct:part === 1, answer:q.answer, lessonId:q.lessonId, explanation:q.explanation || '' };
  });
  const result = { score: Math.round(score * 1000) / 100, total:10, items };
  if (mode === 'exam') result.objectiveScore = Math.round(score * 700) / 100;
  return result;
}

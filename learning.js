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
export function safeQuestion({ answer, explanation, ...question }) { return question; }
export function selectQuestions(grade, lessonId, mode, guest) {
  const catalog = lessons(grade);
  const lesson = lessonId ? catalog.find(item => item.id === lessonId) : null;
  if (lessonId && !lesson) fail(404, 'Không tìm thấy bài học.');
  const pool = (lesson ? [lesson] : catalog).flatMap(l => l.questions.map(q => ({ ...q, lessonId: l.id })));
  if (guest) {
    const first = catalog.flatMap(l => l.questions);
    return ['choice', 'boolean', 'short'].map(type => first.find(q => q.type === type && q.media) || first.find(q => q.type === type)).filter(Boolean);
  }
  if (mode === 'room') {
    const shuffled = shuffle(pool);
    const required = ['biết','hiểu','vận dụng'].flatMap(level => shuffled.filter(q => q.level === level).slice(0, 3));
    return shuffle(required.concat(shuffled.filter(q => !required.includes(q))).slice(0, 10));
  }
  if (mode === 'exam') {
    return ['choice','boolean','short'].flatMap((type, i) => shuffle(pool.filter(q => q.type === type)).slice(0, [8,2,2][i]));
  }
  return shuffle(pool).slice(0, 10);
}
function normalized(value) {
  return String(value ?? '').normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ').replace(/^(\-?\d+),(\d+)$/, '$1.$2');
}
export function fraction(q, value) {
  if (q.type === 'boolean') {
    if (!Array.isArray(value) || value.length !== q.answer.length) return 0;
    return q.answer.filter((a, i) => normalized(a) === normalized(value[i])).length / q.answer.length;
  }
  const answer = normalized(q.answer), submitted = normalized(value);
  if (!submitted || typeof value !== 'string') return 0;
  if (q.type === 'short' && /^-?\d+(\.\d+)?$/.test(answer) && /^-?\d+(\.\d+)?$/.test(submitted)) {
    return Number(answer) === Number(submitted) ? 1 : 0;
  }
  return Number(answer === submitted);
}
export function gradeAttempt(questions, answers, mode) {
  // Preserve the 4:2:1 objective section weights in the supplied paper.
  const weights = { choice:4, boolean:2, short:1 };
  const counts = Object.fromEntries(Object.keys(weights).map(type => [type, questions.filter(q => q.type === type).length]));
  const weightSum = Object.keys(weights).reduce((n,t) => n + (counts[t] ? weights[t] : 0), 0);
  let score = 0;
  const items = questions.map(q => {
    const part = fraction(q, answers[q.id]);
    score += part * (mode === 'exam' ? weights[q.type] / counts[q.type] / weightSum : 1 / questions.length);
    return { id:q.id, correct:part === 1, answer:q.answer, lessonId:q.lessonId, explanation:q.explanation || '' };
  });
  return { score: Math.round(score * 1000) / 100, total:10, items };
}

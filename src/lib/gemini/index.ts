import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export function getGeminiModel() {
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export async function explainAnswer(
  question: string,
  correctAnswer: string,
  studentAnswer?: string
): Promise<string> {
  const model = getGeminiModel()

  const prompt = studentAnswer
    ? `You are a helpful exam tutor for Ghanaian students.
    
Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${studentAnswer}

The student got this wrong. In 2-3 sentences, explain why the correct answer is right and where the student's thinking went wrong. Be encouraging and clear.`
    : `You are a helpful exam tutor for Ghanaian students.

Question: ${question}
Answer: ${correctAnswer}

Explain why this is the correct answer in 2-3 clear sentences suitable for a secondary school student.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateHint(question: string): Promise<string> {
  const model = getGeminiModel()

  const prompt = `You are a helpful exam tutor for Ghanaian students.

Question: ${question}

Give a helpful hint that guides the student toward the answer without giving it away. Keep it to 1-2 sentences.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

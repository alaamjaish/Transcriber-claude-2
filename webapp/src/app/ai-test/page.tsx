import { loadStudents } from '@/lib/data-loaders';
import { AITestClient } from './components/AITestClient';

export default async function AITestPage() {
  const students = await loadStudents();

  return <AITestClient students={students} />;
}

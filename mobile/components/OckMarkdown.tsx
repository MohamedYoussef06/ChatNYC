import Markdown from 'react-native-markdown-display';
import { C } from '@/constants/theme';

const styles = {
  body: { color: C.ink, fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: { color: C.ink, fontSize: 20, lineHeight: 25, fontWeight: '800' as const, marginTop: 8, marginBottom: 6 },
  heading2: { color: C.ink, fontSize: 18, lineHeight: 23, fontWeight: '800' as const, marginTop: 8, marginBottom: 6 },
  heading3: { color: C.ink, fontSize: 16, lineHeight: 21, fontWeight: '800' as const, marginTop: 7, marginBottom: 5 },
  strong: { fontWeight: '800' as const },
  em: { fontStyle: 'italic' as const },
  link: { color: C.blue, textDecorationLine: 'underline' as const },
  blockquote: { backgroundColor: C.soft, borderLeftColor: C.blue, borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 5, marginVertical: 7 },
  code_inline: { backgroundColor: C.soft, borderColor: C.line, borderWidth: 1, borderRadius: 4, fontFamily: 'monospace', fontSize: 13, paddingHorizontal: 3 },
  fence: { color: '#f5f5f5', backgroundColor: '#202428', borderColor: '#202428', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, padding: 10, marginVertical: 7 },
  code_block: { color: '#f5f5f5', backgroundColor: '#202428', borderColor: '#202428', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, padding: 10, marginVertical: 7 },
  table: { borderColor: C.line, borderWidth: 1, borderRadius: 4 },
  th: { backgroundColor: C.soft, padding: 5 },
  td: { borderColor: C.line, borderWidth: 1, padding: 5 },
};

export function OckMarkdown({ children }: { children: string }) {
  return <Markdown style={styles}>{children}</Markdown>;
}

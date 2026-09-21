// Isolated markdown renderer so the (heavy) markdown pipeline can be
// code-split away from the initial page load. Rendered lazily by the oracle
// chat transcript.
import ReactMarkdown from "react-markdown";

const DISALLOWED = ["script", "iframe", "object", "embed", "style", "form", "input"];
const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

interface Props {
  content: string;
}

const MarkdownMessage = ({ content }: Props) => (
  <ReactMarkdown
    skipHtml
    disallowedElements={DISALLOWED}
    urlTransform={(url) => (SAFE_URL.test(url) ? url : "")}
  >
    {content}
  </ReactMarkdown>
);

export default MarkdownMessage;

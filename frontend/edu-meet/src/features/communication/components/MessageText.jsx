const HTTP_URL = /(^|[\s([{<"'])(https?:\/\/[^\s<>"']+)/gi;

function trimTrailingPunctuation(url) {
  const openers = { ")": "(", "]": "[", "}": "{" };
  let end = url;
  while (end) {
    const last = end.at(-1);
    const opener = openers[last];
    if (!/[.,!?;:]/.test(last) &&
      !(opener && end.split(last).length > end.split(opener).length)) break;
    end = end.slice(0, -1);
  }
  return end;
}

export default function MessageText({ text }) {
  if (!text) return null;

  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(HTTP_URL)) {
    const start = match.index + match[1].length;
    const label = trimTrailingPunctuation(match[2]);
    let url;
    try {
      url = new URL(label);
    } catch {
      continue;
    }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) continue;

    parts.push(text.slice(offset, start));
    parts.push(
      <a key={start} href={url.href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>,
    );
    offset = start + label.length;
  }
  parts.push(text.slice(offset));

  return <p className="communication-message-text">{parts}</p>;
}

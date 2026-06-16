/**
 * Minimal multipart/form-data parser for file upload.
 * Returns an array of { name, filename, value, data } parts.
 */

export function extractBoundary(req) {
  const ct = req.headers['content-type'] || '';
  const m = ct.match(/boundary=([^;\s]+)/);
  return m ? m[1].replace(/^"|"$/g, '') : null;
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function parseMultipart(data, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = data.indexOf(sep);

  while (start !== -1) {
    const end = data.indexOf(sep, start + sep.length);
    if (end === -1) break;

    // slice between separators, strip leading \r\n and trailing \r\n--
    const part = data.slice(start + sep.length + 2, end - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = end; continue; }

    const headers = part.slice(0, headerEnd).toString('utf-8');
    const body = part.slice(headerEnd + 4);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);

    parts.push({
      name: nameMatch?.[1] ?? '',
      filename: filenameMatch?.[1] ?? '',
      value: body.toString('utf-8').replace(/\r\n$/, ''),
      data: body,
    });
    start = end;
  }
  return parts;
}

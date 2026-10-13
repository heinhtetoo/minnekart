import { JsonLdValue, jsonLdDocument } from '@/lib/seo/schema';

interface JsonLdProps {
  data: JsonLdValue | JsonLdValue[];
}

// Every value here comes from our own constants, but this is the one place in
// the app injecting raw markup, so it escapes anyway: a literal `</script>`
// inside any string would close the tag early and drop the rest of the JSON
// into the document as HTML. Escaping `<` makes that impossible regardless of
// what a future caller passes in.
function serialise(data: JsonLdValue | JsonLdValue[]): string {
  return JSON.stringify(jsonLdDocument(data)).replace(/</g, '\\u003c');
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}

export function Preview({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

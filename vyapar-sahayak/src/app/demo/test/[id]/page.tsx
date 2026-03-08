export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>Test page works! ID: {id}</div>;
}

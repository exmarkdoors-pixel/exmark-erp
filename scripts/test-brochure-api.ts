import { GET } from '../app/api/catalog/brochure/[code]/route';

async function testBrochure() {
  console.log('Testing GET /api/catalog/brochure/EXM-A-101...');
  const req = new Request('http://localhost:4000/api/catalog/brochure/EXM-A-101');
  const params = Promise.resolve({ code: 'EXM-A-101' });
  const res = await GET(req as any, { params });
  console.log('Status:', res.status);
  console.log('Content-Type:', res.headers.get('content-type'));
  const blob = await res.blob();
  console.log('PDF Blob Size:', blob.size, 'bytes');
  if (res.status === 200 && blob.size > 1000) {
    console.log('✓ Brochure generation test passed successfully!');
  } else {
    throw new Error('Brochure generation failed or produced invalid size');
  }
}

testBrochure().catch(console.error);

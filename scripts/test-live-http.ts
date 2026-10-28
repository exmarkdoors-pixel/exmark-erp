async function testLiveServer() {
  console.log('Testing Live Next.js Server at http://localhost:3000/api/measurements...');
  
  // 1. Initial GET
  const res1 = await fetch('http://localhost:3000/api/measurements');
  if (!res1.ok) throw new Error(`GET failed with status ${res1.status}`);
  const json1 = await res1.json();
  console.log('1. GET Response:', {
    success: json1.success,
    count: json1.count,
    hasDataArray: Array.isArray(json1.data),
    hasMeasurementsArray: Array.isArray(json1.measurements),
    recordsCount: json1.data?.length,
  });

  if (!Array.isArray(json1.data)) {
    throw new Error('json.data is NOT an array!');
  }

  // 2. POST New Record
  const newRef = `MSR-2026-LIVE-${Date.now().toString().slice(-4)}`;
  const postPayload = {
    refNumber: newRef,
    customerName: 'Kallai Riverfront Builders',
    orderRef: 'EXM-LIVE-999',
    siteName: 'Live HTTP Persistence Test Suite',
    siteAddress: 'Palakkad Industrial Area, Kerala',
    district: 'Palakkad',
    engineerName: 'Anoop Krishnan',
    date: '2026-10-28',
    status: 'VERIFIED',
    doors: [
      {
        doorNumber: 'D1 - Front',
        model: 'FRP Molded Teak (32mm) - 100% Waterproof',
        frameType: 'WPC Solid Extruded 100x65mm Frame',
        colour: 'Burma Teak',
        hingeSide: 'Left Hand (LH)',
        lockType: 'Mortise Lock 60mm Backset with Brass Handles',
        measurementUnit: 'MM',
        heightLeft: 2120,
        heightRight: 2120,
        widthTop: 920,
        widthBottom: 920,
      },
    ],
  };

  const postRes = await fetch('http://localhost:3000/api/measurements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload),
  });

  if (!postRes.ok) throw new Error(`POST failed with status ${postRes.status}`);
  const postJson = await postRes.json();
  console.log('2. POST Response:', {
    success: postJson.success,
    hasData: Boolean(postJson.data),
    hasMeasurement: Boolean(postJson.measurement),
    id: postJson.data?.id,
    refNumber: postJson.data?.refNumber,
  });

  // 3. Browser Refresh Simulation (GET again immediately)
  console.log('3. Simulating Browser Refresh (F5) by fetching GET /api/measurements...');
  const res2 = await fetch('http://localhost:3000/api/measurements');
  const json2 = await res2.json();

  const foundRecord = json2.data?.find((r: { refNumber: string }) => r.refNumber === newRef);
  if (!foundRecord) {
    throw new Error(`CRITICAL FAILURE: Record ${newRef} NOT FOUND after refresh!`);
  }

  console.log('✓ SUCCESS: Saved record was retrieved successfully after simulated F5 refresh:');
  console.log({
    id: foundRecord.id,
    refNumber: foundRecord.refNumber,
    siteName: foundRecord.siteName,
    doorsCount: foundRecord.doors?.length,
    status: foundRecord.status,
  });
}

testLiveServer().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

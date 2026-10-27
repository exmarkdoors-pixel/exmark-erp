import {
  listDispatches,
  createDispatch,
  updateDispatchStatus,
  listInstallations,
  createInstallation,
  completeInstallationSignoff,
  generateWarrantyCertificate,
  listWarranties,
} from '../lib/services/fulfillmentService';

async function runPhase7Tests() {
  console.log('--- RUNNING PHASE 7: FULFILLMENT, LOGISTICS & WARRANTY TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(desc: string, cond: boolean) {
    if (cond) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. List dispatches
    const initialDispatches = await listDispatches();
    assert('Initial dispatches loaded successfully', Array.isArray(initialDispatches));

    // 2. Create dispatch
    const createdDispatch = await createDispatch({
      salesOrderId: 'SO-TEST-701',
      customerName: 'Kochi Luxury Apartments',
      destinationAddress: 'Marine Drive, Ernakulam',
      deliveryDistrict: 'Ernakulam',
      vehicleNumber: 'KL-07-CD-9988',
      driverName: 'Unnikrishnan',
      driverPhone: '9447111222',
      eWayBillNo: '321998877665',
      doorCount: 20,
    });
    assert('Dispatch record created with valid ID', Boolean(createdDispatch.id));
    assert('Dispatch number generated correctly', createdDispatch.dispatchNumber.startsWith('DSP-2026-'));
    assert('Initial dispatch status is SCHEDULED', createdDispatch.status === 'SCHEDULED');
    assert('Door count is 20', createdDispatch.doorCount === 20);

    // 3. Update dispatch status
    const transitDispatch = await updateDispatchStatus(createdDispatch.id, 'IN_TRANSIT');
    assert('Dispatch status transitioned to IN_TRANSIT', transitDispatch.status === 'IN_TRANSIT');

    const deliveredDispatch = await updateDispatchStatus(createdDispatch.id, 'DELIVERED');
    assert('Dispatch status transitioned to DELIVERED', deliveredDispatch.status === 'DELIVERED');

    // 4. List installations
    const initialInstallations = await listInstallations();
    assert('Initial installations loaded successfully', Array.isArray(initialInstallations));

    // 5. Create installation
    const createdInst = await createInstallation({
      salesOrderId: 'SO-TEST-701',
      dispatchId: createdDispatch.id,
      customerName: 'Kochi Luxury Apartments',
      siteAddress: 'Marine Drive, Ernakulam',
      district: 'Ernakulam',
      supervisorName: 'Praveen K',
      scheduledDate: '2026-10-29',
      doorCount: 20,
    });
    assert('Installation created with valid ID', Boolean(createdInst.id));
    assert('Installation number format INS-2026-XXX', createdInst.installationNumber.startsWith('INS-2026-'));
    assert('Initial installation status is PENDING', createdInst.status === 'PENDING');

    // 6. Complete installation signoff
    const signedInst = await completeInstallationSignoff({
      id: createdInst.id,
      clientSignoffName: 'Architect Antony George',
      feedbackRating: 5,
      remarks: 'Perfect 4-point fit, flawless FRP finish, zero water gaps.',
    });
    assert('Installation status updated to QUALITY_APPROVED', signedInst.status === 'QUALITY_APPROVED');
    assert('Client signoff recorded', signedInst.clientSignoffName === 'Architect Antony George');
    assert('5-star rating recorded', signedInst.clientFeedbackRating === 5);
    assert('Completed date recorded', Boolean(signedInst.completedDate));

    // 7. Issue Warranty Certificate
    const warranty = await generateWarrantyCertificate({
      salesOrderId: 'SO-TEST-701',
      customerName: 'Kochi Luxury Apartments',
      siteAddress: 'Marine Drive, Ernakulam',
      district: 'Ernakulam',
      warrantyPeriodYears: 15,
      coveredDoors: [
        { doorId: 'EXM-DR-2026-701', model: 'EXM-FRP-TL101', sizeMm: '2085 x 888 mm' },
      ],
    });
    assert('Warranty certificate issued with valid number', warranty.certificateNumber.startsWith('EXM-WRN-2026-'));
    assert('Warranty period is 15 years', warranty.warrantyPeriodYears === 15);

    // 8. Strict Scope Guarantee: FRP DOOR MATERIAL ONLY
    assert(
      'Coverage scope explicitly restricted to FRP DOOR MATERIAL ONLY',
      warranty.coverageScope.includes('FRP DOOR MATERIAL ONLY')
    );

    // 9. Mandatory Exclusions
    const exclusions = warranty.explicitExclusions.join(' ');
    assert('Exclusions explicitly mention Hinges', exclusions.includes('Hinges'));
    assert('Exclusions explicitly mention Handles', exclusions.includes('Handles'));
    assert('Exclusions explicitly mention Lock Hardware', exclusions.includes('Lock Hardware'));

    // 10. Bilingual care instructions
    assert('English care instructions present', warranty.bilingualCareInstructions.english.length >= 2);
    assert('Malayalam care instructions present', warranty.bilingualCareInstructions.malayalam.length >= 2);

    // 11. List warranties check
    const allWarranties = await listWarranties();
    assert('Warranties list contains newly issued certificate', allWarranties.some((w) => w.certificateNumber === warranty.certificateNumber));

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log(`\nPHASE 7 SUMMARY: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runPhase7Tests();

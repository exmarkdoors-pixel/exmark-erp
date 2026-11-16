/**
 * EXMARK ERP — Driver & Vehicle Management Test Suite
 * Tests CRUD operations for Drivers and Vehicles, validation safeguards,
 * in-use dispatch protections, and mobile staff PIN synchronization.
 */

import {
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getFleetSummary,
  formatRegistrationNumber,
} from '../lib/services/fleetService';
import { createDispatch, updateDispatchStatus } from '../lib/services/fulfillmentService';
import { verifyFactoryUserCredentials, ensureUsersStore } from '../lib/auth/userStore';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   EXMARK ERP — DRIVER & VEHICLE TEST SUITE           ');
  console.log('======================================================\n');

  try {
    // ── 1. Initial Fleet & Seed Verification ─────────────────────────
    console.log('▸ 1. Verifying Initial Fleet & Seed Data...');
    const initialDrivers = await listDrivers();
    assert(initialDrivers.length >= 3, `Initial drivers count >= 3 (Found: ${initialDrivers.length})`);
    
    const ratheesh = initialDrivers.find((d) => d.employeeCode === 'DRV-01');
    assert(Boolean(ratheesh), 'Seed Driver DRV-01 (Ratheesh Driver) exists');
    assert(ratheesh?.assignedVehicleNumber === 'KL-09-AW-8210', 'Ratheesh is assigned KL-09-AW-8210');

    const initialVehicles = await listVehicles();
    assert(initialVehicles.length >= 3, `Initial vehicles count >= 3 (Found: ${initialVehicles.length})`);

    const tataTruck = initialVehicles.find((v) => v.registrationNumber === 'KL-09-AW-8210');
    assert(Boolean(tataTruck), 'Seed Vehicle KL-09-AW-8210 exists');
    assert(tataTruck?.doorCapacity === 25, 'Tata 407 has 25 door units capacity');
    assert(tataTruck?.assignedDriverName === 'Ratheesh Driver', 'Assigned driver matches Ratheesh Driver');

    const summary = await getFleetSummary();
    assert(summary.totalDoorCapacity >= 57, `Total simultaneous door haul capacity >= 57 (Current: ${summary.totalDoorCapacity})`);

    // ── 2. Add New Driver ────────────────────────────────────────────
    console.log('\n▸ 2. Testing Driver Creation & Mobile PIN Sync...');
    const testDriverPhone = '+91 94479 00111';
    const newDriver = await createDriver({
      name: 'Biju Kumar',
      phone: testDriverPhone,
      employeeCode: 'DRV-99',
      drivingLicenseNo: 'KL-09-2022-0099112',
      defaultPin: '4321',
      bloodGroup: 'B+',
      notes: 'Test regional driver',
    });

    assert(Boolean(newDriver.id), `Created new driver with ID: ${newDriver.id}`);
    assert(newDriver.name === 'Biju Kumar', 'Driver name saved correctly');
    assert(newDriver.defaultPin === '4321', 'Driver mobile PIN saved as 4321');

    // Verify user store auto-sync
    const users = await ensureUsersStore();
    const syncedUser = users.find((u) => u.employeeCode === 'DRV-99');
    assert(Boolean(syncedUser), 'Driver auto-synced into users-store.json as a system user');
    assert(syncedUser?.role === 'Driver', 'User role assigned as "Driver"');

    // Test Mobile PIN authentication
    const verified = await verifyFactoryUserCredentials('DRV-99', '4321', 'PIN');
    assert(Boolean(verified), 'Driver DRV-99 successfully authenticates with PIN 4321');

    const wrongPinVerified = await verifyFactoryUserCredentials('DRV-99', '0000', 'PIN');
    assert(!wrongPinVerified, 'Driver DRV-99 rejects invalid PIN 0000');

    // ── 3. Duplicate Driver Validation ───────────────────────────────
    console.log('\n▸ 3. Testing Duplicate Driver Validations...');
    let dupCodeFailed = false;
    try {
      await createDriver({
        name: 'Another Driver',
        phone: '+91 94479 00222',
        employeeCode: 'DRV-99',
        drivingLicenseNo: 'KL-09-2022-9999999',
        defaultPin: '1234',
      });
    } catch {
      dupCodeFailed = true;
    }
    assert(dupCodeFailed, 'Duplicate employee code "DRV-99" rejected');

    let dupPhoneFailed = false;
    try {
      await createDriver({
        name: 'Another Driver 2',
        phone: testDriverPhone,
        employeeCode: 'DRV-98',
        drivingLicenseNo: 'KL-09-2022-8888888',
        defaultPin: '1234',
      });
    } catch {
      dupPhoneFailed = true;
    }
    assert(dupPhoneFailed, 'Duplicate driver phone rejected');

    // ── 4. Edit Driver ───────────────────────────────────────────────
    console.log('\n▸ 4. Testing Driver Update & PIN Change...');
    const updatedDriver = await updateDriver(newDriver.id, {
      name: 'Biju K. Nair',
      phone: '+91 94479 00333',
      defaultPin: '8899',
      assignedVehicleNumber: 'KL-09-AW-8210',
    });

    assert(updatedDriver.name === 'Biju K. Nair', 'Driver name updated to "Biju K. Nair"');
    assert(updatedDriver.defaultPin === '8899', 'Driver PIN updated to 8899');
    assert(updatedDriver.assignedVehicleNumber === 'KL-09-AW-8210', 'Driver assigned vehicle updated');

    // Test authentication with new PIN
    const newPinVerified = await verifyFactoryUserCredentials('DRV-99', '8899', 'PIN');
    assert(Boolean(newPinVerified), 'Driver DRV-99 successfully authenticates with NEW PIN 8899');

    // ── 5. Add & Edit Vehicle ────────────────────────────────────────
    console.log('\n▸ 5. Testing Vehicle Creation & Updates...');
    const testReg = 'KL-10-AZ-7788';
    const newVehicle = await createVehicle({
      registrationNumber: testReg,
      model: 'Ashok Leyland Ecomet 1215',
      doorCapacity: 40,
      fuelType: 'DIESEL',
      assignedDriverId: newDriver.id,
      fitnessExpiryDate: '2028-05-15',
      insuranceExpiryDate: '2028-06-20',
    });

    assert(Boolean(newVehicle.id), `Created new vehicle with ID: ${newVehicle.id}`);
    assert(newVehicle.registrationNumber === 'KL-10-AZ-7788', 'Vehicle registration standardized');
    assert(newVehicle.doorCapacity === 40, 'Vehicle door capacity saved as 40');
    assert(newVehicle.assignedDriverName === 'Biju K. Nair', 'Vehicle assigned driver cached as Biju K. Nair');

    // Test duplicate vehicle registration rejection
    let dupVehFailed = false;
    try {
      await createVehicle({
        registrationNumber: 'kl 10 az 7788', // lowercase with spaces
        model: 'Duplicate Vehicle',
        doorCapacity: 10,
      });
    } catch {
      dupVehFailed = true;
    }
    assert(dupVehFailed, 'Duplicate vehicle registration rejected');

    // Edit vehicle
    const updatedVehicle = await updateVehicle(newVehicle.id, {
      doorCapacity: 45,
      model: 'Ashok Leyland Ecomet 1215 HD',
    });
    assert(updatedVehicle.doorCapacity === 45, 'Vehicle capacity updated to 45');
    assert(updatedVehicle.model === 'Ashok Leyland Ecomet 1215 HD', 'Vehicle model updated');

    // ── 6. In-Use Dispatch Safety Safeguard ───────────────────────────
    console.log('\n▸ 6. Testing In-Use Trip Deletion Protection...');
    const testDispatch = await createDispatch({
      customerName: 'Test Customer Villa',
      destinationAddress: 'Kozhikode Beach Road',
      deliveryDistrict: 'Kozhikode',
      vehicleNumber: testReg,
      driverName: 'Biju K. Nair',
      driverPhone: '+91 94479 00333',
      doorCount: 15,
    });

    assert(Boolean(testDispatch.id), `Scheduled active dispatch: ${testDispatch.dispatchNumber}`);

    // Try deleting driver while on active dispatch
    let driverDeleteBlocked = false;
    try {
      await deleteDriver(newDriver.id);
    } catch (err: any) {
      if (err.message.includes('active trip')) {
        driverDeleteBlocked = true;
      }
    }
    assert(driverDeleteBlocked, 'Deletion BLOCKED for driver assigned to active trip');

    // Try deleting vehicle while on active dispatch
    let vehicleDeleteBlocked = false;
    try {
      await deleteVehicle(newVehicle.id);
    } catch (err: any) {
      if (err.message.includes('active trip')) {
        vehicleDeleteBlocked = true;
      }
    }
    assert(vehicleDeleteBlocked, 'Deletion BLOCKED for vehicle assigned to active trip');

    // Complete the dispatch
    await updateDispatchStatus(testDispatch.id, 'DELIVERED');
    console.log('  Trip status updated to DELIVERED.');

    // ── 7. Safe Deletion When Inactive ────────────────────────────────
    console.log('\n▸ 7. Testing Clean Deletion After Trip Handover...');
    const driverDeleted = await deleteDriver(newDriver.id);
    assert(driverDeleted, 'Driver successfully deleted after trip completed');

    const driverAfterDelete = await getDriverById(newDriver.id);
    assert(driverAfterDelete === null, 'Driver no longer exists in fleet store');

    // Verify deleted driver cannot authenticate on mobile
    const deletedUserAuth = await verifyFactoryUserCredentials('DRV-99', '8899', 'PIN');
    assert(!deletedUserAuth, 'Deleted driver successfully barred from mobile PIN authentication');

    const vehicleDeleted = await deleteVehicle(newVehicle.id);
    assert(vehicleDeleted, 'Vehicle successfully deleted');

    const vehicleAfterDelete = await getVehicleById(newVehicle.id);
    assert(vehicleAfterDelete === null, 'Vehicle no longer exists in fleet store');

    // ── Summary ──────────────────────────────────────────────────────
    console.log('\n======================================================');
    console.log(`  TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    if (failCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL DRIVER & VEHICLE MANAGEMENT TESTS PASSED!\n');
    }
  } catch (err) {
    console.error('Test execution crashed:', err);
    process.exit(1);
  }
}

runTests();

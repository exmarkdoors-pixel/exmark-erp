import { createCustomer, updateCustomer, listCustomers } from '../lib/services/customerService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function run() {
  console.log('--- Testing Customer Uniqueness (Mobile & Name) ---');

  const existing = await listCustomers();
  console.log(`Current existing customers: ${existing.length}`);
  assert(existing.length > 0, 'Existing customers store is not empty');

  const sample = existing[0];
  console.log(`Sample existing customer: ${sample.name} (${sample.phone})`);

  // 1. Try to create duplicate with SAME phone number
  let phoneBlocked = false;
  try {
    await createCustomer({
      name: 'NEW DIFFERENT NAME',
      phone: sample.phone, // identical phone
      district: 'Malappuram',
      town: 'Vengara',
      type: 'BUILDER',
      creditLimit: 0,
      outstandingBalance: 0,
      status: 'ACTIVE',
    });
  } catch (err: any) {
    phoneBlocked = true;
    console.log(`Caught expected phone error: ${err.message}`);
    assert(err.message.includes('already exists'), 'Error mentions already exists for mobile');
  }
  assert(phoneBlocked, 'Creation of duplicate customer with same phone was blocked!');

  // 2. Try to create duplicate with formatted version of SAME phone (e.g. "+91 94479 28866" vs "9447928866")
  let formattedPhoneBlocked = false;
  try {
    await createCustomer({
      name: 'ANOTHER DIFFERENT NAME',
      phone: `+91 ${sample.phone.slice(0, 5)} ${sample.phone.slice(5)}`,
      district: 'Malappuram',
      town: 'Vengara',
      type: 'BUILDER',
      creditLimit: 0,
      outstandingBalance: 0,
      status: 'ACTIVE',
    });
  } catch (err: any) {
    formattedPhoneBlocked = true;
    console.log(`Caught expected formatted phone error: ${err.message}`);
    assert(err.message.includes('already exists'), 'Error mentions already exists for formatted mobile');
  }
  assert(formattedPhoneBlocked, 'Creation of duplicate customer with formatted phone was blocked!');

  // 3. Try to create duplicate with SAME name (case-insensitive)
  let nameBlocked = false;
  try {
    await createCustomer({
      name: `  ${sample.name.toLowerCase()}  `, // same name different casing/spaces
      phone: '9111222333', // different phone
      district: 'Malappuram',
      town: 'Vengara',
      type: 'BUILDER',
      creditLimit: 0,
      outstandingBalance: 0,
      status: 'ACTIVE',
    });
  } catch (err: any) {
    nameBlocked = true;
    console.log(`Caught expected name error: ${err.message}`);
    assert(err.message.includes('already exists'), 'Error mentions already exists for name');
  }
  assert(nameBlocked, 'Creation of duplicate customer with same name was blocked!');

  console.log('🎉 ALL Customer Uniqueness Tests PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
